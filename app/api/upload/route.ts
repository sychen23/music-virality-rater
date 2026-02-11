import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join, resolve, sep } from "path";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { ensureProfile } from "@/lib/queries/profiles";
import { and, eq, gte } from "drizzle-orm";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_UPLOADS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4", "audio/m4a"];
const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"] as const;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: reject early before processing the file body
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await db.$count(
    uploads,
    and(
      eq(uploads.userId, session.user.id),
      gte(uploads.createdAt, windowStart),
    ),
  );

  if (recentCount >= MAX_UPLOADS_PER_HOUR) {
    return NextResponse.json(
      { error: "Upload limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Require both a recognized MIME type AND a valid file extension.
  // Rejecting on either mismatch prevents files like "malicious.exe"
  // with a spoofed audio/mpeg MIME type from being accepted.
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((e) => e === rawExt);

  if (!ALLOWED_TYPES.includes(file.type) || !ext) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filepath = resolve(uploadDir, filename);

  // Guard against path traversal: ensure resolved path is inside upload directory
  const resolvedDir = resolve(uploadDir) + sep;
  if (!filepath.startsWith(resolvedDir)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // Ensure profile exists before inserting (uploads.userId references profiles.id)
  await ensureProfile(session.user.id, session.user.name);

  // Record upload in DB so createTrack can verify ownership
  await db.insert(uploads).values({
    userId: session.user.id,
    filename,
    originalName: file.name,
    size: file.size,
  });

  return NextResponse.json({
    filename,
    url: `/uploads/${filename}`,
    size: file.size,
    originalName: file.name,
  });
}

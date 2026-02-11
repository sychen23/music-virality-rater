import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join, resolve, sep } from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4", "audio/m4a"];
const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"] as const;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Extract and validate extension against allowlist to prevent arbitrary file writes
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((e) => e === rawExt) ?? "mp3";

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

  return NextResponse.json({
    filename,
    url: `/uploads/${filename}`,
    size: file.size,
    originalName: file.name,
  });
}

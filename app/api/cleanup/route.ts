import { NextRequest, NextResponse } from "next/server";
import { cleanupOrphanedUploads } from "@/lib/actions/cleanup";

export async function POST(request: NextRequest) {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cleanup endpoint not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupOrphanedUploads();

  return NextResponse.json({ deleted });
}

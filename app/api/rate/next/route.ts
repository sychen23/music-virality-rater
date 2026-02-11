import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getNextTrackToRate } from "@/lib/queries/tracks";
import { getProfile, ensureProfile } from "@/lib/queries/profiles";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  await ensureProfile(userId, session.user.name);

  const track = await getNextTrackToRate(userId);
  if (!track) {
    return NextResponse.json({ error: "No tracks available" }, { status: 404 });
  }

  const profile = await getProfile(userId);

  return NextResponse.json({
    track: {
      id: track.id,
      title: track.title,
      audioFilename: track.audioFilename,
      contextId: track.contextId,
      snippetStart: track.snippetStart,
      snippetEnd: track.snippetEnd,
    },
    ratingProgress: profile?.ratingProgress ?? 0,
  });
}

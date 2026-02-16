import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { suggestSnippet } from "@/lib/services/snippet-suggest";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { waveformBars, duration } = body as {
    waveformBars?: unknown;
    duration?: unknown;
  };

  if (
    !Array.isArray(waveformBars) ||
    waveformBars.length === 0 ||
    !waveformBars.every((v) => typeof v === "number" && isFinite(v))
  ) {
    return NextResponse.json(
      { error: "waveformBars must be a non-empty array of numbers" },
      { status: 400 }
    );
  }

  if (typeof duration !== "number" || !isFinite(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "duration must be a positive number" },
      { status: 400 }
    );
  }

  try {
    const suggestion = await suggestSnippet(waveformBars, duration);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("[Snippet Suggest] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}

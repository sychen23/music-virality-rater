import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudUploadIcon,
  UserMultipleIcon,
  ChartLineData01Icon,
} from "@hugeicons/core-free-icons";
import { getTopTracks } from "@/lib/queries/tracks";
import { LeaderboardSection } from "@/components/leaderboard-section";

export default async function LandingPage() {
  let topTracks: Awaited<ReturnType<typeof getTopTracks>> = [];
  try {
    topTracks = await getTopTracks();
  } catch {
    // DB failure shouldn't take down the landing page — leaderboard is optional
  }
  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-8">
      {/* Logo */}
      <Logo className="text-2xl" />

      {/* Hero */}
      <section className="mt-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Will your track
          <br />
          <span className="text-primary">go viral?</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
          Real listeners rate your music.
          <br />
          Get scores. Know before you drop.
        </p>
      </section>

      {/* CTAs */}
      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        <Link href="/upload">
          <Button size="lg" className="w-full">
            Upload Your Track
          </Button>
        </Link>
        <Link href="/rate">
          <Button variant="outline" size="lg" className="w-full">
            Rate Music &amp; Earn Votes
          </Button>
        </Link>
      </div>

      {/* How It Works */}
      <section className="mt-8 w-full max-w-sm">
        <h2 className="mb-4 text-center text-sm font-bold uppercase tracking-wide">
          How It Works
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: CloudUploadIcon,
              title: "Upload\na snippet",
            },
            {
              icon: UserMultipleIcon,
              title: "Listeners\nrate it",
            },
            {
              icon: ChartLineData01Icon,
              title: "Get your\nscores",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-3 text-center"
            >
              <HugeiconsIcon
                icon={item.icon}
                size={28}
                className="text-primary"
                strokeWidth={1.5}
              />
              <span className="whitespace-pre-line text-xs font-medium leading-tight">
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Tracks Leaderboard */}
      <LeaderboardSection tracks={topTracks} />

      {/* Social Proof */}
      <section className="mt-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Trusted by 12,000+ artists
        </p>
        <div className="mt-1 flex items-center justify-center gap-0.5 text-yellow-500">
          {"★★★★★".split("").map((star, i) => (
            <span key={i} className="text-sm">
              {star}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-xs italic text-muted-foreground">
          &ldquo;Finally, honest feedback before I release&rdquo;
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Link href="/login">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Will your track
            <br />
            <span className="text-primary">go viral?</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Get real listener ratings on virality, stickiness, and
            hit-potential. Like Photofeeler, but for music.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/upload">
              <Button size="lg" className="w-full sm:w-auto">
                Upload Your Track
              </Button>
            </Link>
            <Link href="/rate">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Rate Music &amp; Earn Votes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-muted/50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload",
                description:
                  "Drop your track and select a 15-30 second snippet to test.",
              },
              {
                step: "2",
                title: "Listeners Rate",
                description:
                  "Real people rate your track on virality dimensions for your chosen context.",
              },
              {
                step: "3",
                title: "Get Scores",
                description:
                  "See your virality score, percentile ranking, and actionable insights.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-1 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-12 text-center">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-center gap-1 text-yellow-500">
            {"★★★★★".split("").map((star, i) => (
              <span key={i} className="text-lg">
                {star}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            TRUSTED BY 12,000+ ARTISTS
          </p>
        </div>
      </section>
    </div>
  );
}

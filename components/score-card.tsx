"use client";

import { formatPercentile } from "@/lib/utils";

interface ScoreCardProps {
  score: number;
  percentile: number | null;
  isComplete: boolean;
  votesReceived: number;
  preliminaryScore: number | null;
}

/* 20 person silhouettes — bodies extend to y=70 past viewBox(56) for seamless bottom edge */
const people = [
  { x: 4, hr: 7, hy: 20, bx1: 0, bx2: 22, by: 36, btop: 28 },
  { x: 26, hr: 8, hy: 16, bx1: 21, bx2: 47, by: 32, btop: 24 },
  { x: 52, hr: 6.5, hy: 21, bx1: 48, bx2: 69, by: 37, btop: 29 },
  { x: 74, hr: 8.5, hy: 15, bx1: 69, bx2: 96, by: 31, btop: 23 },
  { x: 100, hr: 7, hy: 19, bx1: 96, bx2: 118, by: 35, btop: 27 },
  { x: 124, hr: 8, hy: 16, bx1: 119, bx2: 145, by: 32, btop: 24 },
  { x: 150, hr: 6.5, hy: 21, bx1: 146, bx2: 167, by: 37, btop: 29 },
  { x: 172, hr: 8.5, hy: 15, bx1: 167, bx2: 194, by: 31, btop: 23 },
  { x: 198, hr: 7, hy: 19, bx1: 194, bx2: 216, by: 35, btop: 27 },
  { x: 222, hr: 8.5, hy: 15, bx1: 217, bx2: 244, by: 31, btop: 23 },
  { x: 248, hr: 7, hy: 20, bx1: 244, bx2: 266, by: 36, btop: 28 },
  { x: 272, hr: 8, hy: 16, bx1: 267, bx2: 293, by: 32, btop: 24 },
  { x: 298, hr: 6.5, hy: 21, bx1: 294, bx2: 315, by: 37, btop: 29 },
  { x: 320, hr: 8.5, hy: 15, bx1: 315, bx2: 342, by: 31, btop: 23 },
  { x: 346, hr: 7, hy: 19, bx1: 342, bx2: 364, by: 35, btop: 27 },
  { x: 370, hr: 8, hy: 16, bx1: 365, bx2: 391, by: 32, btop: 24 },
  { x: 396, hr: 7, hy: 20, bx1: 392, bx2: 414, by: 36, btop: 28 },
  { x: 420, hr: 8, hy: 16, bx1: 415, bx2: 441, by: 32, btop: 24 },
  { x: 446, hr: 7, hy: 19, bx1: 442, bx2: 464, by: 35, btop: 27 },
  { x: 468, hr: 7, hy: 16, bx1: 464, bx2: 486, by: 32, btop: 25 },
];

function personPath(p: (typeof people)[number]) {
  const midx = (p.bx1 + p.bx2) / 2;
  return `M${p.x},${p.hy} a${p.hr},${p.hr} 0 1,1 ${p.hr * 2},0 a${p.hr},${p.hr} 0 1,1 -${p.hr * 2},0 M${p.bx1},70 L${p.bx1},${p.by} Q${p.bx1},${p.btop} ${midx},${p.btop} Q${p.bx2},${p.btop} ${p.bx2},${p.by} L${p.bx2},70Z`;
}

const beams = [
  { left: "8%", delay: "0s", duration: "6s" },
  { left: "32%", delay: "-2s", duration: "5s" },
  { left: "56%", delay: "-4s", duration: "7s" },
  { left: "80%", delay: "-1s", duration: "5.5s" },
];

export function ScoreCard({
  score,
  percentile,
  isComplete,
  votesReceived,
  preliminaryScore,
}: ScoreCardProps) {
  const displayScore = isComplete
    ? Math.round((score / 3) * 100)
    : preliminaryScore !== null
      ? Math.round((preliminaryScore / 3) * 100)
      : null;

  if (displayScore === null) return null;

  const crowdOpacity = isComplete ? 0.35 : 0.2;

  return (
    <div
      className={
        isComplete
          ? "relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(160deg,oklch(0.3_0.15_293),oklch(0.45_0.22_310))] text-white"
          : "relative mb-6 overflow-hidden rounded-2xl border-2 border-dashed border-[oklch(0.5_0.15_293)] bg-[linear-gradient(160deg,oklch(0.25_0.1_293),oklch(0.35_0.15_310))] text-white"
      }
    >
      {/* Stage lights */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {beams.map((beam, i) => (
          <div key={i} style={{ position: "absolute", left: beam.left }}>
            <div
              className="animate-sweep"
              style={{
                position: "absolute",
                top: -10,
                width: 60,
                height: 200,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 65%)",
                clipPath: "polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)",
                transformOrigin: "top center",
                animationDelay: beam.delay,
                animationDuration: beam.duration,
              }}
            />
            <div
              className="absolute -top-0.5 h-[5px] w-[5px] rounded-full bg-white shadow-[0_0_8px_3px_rgba(255,255,255,0.5)]"
              style={{ left: 28 }}
            />
          </div>
        ))}
      </div>

      {/* Score content */}
      <div className="relative z-[2] px-6 pt-7 text-center">
        {isComplete ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Overall Virality Score
            </p>
            <p className="mt-1 text-[56px] font-black leading-none text-white [text-shadow:0_2px_20px_rgba(255,255,255,0.2)]">
              {displayScore}%
            </p>
            {percentile !== null ? (
              <p className="mt-2 text-sm text-white/50">
                {formatPercentile(percentile)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/50">
                Percentile ranking available after more tracks are tested
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Preliminary Score
            </div>
            <p className="mt-1 text-5xl font-black leading-none text-white/50">
              ~{displayScore}%
            </p>
            <p className="mt-2 text-xs italic text-white/40">
              Based on {votesReceived}{" "}
              {votesReceived === 1 ? "vote" : "votes"} — may shift
            </p>
          </>
        )}
      </div>

      {/* Swaying crowd */}
      <div className="relative z-[1] -mt-2 h-[70px]">
        <svg
          viewBox="0 0 490 56"
          preserveAspectRatio="xMidYMax meet"
          className="absolute bottom-0 block w-full"
          style={{ opacity: crowdOpacity }}
        >
          {people.map((p, i) => (
            <g
              key={i}
              className="animate-sway-wave"
              style={{
                animationDelay: `${((i * 0.15) % 3).toFixed(2)}s`,
                transformOrigin: "bottom center",
              }}
            >
              <path d={personPath(p)} fill="white" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

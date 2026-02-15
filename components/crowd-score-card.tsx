import type { Dimension } from "@/lib/constants/contexts";
import {
  CROWD_THEMES,
  CROWD_SILHOUETTES,
  LASER_POSITIONS,
} from "@/lib/constants/crowd-themes";

interface CrowdScoreCardProps {
  contextId?: string;
  score: number; // 0-3
  votesReceived: number;
  votesRequested: number;
  dimensions: Dimension[];
  dimensionAverages: number[]; // 0-3 scale
}

export function CrowdScoreCard({
  contextId,
  score,
  votesReceived,
  votesRequested,
  dimensions,
  dimensionAverages,
}: CrowdScoreCardProps) {
  const theme = CROWD_THEMES[contextId ?? "tiktok"] ?? CROWD_THEMES.tiktok;
  const pct = Math.round((score / 3) * 100);

  return (
    <>
      <style>{`
        @keyframes crowd-sway {
          0%, 100% { transform: translateX(0) rotate(0); }
          50% { transform: translateX(2px) rotate(2deg); }
        }
      `}</style>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        {/* Stage */}
        <div
          className="relative min-h-[180px] px-5 pt-5 text-center"
          style={{ background: theme.stageBg }}
        >
          {/* Lasers */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] overflow-hidden">
            {LASER_POSITIONS.map((pos, i) => (
              <div
                key={i}
                className="absolute top-0 h-[140px] w-0.5 opacity-15"
                style={{
                  left: pos.left,
                  transform: `rotate(${pos.rotate})`,
                  transformOrigin: "top center",
                }}
              >
                <div
                  className="absolute -left-5 -right-5 bottom-0 top-0"
                  style={{
                    background: `linear-gradient(180deg, ${theme.laserColors[i]}, transparent)`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Score */}
          <div
            className="relative text-[64px] font-black leading-none text-white"
            style={{ textShadow: theme.scoreGlow }}
          >
            {pct}%
          </div>
          <div
            className="relative mt-1 text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: theme.labelColor }}
          >
            Audience Score
          </div>

          {/* Crowd */}
          <div className="relative mt-5">
            <div className="flex h-11 items-end justify-center overflow-hidden">
              {CROWD_SILHOUETTES.map((person, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center"
                  style={{
                    animation: "crowd-sway 2s ease-in-out infinite",
                    animationDelay: person.delay ? `${person.delay}s` : "0s",
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: person.head,
                      height: person.head,
                      background: theme.crowdHead,
                    }}
                  />
                  <div
                    className="rounded-t"
                    style={{
                      width: person.width,
                      height: person.body,
                      background: theme.crowdBody,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Counter */}
        <div
          className="px-4 py-2.5 text-center text-xs"
          style={{
            color: theme.counterColor,
            borderTop: `1px solid ${theme.counterBorder}`,
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <strong className="text-[#fafafa]">{votesReceived}</strong> of{" "}
          <strong className="text-[#fafafa]">{votesRequested}</strong> in the
          crowd
        </div>

        {/* Dimensions Grid */}
        <div className="px-5 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {dimensions.map((dim, i) => {
              const dimPct = Math.round((dimensionAverages[i] / 3) * 100);
              const isHigh = dimPct >= 60;
              return (
                <div
                  key={dim.key}
                  className="flex items-center gap-2 rounded-[10px] p-2.5"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <span className="text-lg">{dim.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[10px]"
                      style={{ color: theme.dimNameColor }}
                    >
                      {dim.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div
                        className="h-1 flex-1 overflow-hidden rounded-sm"
                        style={{ background: theme.dimBarBg }}
                      >
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${dimPct}%`,
                            background: isHigh
                              ? theme.dimFillHigh
                              : theme.dimFillMid,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-[13px] font-bold text-white">
                    {dimPct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

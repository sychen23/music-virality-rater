import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  emoji: string;
  score: number; // 0-3
  maxScore?: number;
}

export function ScoreBar({ label, emoji, score, maxScore = 3 }: ScoreBarProps) {
  const pct = (score / maxScore) * 100;

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[130px] shrink-0">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <span>{emoji}</span>
          <span>{label}</span>
        </span>
      </div>
      <div className="h-7 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-chart-2" : "bg-chart-4"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "w-10 shrink-0 text-right text-sm font-extrabold",
          pct >= 70
            ? "text-primary"
            : pct >= 40
              ? "text-chart-2"
              : "text-chart-4"
        )}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

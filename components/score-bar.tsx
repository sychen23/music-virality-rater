import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  emoji: string;
  score: number; // 1-10
  maxScore?: number;
}

export function ScoreBar({ label, emoji, score, maxScore = 10 }: ScoreBarProps) {
  const pct = (score / maxScore) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <span>{emoji}</span>
          <span className="font-medium">{label}</span>
        </span>
        <span className="font-bold text-primary">{score.toFixed(1)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-chart-2" : "bg-chart-4"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

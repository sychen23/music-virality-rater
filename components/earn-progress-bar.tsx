import { Progress } from "@/components/ui/progress";

interface EarnProgressBarProps {
  ratingProgress: number; // 0-4
}

export function EarnProgressBar({ ratingProgress }: EarnProgressBarProps) {
  // Clamp to 0-4 defensively so the UI never shows negative remaining
  // or a progress bar > 100%, even if an out-of-range value arrives.
  const clamped = Math.max(0, Math.min(ratingProgress, 4));
  const remaining = 5 - clamped;
  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {clamped}/5 rated
        </span>
        <span className="font-medium text-primary">
          {remaining} more for +1 credit
        </span>
      </div>
      <Progress value={(clamped / 5) * 100} className="h-2" />
    </div>
  );
}

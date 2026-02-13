import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  description: string;
  variant?: "default" | "success" | "warning";
  /** Optional emoji icon displayed before the category label (AI insights) */
  emoji?: string;
  /** Optional uppercase category label, e.g. "TARGET AUDIENCE" (AI insights) */
  category?: string;
}

export function InsightCard({
  title,
  description,
  variant = "default",
  emoji,
  category,
}: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-4",
        variant === "success" && "border-l-green-500 bg-green-50 dark:bg-green-950/30",
        variant === "warning" && "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
        variant === "default" && "border-l-primary bg-primary/5"
      )}
    >
      {category && (
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {emoji && <span>{emoji}</span>}
          {category}
        </p>
      )}
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

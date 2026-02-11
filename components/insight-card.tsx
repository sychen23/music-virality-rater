import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  description: string;
  variant?: "default" | "success" | "warning";
}

export function InsightCard({
  title,
  description,
  variant = "default",
}: InsightCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-4",
        variant === "success" && "border-l-green-500 bg-green-50",
        variant === "warning" && "border-l-yellow-500 bg-yellow-50",
        variant === "default" && "border-l-primary bg-primary/5"
      )}
    >
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

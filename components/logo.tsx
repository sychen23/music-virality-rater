import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-bold tracking-tight", className)}>
      Sound<span className="text-primary">Check</span>
    </span>
  );
}

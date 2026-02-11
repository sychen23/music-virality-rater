"use client";

import { cn } from "@/lib/utils";
import type { Context } from "@/lib/constants/contexts";

interface ContextCardProps {
  context: Context;
  selected: boolean;
  onSelect: () => void;
}

export function ContextCard({ context, selected, onSelect }: ContextCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50"
      )}
    >
      <span className="text-2xl">{context.icon}</span>
      <span className="text-sm font-semibold">{context.name}</span>
      <span className="text-xs text-muted-foreground">
        {context.description}
      </span>
    </button>
  );
}

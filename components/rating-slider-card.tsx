"use client";

import { Slider } from "@/components/ui/slider";
import type { Dimension } from "@/lib/constants/contexts";

interface RatingSliderCardProps {
  dimension: Dimension;
  value: number;
  onChange: (value: number) => void;
}

export function RatingSliderCard({
  dimension,
  value,
  onChange,
}: RatingSliderCardProps) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">{dimension.emoji}</span>
        <span className="font-medium">{dimension.name}</span>
        <span className="ml-auto text-lg font-bold text-primary">{value}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {dimension.description}
      </p>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={10}
        step={1}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{dimension.lowLabel}</span>
        <span>{dimension.highLabel}</span>
      </div>
    </div>
  );
}

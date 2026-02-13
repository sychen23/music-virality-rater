"use client";

import { cn } from "@/lib/utils";
import type { Dimension } from "@/lib/constants/contexts";

const LEVELS = [
  { value: 3, label: "Very" },
  { value: 2, label: "Yes" },
  { value: 1, label: "Kinda" },
  { value: 0, label: "No" },
] as const;

interface RatingTrackColumnsProps {
  dimensions: Dimension[];
  values: (number | null)[];
  onChange: (values: (number | null)[]) => void;
}

export function RatingTrackColumns({
  dimensions,
  values,
  onChange,
}: RatingTrackColumnsProps) {
  const handleSelect = (dimIndex: number, level: number) => {
    const next = [...values];
    next[dimIndex] = level;
    onChange(next);
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {dimensions.map((dim, colIdx) => {
        const selected = values[colIdx];

        return (
          <div key={dim.key} className="flex flex-col items-center gap-1.5">
            {/* Header */}
            <span className="text-xl">{dim.emoji}</span>
            <span className="text-[11px] font-medium leading-tight text-center min-h-[2rem] flex items-center">
              {dim.name}
            </span>

            {/* Level buttons */}
            <div className="flex w-full flex-col gap-1">
              {LEVELS.map(({ value, label }) => {
                const isSelected = selected === value;
                const isFilled = selected !== null && value < selected;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSelect(colIdx, value)}
                    className={cn(
                      "h-9 w-full rounded-lg text-xs font-medium transition-all",
                      "border border-transparent",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isFilled
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

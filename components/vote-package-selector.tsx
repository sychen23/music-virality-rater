"use client";

import { cn } from "@/lib/utils";
import { VOTE_PACKAGES } from "@/lib/constants/packages";

interface VotePackageSelectorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
  userCredits: number;
}

export function VotePackageSelector({
  selectedIndex,
  onSelect,
  userCredits,
}: VotePackageSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {VOTE_PACKAGES.map((pkg, index) => {
        const isSelected = index === selectedIndex;
        const canAfford = userCredits >= pkg.credits;
        return (
          <button
            key={pkg.votes}
            type="button"
            onClick={() => canAfford && onSelect(index)}
            disabled={!canAfford}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all",
              isSelected
                ? "border-primary bg-primary/5"
                : canAfford
                  ? "border-border hover:border-primary/50"
                  : "cursor-not-allowed border-border opacity-50"
            )}
          >
            <span className="text-lg font-bold">{pkg.votes}</span>
            <span className="text-xs text-muted-foreground">votes</span>
            <span className="mt-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {pkg.credits} credits
            </span>
          </button>
        );
      })}
    </div>
  );
}

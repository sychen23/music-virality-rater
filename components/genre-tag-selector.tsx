"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESET_GENRES = [
  "Pop",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Rock",
  "Latin",
  "Country",
  "Indie",
  "Lo-Fi",
  "Afrobeats",
];

interface GenreTagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export function GenreTagSelector({
  selected,
  onChange,
  maxTags = 5,
}: GenreTagSelectorProps) {
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < maxTags) {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const tag = customInput.trim();
    if (tag && !selected.includes(tag) && selected.length < maxTags) {
      onChange([...selected, tag]);
      setCustomInput("");
      setShowInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_GENRES.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => toggle(genre)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selected.includes(genre)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {genre}
          </button>
        ))}
        {selected
          .filter((t) => !PRESET_GENRES.includes(t))
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className="rounded-full border border-primary bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              {tag} ×
            </button>
          ))}
        {!showInput && selected.length < maxTags && (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground hover:border-primary/50"
          >
            + Add
          </button>
        )}
      </div>
      {showInput && (
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Custom genre..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustom}>
            Add
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {selected.length}/{maxTags} selected
      </p>
    </div>
  );
}

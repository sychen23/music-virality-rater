import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xl font-bold tracking-tight", className)}>
      <Image
        src="/sc-logo.svg"
        alt="Soundcheck logo"
        width={32}
        height={32}
        className="size-[1.2em]"
        priority
      />
      <span>Sound<span className="text-primary">Check</span></span>
    </span>
  );
}

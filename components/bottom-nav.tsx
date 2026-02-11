"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  CloudUploadIcon,
  MusicNote03Icon,
  ChartLineData01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

const tabs = [
  { href: "/", label: "Home", icon: Home01Icon },
  { href: "/upload", label: "Upload", icon: CloudUploadIcon },
  { href: "/rate", label: "Rate", icon: MusicNote03Icon },
  { href: "/results", label: "Results", icon: ChartLineData01Icon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={tab.icon}
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(isActive && "font-medium")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

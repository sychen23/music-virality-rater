"use client";

import { useEffect, useRef } from "react";

interface AdUnitProps {
  adSlot: string;
  adFormat?: string;
  className?: string;
}

export function AdUnit({ adSlot, adFormat = "auto", className }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      const win = window as Window & { adsbygoogle?: Record<string, unknown>[] };
      (win.adsbygoogle = win.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded or ad blocker active
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className ?? ""}`}
      data-ad-client="ca-pub-3047999567481055"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive="true"
    />
  );
}

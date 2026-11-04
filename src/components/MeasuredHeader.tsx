"use client";

import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import type { MeasuredHeaderProps } from "@/types/components";

export function MeasuredHeader({ children }: MeasuredHeaderProps) {
  const ref = useHeaderHeight();
  return (
    <header
      ref={ref}
      data-section="header"
      data-scale-2xl=""
      className="bg-ivory"
    >
      {children}
    </header>
  );
}

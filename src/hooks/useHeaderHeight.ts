"use client";

import { useEffect, useRef } from "react";

export function useHeaderHeight() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--site-header-height");
    const measure = () => {
      const height = header.getBoundingClientRect().height;
      if (Number.isFinite(height) && height > 0) {
        root.style.setProperty("--site-header-height", `${height}px`);
      }
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previous) root.style.setProperty("--site-header-height", previous);
      else root.style.removeProperty("--site-header-height");
    };
  }, []);
  return ref;
}

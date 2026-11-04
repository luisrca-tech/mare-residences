import type { LenisOptions } from "lenis";
import type { Scroller } from "@/types/motion";

export const SMOOTH_SCROLL_OPTIONS: LenisOptions = {
  lerp: 0.07,
  wheelMultiplier: 0.65,
  smoothWheel: true,
  syncTouch: false,
  anchors: false,
  prevent: (node) =>
    node.closest(
      '[data-lenis-prevent], input, textarea, select, [contenteditable="true"]',
    ) !== null,
};

export function createSmoothScroll(
  create: (options: LenisOptions) => Scroller,
) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let instance: Scroller | null = null;
  let frame = 0;
  let syncFrame = 0;
  let observer: MutationObserver | null = null;
  let locked = false;
  let disposed = false;
  const syncLock = () => {
    if (!instance) return;
    const root = document.documentElement;
    const body = document.body;
    const next =
      root.hasAttribute("data-scroll-locked") ||
      body.hasAttribute("data-scroll-locked") ||
      root.style.overflow === "hidden" ||
      body.style.overflow === "hidden" ||
      root.style.overflowY === "hidden" ||
      body.style.overflowY === "hidden" ||
      document.querySelector('[role="dialog"]') !== null;
    if (next === locked) return;
    locked = next;
    if (locked) instance.stop();
    else instance.start();
  };
  const raf = (time: number) => {
    if (!instance || disposed) return;
    instance.raf(time);
    frame = requestAnimationFrame(raf);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(syncFrame);
    frame = syncFrame = 0;
    observer?.disconnect();
    observer = null;
    instance?.stop();
    instance?.destroy();
    instance = null;
  };
  const start = () => {
    if (disposed || media.matches || instance) return;
    try {
      instance = create(SMOOTH_SCROLL_OPTIONS);
    } catch {
      instance = null;
      return;
    }
    locked = false;
    syncLock();
    observer = new MutationObserver(syncLock);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "data-scroll-locked"],
    });
    frame = requestAnimationFrame(raf);
  };
  const sync = () => {
    if (!instance || disposed) return;
    const position = window.scrollY;
    syncLock();
    const stopped =
      locked || ("isStopped" in instance && instance.isStopped === true);
    // Stop/start resets Lenis' Animate synchronously; resize plus an equal target does not.
    instance.stop();
    // Measure the new route before a newer gesture can be clamped to the old bounds.
    instance.resize();
    if (!stopped) instance.start();
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      if (!instance || disposed) return;
      syncLock();
      // Old inertia was stopped before deferral; any new movement now owns the scroll.
      // Resizing also resets Lenis' target, so skip both writes for a newer gesture.
      if (
        window.scrollY !== position ||
        ("isScrolling" in instance && instance.isScrolling === "smooth")
      )
        return;
      instance.resize();
      instance.scrollTo(position, { immediate: true, force: true });
      syncLock();
    });
  };
  const preference = () => {
    if (media.matches) stop();
    else {
      start();
      sync();
    }
  };
  const show = (event: PageTransitionEvent) => {
    if (event.persisted) {
      start();
      sync();
    }
  };
  media.addEventListener("change", preference);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", show);
  start();
  return {
    sync,
    destroy() {
      if (disposed) return;
      disposed = true;
      stop();
      media.removeEventListener("change", preference);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("pageshow", show);
    },
  };
}

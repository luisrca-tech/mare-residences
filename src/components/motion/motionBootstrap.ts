import type { MotionWindow } from "@/types/motion";

// Source adaptations: New Era HOME_TEXT, HOME_IMAGE, GUIDED_BEAT_MS and pageTransition.
// This object is also serialized as the parser argument; keep all shared clocks here.
export const MOTION_PACING = {
  introHold: 900,
  introLift: 1700,
  introBrand: 650,
  deadline: 7000,
  heading: 1080,
  lineStagger: 150,
  label: 540,
  action: 800,
  body: 900,
  readingGap: 140,
  bodyBeat: 1220,
  photo: 1300,
  photoBeat: 2120,
  transition: 1000,
  textEase: "cubic-bezier(0.33, 0.05, 0.2, 1)",
  curtainEase: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

// Serialized once by the root; keep this function independent of module closures.
export function bootstrapMotion(pacing = MOTION_PACING) {
  const host = window as MotionWindow;
  if (host.__mareIntro) return host.__mareIntro;
  const surface = document.getElementById("mare-intro");
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  let restoredTop = navigation?.type !== "reload";
  if (!restoredTop) {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("mare-motion-position") ?? "null",
      );
      restoredTop =
        saved?.pathname !== location.pathname ||
        typeof saved?.scrollY !== "number" ||
        saved.scrollY <= 1;
    } catch {
      restoredTop = true;
    }
  }
  const eligible =
    Boolean(surface) &&
    location.pathname === "/" &&
    !location.hash &&
    navigation?.type !== "back_forward" &&
    restoredTop &&
    window.scrollY <= 1 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    performance.getEntriesByType("paint").length === 0;
  const savePosition = () => {
    try {
      sessionStorage.setItem(
        "mare-motion-position",
        JSON.stringify({
          pathname: location.pathname,
          scrollY: window.scrollY,
        }),
      );
    } catch {}
  };
  const state = {
    eligible,
    startedAt: performance.now(),
    timer: 0,
    savePosition,
  };
  host.__mareIntro = state;
  window.addEventListener("pagehide", savePosition);
  if (eligible) {
    surface?.setAttribute("data-active", "");
    state.timer = window.setTimeout(() => {
      state.eligible = false;
      surface?.removeAttribute("data-active");
    }, pacing.deadline);
  }
  return state;
}

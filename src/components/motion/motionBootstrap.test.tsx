import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MotionWindow } from "@/types/motion";
import { bootstrapMotion } from "./motionBootstrap";

let navigation: { type: string }[];
let paints: object[];
let reduce = false;
beforeEach(() => {
  vi.useFakeTimers();
  navigation = [{ type: "navigate" }];
  paints = [];
  reduce = false;
  history.replaceState({}, "", "/");
  sessionStorage.clear();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  document.body.innerHTML =
    '<div id="mare-intro" aria-hidden="true"><span>maré</span></div><main>Readable SSR</main>';
  vi.spyOn(performance, "getEntriesByType").mockImplementation(
    (type) =>
      (type === "navigation" ? navigation : paints) as PerformanceEntry[],
  );
  vi.stubGlobal("matchMedia", () => ({ matches: reduce }));
});
afterEach(() => {
  const host = window as MotionWindow;
  if (host.__mareIntro) {
    clearTimeout(host.__mareIntro.timer);
    window.removeEventListener("pagehide", host.__mareIntro.savePosition);
  }
  delete host.__mareIntro;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("pre-paint Home bootstrap", () => {
  it("allows an ordinary top reload without stale cross-document played state", () => {
    navigation = [{ type: "reload" }];
    bootstrapMotion();
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(true);
  });
  it("keeps a deliberately paced opening covered beyond the old short deadline", () => {
    bootstrapMotion();
    vi.advanceTimersByTime(2800);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(true);
    vi.advanceTimersByTime(4200);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect(document.querySelector("main")?.textContent).toBe("Readable SSR");
  });
  it("bypasses a reload saved below the Hero even before native restoration arrives", () => {
    navigation = [{ type: "reload" }];
    sessionStorage.setItem(
      "mare-motion-position",
      JSON.stringify({ pathname: "/", scrollY: 500 }),
    );
    bootstrapMotion();
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(false);
  });
  it("arms an ordinary cold Home before paint and fails open by its absolute deadline", () => {
    bootstrapMotion();
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(true);
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(true);
    vi.advanceTimersByTime(7000);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(false);
    expect(document.querySelector("main")?.textContent).toBe("Readable SSR");
  });
  it.each([
    "painted",
    "reduce",
    "hash",
    "back",
    "scrolled",
    "inner",
  ])("leaves %s content static instead of installing a late cover", (reason) => {
    if (reason === "painted") paints = [{}];
    if (reason === "reduce") reduce = true;
    if (reason === "hash") history.replaceState({}, "", "/#conteudo");
    if (reason === "back") navigation = [{ type: "back_forward" }];
    if (reason === "scrolled")
      Object.defineProperty(window, "scrollY", { value: 500 });
    if (reason === "inner") history.replaceState({}, "", "/bairro");
    bootstrapMotion();
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(false);
  });
  it("distinguishes a warm top reload from an unknown restored reload", () => {
    navigation = [{ type: "reload" }];
    sessionStorage.setItem(
      "mare-motion-position",
      JSON.stringify({ pathname: "/", scrollY: 0 }),
    );
    bootstrapMotion();
    expect((window as MotionWindow).__mareIntro?.eligible).toBe(true);
  });
  it("keeps no-JS markup readable without an active surface", () => {
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect(document.querySelector("main")?.textContent).toBe("Readable SSR");
  });
  it("stores only native position for a later reload and installs once", () => {
    const first = bootstrapMotion();
    expect(bootstrapMotion()).toBe(first);
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    expect(
      JSON.parse(sessionStorage.getItem("mare-motion-position") ?? "null"),
    ).toEqual({ pathname: "/", scrollY: 0 });
  });
});

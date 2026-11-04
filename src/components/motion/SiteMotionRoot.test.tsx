import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteMotionRoot } from "./SiteMotionRoot";
import { MotionScene } from "./MotionScene";

const state = vi.hoisted(() => ({
  path: "/",
  router: { push: vi.fn() },
  controller: { commit: vi.fn(), destroy: vi.fn() },
  runtime: { destroy: vi.fn() },
  scroll: { sync: vi.fn(), destroy: vi.fn() },
  install: vi.fn(),
  create: vi.fn(),
  smoothing: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.path,
  useRouter: () => state.router,
}));
vi.mock("lenis", () => ({ default: class {} }));
vi.mock("./motionRuntime", () => ({ installMotion: state.install }));
vi.mock("./siteMotion", () => ({ createSiteMotion: state.create }));
vi.mock("./smoothScroll", () => ({ createSmoothScroll: state.smoothing }));

beforeEach(() => {
  vi.clearAllMocks();
  state.path = "/";
  state.install.mockReturnValue(state.runtime);
  state.create.mockReturnValue(state.controller);
  state.smoothing.mockReturnValue(state.scroll);
});
describe("persistent site owner", () => {
  it("executes the serialized parser with its shared clock argument and no module closure", () => {
    vi.useFakeTimers();
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    const html = renderToStaticMarkup(
      <SiteMotionRoot wordmark="maré">
        <h1>Readable</h1>
      </SiteMotionRoot>,
    );
    const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (!script) throw new Error("Missing real parser script");
    document.body.innerHTML = '<div id="mare-intro"></div>';
    const host = window as Window & {
      __mareIntro?: {
        timer: number;
        eligible: boolean;
        savePosition: () => void;
      };
    };
    try {
      new Function(script)();
      expect(host.__mareIntro?.eligible).toBe(true);
      vi.advanceTimersByTime(2800);
      expect(
        document.getElementById("mare-intro")?.hasAttribute("data-active"),
      ).toBe(true);
      vi.advanceTimersByTime(4200);
      expect(
        document.getElementById("mare-intro")?.hasAttribute("data-active"),
      ).toBe(false);
    } finally {
      if (host.__mareIntro) {
        clearTimeout(host.__mareIntro.timer);
        window.removeEventListener("pagehide", host.__mareIntro.savePosition);
      }
      delete host.__mareIntro;
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });
  it("owns one runtime and scroller across destination commits and disposes both", () => {
    const view = render(
      <SiteMotionRoot wordmark="maré">
        <p>Content</p>
      </SiteMotionRoot>,
    );
    state.path = "/bairro";
    view.rerender(
      <SiteMotionRoot wordmark="maré">
        <p>Neighborhood</p>
      </SiteMotionRoot>,
    );
    expect(state.install).toHaveBeenCalledTimes(1);
    expect(state.smoothing).toHaveBeenCalledTimes(1);
    expect(state.controller.commit).toHaveBeenLastCalledWith("/bairro");
    view.unmount();
    expect(state.controller.destroy).toHaveBeenCalledOnce();
    expect(state.runtime.destroy).toHaveBeenCalledOnce();
    expect(state.scroll.destroy).toHaveBeenCalledOnce();
  });
  it("renders one parser bootstrap and readable no-JS content", () => {
    const html = renderToStaticMarkup(
      <SiteMotionRoot wordmark="maré">
        <h1>Readable headline</h1>
      </SiteMotionRoot>,
    );
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toContain('id="mare-intro"');
    expect(html).toContain("<h1>Readable headline</h1>");
    expect(html.match(/<div id="mare-intro"[^>]*>/)?.[0]).not.toContain(
      "data-active",
    );
  });
  it("keeps sections layout-neutral without installing competing runtimes", () => {
    const html = renderToStaticMarkup(
      <>
        <MotionScene sceneKey="one">
          <p>One</p>
        </MotionScene>
        <MotionScene sceneKey="two">
          <p>Two</p>
        </MotionScene>
      </>,
    );
    expect(html).not.toContain("<script");
    expect(html).toContain("display:contents");
    expect(state.install).not.toHaveBeenCalled();
  });
});

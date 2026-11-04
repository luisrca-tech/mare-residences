import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import type { MotionWindow } from "@/types/motion";
import { bootstrapMotion } from "./motionBootstrap";
import { installMotion } from "./motionRuntime";
import { createSiteMotion } from "./siteMotion";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
let controller: ReturnType<typeof createSiteMotion> | undefined;
let preference: () => void;
let reduce = false;
let frames: FrameRequestCallback[];
let bottom = 900;
let autoFinish = false;
let native: {
  update: () => Promise<void>;
  ready: ReturnType<typeof deferred>;
  finished: ReturnType<typeof deferred>;
  skip: ReturnType<typeof vi.fn>;
}[];
let animated: {
  target: HTMLElement;
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  done: ReturnType<typeof deferred>;
}[];
let navigate: Mock<(href: string) => void>;
let syncScroll: Mock<() => void>;
let runtime: ReturnType<typeof installMotion>;

beforeEach(() => {
  vi.useFakeTimers();
  reduce = false;
  bottom = 900;
  autoFinish = false;
  frames = [];
  native = [];
  animated = [];
  history.replaceState({}, "", "/");
  sessionStorage.clear();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1440,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 900,
  });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  document.body.innerHTML =
    '<div id="mare-intro"><span data-intro-wordmark>maré</span></div><main><div data-motion-scene="home-hero" data-motion-kind="hero"><p data-motion-part="heading">Label</p><h1 data-motion-part="heading">Title</h1><p data-motion-part="body">Body</p></div><a href="/residencias">Residences</a><a href="/bairro">Neighborhood</a></main>';
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { status: "loaded", ready: Promise.resolve(), check: () => true },
  });
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduce;
    },
    addEventListener: (_: string, callback: () => void) => {
      preference = callback;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return {
        top: this.id === "mare-intro" ? bottom - 900 : 120,
        bottom: this.id === "mare-intro" ? bottom : 400,
        left: 0,
        right: 500,
        height: this.id === "mare-intro" ? 900 : 280,
        width: 500,
        x: 0,
        y: 120,
        toJSON() {},
      };
    },
  );
  HTMLElement.prototype.animate = vi.fn(function (
    this: HTMLElement,
    _frames,
    options,
  ) {
    const done = deferred();
    let timer = 0;
    const play = vi.fn(() => {
      if (autoFinish)
        timer = window.setTimeout(
          done.resolve,
          Number((options as KeyframeAnimationOptions).duration ?? 0) +
            Number((options as KeyframeAnimationOptions).delay ?? 0),
        );
    });
    const item = {
      target: this,
      options: options as KeyframeAnimationOptions,
      cancel: vi.fn(() => clearTimeout(timer)),
      pause: vi.fn(() => clearTimeout(timer)),
      play,
      done,
    };
    animated.push(item);
    play();
    return {
      finished: done.promise,
      cancel: item.cancel,
      pause: item.pause,
      play: item.play,
    } as unknown as Animation;
  });
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: undefined,
  });
  runtime = {
    scan: vi.fn(),
    release: vi.fn(),
    destroy: vi.fn(),
    resume: vi.fn(),
    settle: vi.fn(),
  } as unknown as ReturnType<typeof installMotion>;
  navigate = vi.fn();
  syncScroll = vi.fn();
  bootstrapMotion();
});
afterEach(() => {
  controller?.destroy();
  controller = undefined;
  runtime.destroy();
  const host = window as MotionWindow;
  if (host.__mareIntro) {
    clearTimeout(host.__mareIntro.timer);
    window.removeEventListener("pagehide", host.__mareIntro.savePosition);
  }
  delete host.__mareIntro;
  Reflect.deleteProperty(document, "startViewTransition");
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function start(intro = true) {
  if (!intro) {
    const state = (window as MotionWindow).__mareIntro;
    if (state) state.eligible = false;
    document.getElementById("mare-intro")?.removeAttribute("data-active");
  }
  controller = createSiteMotion({ navigate, runtime, syncScroll });
  return controller;
}
function click(href: string, modifiers: MouseEventInit = {}) {
  const anchor = document.createElement("a");
  anchor.href = href;
  document.body.append(anchor);
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  anchor.dispatchEvent(event);
  return event;
}
function enableNative() {
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    value: vi.fn((update: () => Promise<void>) => {
      const ready = deferred(),
        finished = deferred();
      const skip = vi.fn(() => finished.resolve());
      native.push({ update, ready, finished, skip });
      return {
        ready: ready.promise,
        finished: finished.promise,
        skipTransition: skip,
      };
    }),
  });
}
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("V4 covered Hero curtain and deliberate entry", () => {
  function photo(cold: boolean) {
    const node = document.querySelector<HTMLElement>(
      '[data-motion-scene="home-hero"]',
    );
    if (!node) throw new Error("Missing real Hero scope");
    const slot = document.createElement("div");
    slot.dataset.motionPart = "image";
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 1000 });
    const decoded = deferred();
    image.decode = vi.fn(() => (cold ? decoded.promise : Promise.resolve()));
    slot.append(image);
    node.append(slot);
    return { node, slot, decoded };
  }
  it.each(
    ["fresh-warm", "reload-warm", "reload-cold"].flatMap((entry) =>
      [1440, 425].map((width) => ({ entry, width })),
    ),
  )("prepares under the cover and visibly releases its own curtain on$entry at$width", async ({
    entry,
    width,
  }) => {
    Object.defineProperty(window, "innerWidth", { value: width });
    if (entry.startsWith("reload")) {
      const host = window as MotionWindow;
      clearTimeout(host.__mareIntro?.timer);
      if (host.__mareIntro)
        window.removeEventListener("pagehide", host.__mareIntro.savePosition);
      delete host.__mareIntro;
      vi.mocked(performance.getEntriesByType).mockImplementation(
        (kind) =>
          (kind === "navigation"
            ? [{ type: "reload" }]
            : []) as unknown as PerformanceEntry[],
      );
      sessionStorage.setItem(
        "mare-motion-position",
        JSON.stringify({ pathname: "/", scrollY: 0 }),
      );
      bootstrapMotion();
    }
    const state = photo(entry.endsWith("cold"));
    runtime = installMotion();
    autoFinish = true;
    start();
    await flush();
    expect(state.slot.style.clipPath).toBe("inset(0 100% 0 0)");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
    state.decoded.resolve();
    await flush();
    vi.advanceTimersByTime(2100);
    await flush();
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(true);
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
    bottom = 0;
    for (const callback of [...frames]) callback(2100);
    const curtain = animated.find((a) => a.target === state.slot);
    expect(curtain).toBeDefined();
    expect(Number(curtain?.options.duration)).toBeGreaterThanOrEqual(1200);
    expect(curtain?.pause).not.toHaveBeenCalled();
    expect(state.slot.dataset.motionState).toBe("running");
    vi.advanceTimersByTime(700);
    await flush();
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    vi.advanceTimersByTime(3000);
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(state.slot.dataset.motionState).toBe("settled");
    expect(state.node.querySelector("h1")?.textContent).toBe("Title");
  });

  it("prepares the visible portion of a tall Hero safely at a short viewport", async () => {
    const state = photo(false);
    Object.defineProperty(window, "innerHeight", { value: 500 });
    bottom = 500;
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(
      function (this: HTMLElement) {
        const panel = this.id === "mare-intro";
        return {
          top: panel ? bottom - 500 : 120,
          bottom: panel ? bottom : 680,
          left: 0,
          right: 500,
          width: 500,
          height: panel ? 500 : 560,
          x: 0,
          y: 0,
          toJSON() {},
        };
      },
    );
    runtime = installMotion();
    start();
    await flush();
    expect(state.slot.style.clipPath).toBe("inset(0 100% 0 0)");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
    bottom = 0;
    for (const callback of [...frames]) callback(2100);
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(1);
  });
  it("fails open with an undecoded prepared photo and never re-closes it after the deadline", async () => {
    const state = photo(true);
    runtime = installMotion();
    start();
    expect(state.slot.style.clipPath).toBe("inset(0 100% 0 0)");
    vi.advanceTimersByTime(7000);
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    state.decoded.resolve();
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
  });
  it("retains safe covered photo preparation when fonts become ready after the cover moved", async () => {
    const state = photo(false);
    const fonts = deferred();
    const fontState = {
      status: "loading",
      ready: fonts.promise,
      check: () => true,
    };
    Object.defineProperty(document, "fonts", { value: fontState });
    runtime = installMotion();
    start();
    bottom = 100;
    fontState.status = "loaded";
    fonts.resolve();
    await flush();
    // The photo was already prepared under cover; late fonts must not cancel its own curtain.
    for (const callback of [...frames]) callback(2100);
    const curtain = animated.find((a) => a.target === state.slot);
    expect(curtain).toBeDefined();
    animated.find((a) => a.target.id === "mare-intro")?.done.resolve();
    curtain?.done.resolve();
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(1);
  });
  it("clears the covered photo if the intro animation rejects", async () => {
    const state = photo(true);
    runtime = installMotion();
    start();
    expect(state.slot.style.clipPath).toBe("inset(0 100% 0 0)");
    animated
      .find((a) => a.target.id === "mare-intro")
      ?.done.reject(new Error("Interrupted animation"));
    await flush();
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
  });
  it("keeps the full gentle lift for a cold hydration while the parser still covers the page", () => {
    vi.mocked(performance.now).mockReturnValue(3000);
    start();
    const lift = animated.find((a) => a.target.id === "mare-intro");
    expect(lift).toBeDefined();
    expect(Number(lift?.options.duration)).toBeGreaterThanOrEqual(1400);
    expect(lift?.options.delay).toBe(0);
  });
  it("does not close already exposed Hero pixels when media decodes after handoff", async () => {
    const state = photo(true);
    runtime = installMotion();
    start();
    bottom = 0;
    for (const callback of [...frames]) callback(2100);
    expect(state.slot.style.clipPath).toBe("");
    state.decoded.resolve();
    await flush();
    expect(state.slot.style.clipPath).toBe("");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
  });
  it("removes a prepared curtain immediately on input and ignores late decode", async () => {
    const state = photo(true);
    runtime = installMotion();
    start();
    expect(state.slot.style.clipPath).toBe("inset(0 100% 0 0)");
    const wheel = new WheelEvent("wheel", {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(wheel);
    state.decoded.resolve();
    await flush();
    expect(wheel.defaultPrevented).toBe(false);
    expect(state.slot.style.clipPath).toBe("");
    expect(state.slot.dataset.motionState).toBe("settled");
    expect(animated.filter((a) => a.target === state.slot)).toHaveLength(0);
  });
});
describe("Home introduction owner", () => {
  it("runs a real regular opening and prepares the Hero while covered", () => {
    start();
    expect(
      animated.find((item) => item.target.id === "mare-intro")?.options,
    ).toMatchObject({ duration: 1800, delay: 1000 });
    expect(runtime.scan).toHaveBeenCalledWith(
      document.querySelector('[data-motion-scene="home-hero"]'),
      true,
      { paused: true, coveredBy: document.getElementById("mare-intro") },
    );
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(true);
  });
  it("releases the Hero clock only after the panel clears its actual text", async () => {
    start();
    expect(runtime.resume).not.toHaveBeenCalled();
    bottom = 0;
    for (const callback of [...frames]) callback(1000);
    expect(runtime.resume).toHaveBeenCalled();
    animated.find((item) => item.target.id === "mare-intro")?.done.resolve();
    await flush();
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
  });
  it("preserves the deliberate clock at a short desktop viewport", () => {
    Object.defineProperty(window, "innerHeight", { value: 719 });
    start();
    expect(
      animated.find((item) => item.target.id === "mare-intro")?.options,
    ).toMatchObject({ duration: 1800, delay: 1000 });
  });
  it("settles instead of adding an introduction after the parser deadline", () => {
    vi.advanceTimersByTime(7000);
    start();
    expect(animated).toHaveLength(0);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
  });
  it("fails open even if an animation never completes", () => {
    start();
    vi.advanceTimersByTime(7000);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect(runtime.settle).toHaveBeenCalled();
  });
  it.each([
    "keydown",
    "wheel",
    "resize",
    "pagehide",
  ])("settles the intro on %s without consuming the input", (type) => {
    start();
    const event =
      type === "keydown"
        ? new KeyboardEvent(type, {
            key: "Tab",
            bubbles: true,
            cancelable: true,
          })
        : new Event(type, { bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(
      document.getElementById("mare-intro")?.hasAttribute("data-active"),
    ).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(runtime.settle).toHaveBeenCalled();
  });
  it("ignores a late font continuation after interruption", async () => {
    const ready = deferred();
    Object.defineProperty(document, "fonts", {
      value: { status: "loading", ready: ready.promise },
    });
    start();
    window.dispatchEvent(new Event("wheel"));
    vi.mocked(runtime.scan).mockClear();
    ready.resolve();
    await flush();
    expect(runtime.scan).not.toHaveBeenCalled();
  });
});

describe("destination transition owner", () => {
  it("commits ordinary fallback routing immediately and gives Home one fallback entry", () => {
    const owner = start(false);
    expect(click("/bairro").defaultPrevented).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/bairro");
    history.replaceState({}, "", "/bairro");
    owner.commit("/bairro");
    expect(runtime.scan).toHaveBeenLastCalledWith(
      document.querySelector("[data-motion-scene]"),
      true,
      { fallback: true },
    );
    expect(syncScroll).toHaveBeenCalled();
  });
  it("prepares a native destination but resumes its clock only after finished", async () => {
    enableNative();
    const owner = start(false);
    click("/residencias");
    expect(native).toHaveLength(1);
    const update = native[0].update();
    expect(navigate).toHaveBeenCalledWith("/residencias");
    history.replaceState({}, "", "/residencias");
    owner.commit("/residencias");
    await update;
    native[0].ready.resolve();
    await flush();
    expect(runtime.resume).not.toHaveBeenCalled();
    expect(
      animated.find((item) => item.options.pseudoElement)?.options.duration,
    ).toBe(1000);
    native[0].finished.resolve();
    await flush();
    expect(runtime.resume).toHaveBeenCalled();
  });
  it("invalidates an older generation before a rapid newer navigation", async () => {
    enableNative();
    start(false);
    click("/residencias");
    click("/bairro");
    expect(native[0].skip).toHaveBeenCalled();
    await native[0].update();
    expect(navigate).not.toHaveBeenCalledWith("/residencias");
    native[1].update();
    expect(navigate).toHaveBeenCalledWith("/bairro");
  });
  it.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])("preserves modified navigation %j", (modifier) => {
    start(false);
    expect(click("/bairro", modifier).defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
  it.each([
    "/#conteudo",
    "/?demo=error-once",
    "https://example.com/bairro",
  ])("preserves native %s", (href) => {
    start(false);
    expect(click(href).defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
  it("preserves downloads, foreign targets and already prevented actions", () => {
    start(false);
    const anchor = document.createElement("a");
    anchor.href = "/bairro";
    anchor.download = "test";
    document.body.append(anchor);
    anchor.click();
    anchor.removeAttribute("download");
    anchor.target = "_blank";
    anchor.click();
    expect(navigate).not.toHaveBeenCalled();
  });
  it("commits a pending native action on input and removes its presentation", async () => {
    enableNative();
    start(false);
    click("/bairro");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(navigate).toHaveBeenCalledWith("/bairro");
    expect(native[0].skip).toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-mare-transition")).toBe(
      false,
    );
    await native[0].update();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
  it("preserves useful content when router navigation throws", () => {
    navigate.mockImplementation(() => {
      throw new Error("Router unavailable");
    });
    start(false);
    click("/bairro");
    expect(runtime.settle).toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-mare-transition")).toBe(
      false,
    );
    expect(document.querySelector("h1")?.textContent).toBe("Title");
  });
  it("settles history and a live reduced preference rather than replaying", () => {
    const owner = start(false);
    window.dispatchEvent(new PopStateEvent("popstate"));
    history.replaceState({}, "", "/bairro");
    owner.commit("/bairro");
    expect(runtime.scan).toHaveBeenLastCalledWith(
      document.querySelector("[data-motion-scene]"),
      false,
      {},
    );
    reduce = true;
    preference();
    expect(runtime.settle).toHaveBeenCalled();
  });
  it("releases a stuck preparation by its deadline and invalidates late callbacks", async () => {
    enableNative();
    start(false);
    click("/bairro");
    vi.advanceTimersByTime(7000);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(native[0].skip).toHaveBeenCalled();
    await native[0].update();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("integration failure and focus boundaries", () => {
  it("settles the actual skip-link target before reading or keyboard navigation", () => {
    start(false);
    const main = document.querySelector("main");
    if (!main) throw new Error("Missing real main target");
    main.id = "conteudo";
    main.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(runtime.settle).toHaveBeenCalledWith(main);
  });
  it("fails open when pseudo-element animation is unsupported", async () => {
    enableNative();
    const owner = start(false);
    click("/bairro");
    const update = native[0].update();
    history.replaceState({}, "", "/bairro");
    owner.commit("/bairro");
    await update;
    vi.spyOn(document.documentElement, "animate").mockImplementation(() => {
      throw new Error("Unsupported pseudo-element");
    });
    native[0].ready.resolve();
    await flush();
    expect(document.documentElement.hasAttribute("data-mare-transition")).toBe(
      false,
    );
    expect(runtime.settle).toHaveBeenCalled();
  });
  it("keeps readable SSR if animation support is unavailable", () => {
    const surface = document.getElementById("mare-intro");
    Object.defineProperty(surface, "animate", {
      value: undefined,
      configurable: true,
    });
    start();
    expect(surface?.hasAttribute("data-active")).toBe(false);
    expect(document.querySelector("h1")?.textContent).toBe("Title");
  });
  it("does not cancel a newer destination when an older committed route arrives", async () => {
    enableNative();
    const owner = start(false);
    click("/residencias");
    native[0].update();
    click("/bairro");
    history.replaceState({}, "", "/residencias");
    owner.commit("/residencias");
    expect(native[1].skip).not.toHaveBeenCalled();
    native[0].finished.resolve();
    await flush();
    expect(runtime.resume).not.toHaveBeenCalled();
    native[1].update();
    expect(navigate).toHaveBeenLastCalledWith("/bairro");
  });
});

describe("R4 interruption retirement", () => {
  it.each([
    "pointerdown",
    "keydown",
    "wheel",
    "popstate",
  ])("R4 retires a pushed route during %s before a newer activation", async (input) => {
    enableNative();
    const owner = start(false);
    click("/residencias");
    const oldUpdate = native[0].update();
    const event =
      input === "keydown"
        ? new KeyboardEvent(input, {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          })
        : new Event(input, { bubbles: true, cancelable: true });
    if (input === "pointerdown") document.body.dispatchEvent(event);
    else window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    click("/bairro");
    const newUpdate = native[1].update();
    history.replaceState({}, "", "/residencias");
    owner.commit("/residencias");
    await flush();
    expect(native[1].skip).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-mare-transition")).toBe(
      true,
    );
    expect(navigate.mock.calls).toEqual([["/residencias"], ["/bairro"]]);
    history.replaceState({}, "", "/bairro");
    owner.commit("/bairro");
    await Promise.all([oldUpdate, newUpdate]);
    native[1].ready.resolve();
    await flush();
    native[1].finished.resolve();
    await flush();
    expect(runtime.resume).toHaveBeenCalled();
  });
  it("R4 allows a fresh activation to the previously retired destination", async () => {
    enableNative();
    const owner = start(false);
    click("/residencias");
    const first = native[0].update();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    click("/residencias");
    const latest = native[1].update();
    history.replaceState({}, "", "/residencias");
    owner.commit("/residencias");
    await Promise.all([first, latest]);
    expect(native[1].skip).not.toHaveBeenCalled();
    expect(runtime.scan).toHaveBeenLastCalledWith(
      document.querySelector("[data-motion-scene]"),
      true,
      { paused: true, skipVisiblePhoto: true },
    );
  });
  it("R4 preserves native history restoration after interrupting an issued route", async () => {
    enableNative();
    const owner = start(false);
    click("/residencias");
    const update = native[0].update();
    window.dispatchEvent(new PopStateEvent("popstate"));
    history.replaceState({}, "", "/residencias");
    owner.commit("/residencias");
    await update;
    expect(runtime.scan).toHaveBeenLastCalledWith(
      document.querySelector("[data-motion-scene]"),
      false,
      {},
    );
    expect(syncScroll).toHaveBeenCalled();
  });
});

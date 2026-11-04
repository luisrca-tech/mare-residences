import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import Lenis, { type LenisOptions } from "lenis";
import { createSmoothScroll } from "./smoothScroll";

let reduce = false;
let preference: () => void;
let mutation: () => void;
let frames: Map<number, FrameRequestCallback>;
let nextFrame = 0;
const scroller = () => ({
  raf: vi.fn(),
  resize: vi.fn(),
  scrollTo: vi.fn(),
  stop: vi.fn(),
  start: vi.fn(),
  destroy: vi.fn(),
});
let instance: ReturnType<typeof scroller>;
let create: Mock<() => ReturnType<typeof scroller>>;
let owner: ReturnType<typeof createSmoothScroll>;
beforeEach(() => {
  reduce = false;
  frames = new Map();
  nextFrame = 0;
  instance = scroller();
  create = vi.fn(() => instance);
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
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(callback: () => void) {
        mutation = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  owner = createSmoothScroll(create);
});
afterEach(() => {
  owner.destroy();
  document.body.style.overflow = "";
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function frame() {
  const pending = [...frames];
  frames.clear();
  for (const [, callback] of pending) callback(100);
}
describe("one smooth-scroll owner", () => {
  it("owns one instance and one continuous RAF", () => {
    expect(create).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    frame();
    expect(instance.raf).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    owner.destroy();
    expect(frames.size).toBe(0);
    expect(instance.destroy).toHaveBeenCalledOnce();
  });
  it("destroys on live reduce and recreates once without duplicate work", () => {
    reduce = true;
    preference();
    expect(instance.destroy).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    reduce = false;
    preference();
    preference();
    expect(create).toHaveBeenCalledTimes(2);
    frame();
    expect(frames.size).toBe(1);
  });
  it("does not instantiate for an initial reduced preference", () => {
    owner.destroy();
    create.mockClear();
    reduce = true;
    owner = createSmoothScroll(create);
    expect(create).not.toHaveBeenCalled();
  });
  it("synchronizes to the restored native position and coalesces route sync", () => {
    Object.defineProperty(window, "scrollY", {
      value: 631,
      configurable: true,
    });
    owner.sync();
    owner.sync();
    expect(instance.resize).toHaveBeenCalledTimes(2);
    frame();
    expect(instance.resize).toHaveBeenCalledTimes(3);
    expect(instance.scrollTo).toHaveBeenCalledWith(631, {
      immediate: true,
      force: true,
    });
    expect(frames.size).toBe(1);
  });
  it("observes a preexisting modal lock without acquiring or restoring it", () => {
    document.body.style.overflow = "hidden";
    mutation();
    expect(instance.stop).toHaveBeenCalledOnce();
    owner.destroy();
    expect(document.body.style.overflow).toBe("hidden");
  });
  it("disposes during pagehide and resynchronizes on a persisted pageshow", () => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    expect(instance.destroy).toHaveBeenCalledOnce();
    const event = new PageTransitionEvent("pageshow");
    Object.defineProperty(event, "persisted", { value: true });
    window.dispatchEvent(event);
    expect(create).toHaveBeenCalledTimes(2);
    frame();
    expect(instance.resize).toHaveBeenCalledTimes(2);
  });
});

it("keeps native scrolling if creating the smoothing instance fails", () => {
  owner.destroy();
  create.mockImplementation(() => {
    throw new Error("Scroller unavailable");
  });
  expect(() => {
    owner = createSmoothScroll(create);
  }).not.toThrow();
  expect(frames.size).toBe(0);
  expect(document.body.style.overflow).toBe("");
});

describe("R3 real Lenis restoration", () => {
  function realScroller(height = 6000) {
    owner.destroy();
    let nativeTop = 0;
    // Happy DOM can take Lenis' element-wrapper dimension branch across VM identities.
    for (const [key, value] of Object.entries({
      clientWidth: 1440,
      clientHeight: 900,
      scrollWidth: 1440,
      scrollHeight: height,
    })) {
      Object.defineProperty(window, key, { configurable: true, value });
    }
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => nativeTop,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: height,
    });
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      value: 1440,
    });
    vi.spyOn(window, "scrollTo").mockImplementation(
      (options: ScrollToOptions | number) => {
        if (typeof options === "object" && options.top !== undefined)
          nativeTop = options.top;
      },
    );
    let actual: Lenis | undefined;
    const factory = vi.fn((options: LenisOptions) => {
      actual = new Lenis({ ...options, autoResize: false });
      return actual;
    });
    owner = createSmoothScroll(factory);
    if (!actual)
      throw new Error("The installed Lenis instance was not created");
    return {
      actual,
      factory,
      documentHeight(next: number) {
        Object.defineProperty(window, "scrollHeight", {
          configurable: true,
          value: next,
        });
        Object.defineProperty(document.documentElement, "scrollHeight", {
          configurable: true,
          value: next,
        });
      },
      jump(top: number) {
        nativeTop = top;
        window.dispatchEvent(new Event("scroll"));
      },
      top: () => nativeTop,
      step(time: number, syncFirst = false) {
        const pending = [...frames];
        frames.clear();
        if (syncFirst) pending.reverse();
        for (const [, callback] of pending) callback(time);
      },
    };
  }

  const routeSizes = [
    { from: 1900, to: 6000, restored: 2500, destination: 2565 },
    { from: 6000, to: 1900, restored: 980, destination: 1000 },
  ].flatMap((size) =>
    [false, true].flatMap((oldInertia) =>
      [false, true].map((syncFirst) => ({ ...size, oldInertia, syncFirst })),
    ),
  );
  const wheel = (deltaY = 100) => {
    const event = new WheelEvent("wheel", {
      deltaY,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    return event;
  };
  it.each(
    routeSizes,
  )("R6 completes a new gesture across $from->$to route bounds, oldInertia=$oldInertia syncFirst=$syncFirst", ({
    from,
    to,
    restored,
    destination,
    oldInertia,
    syncFirst,
  }) => {
    const state = realScroller(from);
    expect(state.actual.limit).toBe(from - 900);
    if (oldInertia)
      state.actual.scrollTo(900, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    state.documentHeight(to);
    state.jump(restored);
    owner.sync();
    expect(state.actual.isScrolling).not.toBe("smooth");
    wheel();
    expect(state.actual.targetScroll).toBe(destination);
    state.step(48, syncFirst);
    for (let time = 64; time <= 240; time += 16) state.step(time);
    // Deliver the dependency's debounced dimension refresh after the first gesture was accepted.
    state.actual.dimensions.resize();
    for (let time = 256; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(destination);
    expect(state.actual.targetScroll).toBe(destination);
    expect(state.actual.limit).toBe(to - 900);
    expect(state.actual.isScrolling).toBe(false);
    wheel(-200);
    expect(state.actual.targetScroll).toBe(destination - 130);
    for (let time = 4112; time <= 8192; time += 16) state.step(time);
    expect(state.top()).toBe(destination - 130);
    expect(state.actual.isScrolling).toBe(false);
    expect(state.factory).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    owner.destroy();
    expect(frames.size).toBe(0);
  });
  it.each(
    [false, true].flatMap((oldInertia) =>
      [false, true].map((syncFirst) => ({ oldInertia, syncFirst })),
    ),
  )("R6 preserves newer native input and subsequent full wheel gestures after route growth, oldInertia=$oldInertia syncFirst=$syncFirst", ({
    oldInertia,
    syncFirst,
  }) => {
    const state = realScroller(1900);
    if (oldInertia)
      state.actual.scrollTo(900, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    state.documentHeight(6000);
    state.jump(2500);
    owner.sync();
    const key = new KeyboardEvent("keydown", {
      key: "PageDown",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(key);
    // Happy DOM does not perform the keyboard's native scrolling default.
    state.jump(2800);
    state.step(48, syncFirst);
    expect(state.top()).toBe(2800);
    wheel();
    expect(state.actual.targetScroll).toBe(2865);
    for (let time = 64; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(2865);
    wheel(-200);
    for (let time = 4112; time <= 8192; time += 16) state.step(time);
    expect(state.top()).toBe(2735);
    expect(key.defaultPrevented).toBe(false);
    expect(state.factory).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
  });
  it.each([
    "modal",
    "manual",
  ])("R6 refreshes changed bounds without releasing a %s stop; the owner's later release accepts a valid gesture", (mode) => {
    const state = realScroller(1900);
    state.actual.scrollTo(900, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    if (mode === "modal") {
      document.body.style.overflow = "hidden";
      mutation();
    } else state.actual.stop();
    const resume = vi.spyOn(state.actual, "start");
    state.documentHeight(6000);
    state.jump(2500);
    owner.sync();
    expect(state.actual.isStopped).toBe(true);
    expect(resume).not.toHaveBeenCalled();
    expect(wheel().defaultPrevented).toBe(true);
    expect(state.actual.targetScroll).toBe(2500);
    if (mode === "modal") {
      expect(document.body.style.overflow).toBe("hidden");
      document.body.style.overflow = "";
      mutation();
    } else state.actual.start();
    wheel();
    expect(state.actual.targetScroll).toBe(2565);
    state.step(48);
    for (let time = 64; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(2565);
    wheel(-200);
    for (let time = 4112; time <= 8192; time += 16) state.step(time);
    expect(state.top()).toBe(2435);
    expect(state.factory).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
  });
  it("R6 coalesces explicit sync callbacks while each new route refreshes bounds before input", () => {
    const state = realScroller(1900);
    state.step(16);
    state.step(32);
    state.documentHeight(4000);
    state.jump(1700);
    owner.sync();
    state.documentHeight(6000);
    state.jump(2500);
    owner.sync();
    wheel();
    expect(state.actual.targetScroll).toBe(2565);
    state.step(48);
    for (let time = 64; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(2565);
    wheel(-200);
    for (let time = 4112; time <= 8192; time += 16) state.step(time);
    expect(state.top()).toBe(2435);
    expect(state.factory).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
  });
  const inputCases = [false, true].flatMap((oldInertia) =>
    [false, true].flatMap((syncFirst) =>
      (["native", "wheel"] as const).map((input) => ({
        oldInertia,
        syncFirst,
        input,
      })),
    ),
  );
  it.each(
    inputCases,
  )("R5 preserves a complete newer $input gesture, oldInertia=$oldInertia syncFirst=$syncFirst", ({
    oldInertia,
    syncFirst,
    input,
  }) => {
    const state = realScroller();
    if (oldInertia)
      state.actual.scrollTo(1000, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    state.jump(2500);
    owner.sync();
    expect(state.actual.isScrolling).not.toBe("smooth");
    if (input === "native") {
      const key = new KeyboardEvent("keydown", {
        key: "PageDown",
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(key);
      expect(key.defaultPrevented).toBe(false);
      // The fixture applies the browser's native default scroll; Happy DOM does not.
      state.jump(2800);
    } else {
      document.body.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 100,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    const destination = input === "native" ? 2800 : 2565;
    expect(state.actual.targetScroll).toBe(destination);
    state.step(48, syncFirst);
    expect(state.actual.targetScroll).toBe(destination);
    for (let time = 64; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(destination);
    expect(state.actual.targetScroll).toBe(destination);
    // Native velocity expires on a wall-clock timer, independent of these RAF steps.
    expect(state.actual.isScrolling).toBe(
      input === "native" ? "native" : false,
    );
    // A subsequent gesture must continue from the accepted destination, not a stale snapshot.
    document.body.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -200,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(state.actual.targetScroll).toBe(destination - 130);
    for (let time = 4112; time <= 8192; time += 16) state.step(time);
    expect(state.top()).toBe(destination - 130);
    expect(state.actual.targetScroll).toBe(destination - 130);
    expect(state.actual.isScrolling).toBe(false);
    expect(state.factory).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
  });
  it("R5 preserves a manually stopped owner through newer native input", () => {
    const state = realScroller();
    state.actual.stop();
    const resume = vi.spyOn(state.actual, "start");
    state.jump(2500);
    owner.sync();
    state.jump(2800);
    state.step(48);
    state.step(64);
    const wheel = new WheelEvent("wheel", {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(wheel);
    for (let time = 80; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(2800);
    expect(state.actual.targetScroll).toBe(2800);
    expect(state.actual.isStopped).toBe(true);
    expect(wheel.defaultPrevented).toBe(true);
    expect(resume).not.toHaveBeenCalled();
  });
  it("R5 refreshes the latest explicit coalesced sync but preserves a wheel accepted after it", () => {
    const state = realScroller();
    state.jump(1700);
    owner.sync();
    state.jump(2500);
    owner.sync();
    const resize = vi.spyOn(state.actual, "resize");
    document.body.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }),
    );
    state.step(48);
    for (let time = 64; time <= 4096; time += 16) state.step(time);
    expect(state.top()).toBe(2565);
    expect(state.actual.targetScroll).toBe(2565);
    expect(resize).not.toHaveBeenCalled();
    owner.sync();
    expect(resize).toHaveBeenCalledOnce();
    state.step(4112);
    expect(resize).toHaveBeenCalledTimes(2);
    expect(state.top()).toBe(2565);
    expect(state.factory).toHaveBeenCalledOnce();
  });
  it("R5 ignores already delivered callbacks after destruction", () => {
    const state = realScroller();
    state.jump(2500);
    owner.sync();
    const pending = [...frames.values()];
    const resize = vi.spyOn(state.actual, "resize");
    const write = vi.spyOn(state.actual, "scrollTo");
    owner.destroy();
    state.jump(2800);
    for (const callback of pending) callback(48);
    expect(state.top()).toBe(2800);
    expect(resize).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });
  it.each([
    false,
    true,
  ])("R3 cancels real running interpolation before deferred sync, syncFirst=%s", (syncFirst) => {
    const state = realScroller();
    state.actual.scrollTo(1000, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    expect(state.top()).toBeGreaterThan(0);
    expect(state.top()).toBeLessThan(1000);
    state.jump(2500);
    owner.sync();
    state.step(48, syncFirst);
    expect(state.top()).toBe(2500);
    state.step(64);
    expect(state.top()).toBe(2500);
    expect(state.actual.isScrolling).not.toBe("smooth");
    expect(state.factory).toHaveBeenCalledOnce();
  });
  it("R3 preserves idle restoration and coalesces to the latest intended native target", () => {
    const state = realScroller();
    state.jump(1700);
    owner.sync();
    state.jump(2500);
    owner.sync();
    state.step(48);
    expect(state.top()).toBe(2500);
    state.step(64);
    expect(state.top()).toBe(2500);
    expect(state.factory).toHaveBeenCalledOnce();
  });
  it("R3 cancels inertia before the next RAF while preserving an existing modal stop", () => {
    const state = realScroller();
    state.actual.scrollTo(1000, { programmatic: false, lerp: 0.07 });
    state.step(16);
    state.step(32);
    document.body.style.overflow = "hidden";
    mutation();
    expect(state.actual.isStopped).toBe(true);
    const resume = vi.spyOn(state.actual, "start");
    state.jump(2500);
    owner.sync();
    expect(state.actual.isStopped).toBe(true);
    state.step(48);
    state.step(64);
    expect(state.top()).toBe(2500);
    expect(resume).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
  });
});

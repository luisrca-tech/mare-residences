import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMotion } from "./motionRuntime";
import { prepareTextReveal } from "./textReveal";
import { MOTION_PACING } from "./motionBootstrap";

let intersection: (entries: Partial<IntersectionObserverEntry>[]) => void;
let reduced = false;
let mediaChange: () => void;
let animations: {
  cancel: ReturnType<typeof vi.fn>;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
}[];
let runtime: ReturnType<typeof installMotion>;
let top = 1200;

function scene(key = "editorial", kind = "editorial") {
  const node = document.createElement("div");
  node.dataset.motionScene = key;
  node.dataset.motionKind = kind;
  node.innerHTML =
    '<p data-motion-part="heading">Label</p><h2 data-motion-part="heading">Title</h2><p data-motion-part="body">Body</p><a href="/contato">Contact</a>';
  document.body.append(node);
  return node;
}
function cross(node: Element | null) {
  if (!node) throw new Error("Missing actual motion target");
  top = 300;
  intersection([
    {
      target: node,
      isIntersecting: true,
      boundingClientRect: node.getBoundingClientRect(),
    },
  ]);
}

beforeEach(() => {
  intersection = () => {};
  reduced = false;
  top = 1200;
  animations = [];
  Object.defineProperty(window, "innerWidth", {
    value: 1440,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: 900,
    configurable: true,
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({
      top,
      bottom: top + 200,
      left: 0,
      right: 300,
      width: 300,
      height: 200,
      x: 0,
      y: top,
      toJSON() {},
    }),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, callback: () => void) => {
        mediaChange = callback;
      },
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: typeof intersection) {
        intersection = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { status: "loaded", check: () => true },
  });
  HTMLElement.prototype.animate = vi.fn((frames, options) => {
    const animation = {
      cancel: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      frames: frames as Keyframe[],
      options: options as KeyframeAnimationOptions,
      finished: new Promise(() => {}),
    };
    animations.push(animation);
    return animation as unknown as Animation;
  });
  runtime = installMotion();
});
afterEach(() => {
  runtime.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Maré motion lifecycle", () => {
  it("gives the next reading beat room after the heading instead of overlapping the whole paragraph immediately", () => {
    const node = scene("deliberate");
    runtime.scan(node, false);
    cross(node.querySelector("p"));
    const title = animations[0].options;
    const body = animations[2].options;
    expect(Number(title.duration)).toBeGreaterThanOrEqual(1000);
    expect(Number(body.delay)).toBeGreaterThanOrEqual(Number(title.duration));
    expect(Number(body.duration)).toBeGreaterThanOrEqual(900);
    expect(node.querySelector("a")?.tabIndex).toBe(0);
  });
  it("waits for the actual viewport crossing and never replays on reverse scroll", () => {
    const node = scene();
    runtime.scan(node, false);
    expect(animations).toHaveLength(0);
    cross(node.querySelector("p"));
    expect(animations).toHaveLength(3);
    expect(animations[0].options.duration).toBe(1200);
    expect(animations[2].options.delay).toBe(1400);
    top = -400;
    window.dispatchEvent(new Event("scroll"));
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    cross(node.querySelector("p"));
    expect(animations).toHaveLength(3);
  });

  it("does not hide previously painted content or wait for late fonts", () => {
    top = 100;
    runtime.scan(scene("painted", "hero"), false);
    expect(animations).toHaveLength(0);
    Object.defineProperty(document, "fonts", {
      value: { status: "loading", check: () => false },
    });
    runtime.scan(scene("late-font", "hero"), true);
    expect(animations).toHaveLength(0);
  });

  it("animates a fresh pre-paint Home as one heading group and delayed body", () => {
    top = 100;
    const node = scene("home", "hero");
    runtime.scan(node, true);
    expect(animations).toHaveLength(3);
    expect(animations[0].frames[0]).toEqual({
      opacity: 0,
      transform: "translateY(12px)",
    });
    expect(animations[0].options.duration).toBe(1200);
    expect(animations[2].options.delay).toBe(1400);
    expect(
      vi.mocked(HTMLElement.prototype.animate).mock.contexts,
    ).not.toContain(node.querySelector("a"));
  });

  it("settles the oldest story when a third starts, without delaying the third", () => {
    top = 100;
    const one = scene("one");
    const two = scene("two");
    const three = scene("three");
    runtime.scan(one, true);
    runtime.scan(two, true);
    runtime.scan(three, true);
    expect(animations).toHaveLength(9);
    expect(
      animations.slice(0, 3).every((a) => a.cancel.mock.calls.length === 1),
    ).toBe(true);
    expect(
      animations.slice(3).every((a) => a.cancel.mock.calls.length === 0),
    ).toBe(true);
  });

  it("uses the small profile for short desktop and mobile without scaling distance", () => {
    top = 100;
    Object.defineProperty(window, "innerHeight", {
      value: 719,
      configurable: true,
    });
    runtime.scan(scene("short", "hero"), true);
    expect(animations[0].options.duration).toBe(1200);
    expect(animations[0].frames[0].transform).toBe("translateY(6px)");
    expect(animations[2].options.delay).toBe(1400);
  });

  it("settles on focus, resize and live reduced motion and does not replay", () => {
    top = 100;
    const focused = scene("focus");
    runtime.scan(focused, true);
    const link = focused.querySelector("a");
    if (!link) throw new Error("Missing contact link");
    link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    runtime.scan(scene("resize"), true);
    window.dispatchEvent(new Event("resize"));
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    runtime.scan(scene("reduce"), true);
    reduced = true;
    mediaChange();
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    const count = animations.length;
    runtime.scan(scene("initial-reduce"), true);
    expect(animations).toHaveLength(count);
    reduced = false;
    mediaChange();
    expect(animations).toHaveLength(count);
  });

  it("restores history and real hash entries as final content", () => {
    top = 100;
    window.dispatchEvent(new PopStateEvent("popstate"));
    runtime.scan(scene("back", "hero"), true);
    expect(animations).toHaveLength(0);
    window.history.replaceState({}, "", "/#conteudo");
    runtime.scan(scene("hash", "hero"), true);
    expect(animations).toHaveLength(0);
    window.history.replaceState({}, "", "/");
  });

  it("cleans route-owned work on release and destroys listeners", () => {
    top = 100;
    const node = scene();
    runtime.scan(node, true);
    runtime.release(node);
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    cross(node.querySelector("p"));
    expect(animations).toHaveLength(3);
    runtime.destroy();
    window.dispatchEvent(new Event("resize"));
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
  });
  it("decodes photos before crossing and animates only the existing photo slot", async () => {
    const node = scene("photo");
    node.innerHTML =
      '<div data-motion-part="image"><img alt="Architecture"></div><p>Caption</p>';
    const image = node.querySelector("img");
    const slot = node.querySelector("div");
    if (!image || !slot) throw new Error("Missing photo slot");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 1408 });
    image.decode = vi.fn().mockResolvedValue(undefined);
    runtime.scan(node, false);
    await Promise.resolve();
    cross(slot);
    expect(animations).toHaveLength(1);
    expect(animations[0].frames).toEqual([
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)" },
    ]);
    expect(animations[0].options.duration).toBe(1400);
    expect(vi.mocked(HTMLElement.prototype.animate).mock.contexts).toEqual([
      slot,
    ]);
  });

  it("never starts a late curtain after an undecoded photo crosses", async () => {
    const node = scene("late-photo");
    node.innerHTML =
      '<div data-motion-part="image"><img alt="Architecture"></div>';
    const image = node.querySelector("img");
    const slot = node.querySelector("div");
    if (!image || !slot) throw new Error("Missing photo slot");
    Object.defineProperty(image, "complete", { value: false });
    image.decode = vi.fn().mockResolvedValue(undefined);
    runtime.scan(node, false);
    cross(slot);
    image.dispatchEvent(new Event("load"));
    await Promise.resolve();
    cross(slot);
    expect(animations).toHaveLength(0);
    expect(slot.dataset.motionState).toBe("settled");
  });

  it("keeps query-only and modified navigation from replaying a story", () => {
    top = 100;
    const first = scene("repeat");
    runtime.scan(first, true);
    runtime.release(first);
    const link = first.querySelector("a");
    if (!link) throw new Error("Missing link");
    link.href = "/?demo=error-once";
    link.dispatchEvent(
      new MouseEvent("click", { bubbles: true, ctrlKey: true }),
    );
    runtime.scan(scene("repeat"), true);
    expect(animations).toHaveLength(3);
    window.dispatchEvent(new PopStateEvent("popstate"));
    const fresh = document.createElement("a");
    fresh.href = "/bairro";
    document.body.append(fresh);
    fresh.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    runtime.scan(scene("new-explicit-entry", "hero"), true);
    expect(animations).toHaveLength(6);
  });

  it("settles visible work on background/pagehide and removes every subscription", () => {
    top = 100;
    runtime.scan(scene("hidden"), true);
    window.dispatchEvent(new Event("pagehide"));
    expect(animations.every((a) => a.cancel.mock.calls.length === 1)).toBe(
      true,
    );
    runtime.destroy();
    runtime = new Function(
      "pacing",
      "heading",
      "return (" + installMotion.toString() + ")(pacing, heading)",
    )(MOTION_PACING, prepareTextReveal);
    runtime.scan(scene("serialized", "hero"), true);
    expect(animations).toHaveLength(6);
  });
  it("keeps an editorial story running while its body remains in view", () => {
    top = 100;
    const node = scene("whole-story");
    runtime.scan(node, true);
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(
      function (this: HTMLElement) {
        const start = this.matches('[data-motion-part="body"]') ? 100 : -30;
        return {
          top: start,
          bottom: start + 27,
          left: 0,
          right: 300,
          width: 300,
          height: 27,
          x: 0,
          y: start,
          toJSON() {},
        };
      },
    );
    window.dispatchEvent(new Event("scroll"));
    expect(animations.every((a) => a.cancel.mock.calls.length === 0)).toBe(
      true,
    );
  });
});

describe("R1/R2 review regressions", () => {
  function photo(key = "review-photo") {
    const node = scene(key);
    node.innerHTML =
      '<div data-motion-part="image"><img alt="Architecture"></div><p>Caption</p><a href="/bairro">Explore</a>';
    const image = node.querySelector("img");
    const slot = node.querySelector("div");
    if (!image || !slot) throw new Error("Missing actual photo");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 1408 });
    image.decode = vi.fn().mockResolvedValue(undefined);
    return { node, image, slot };
  }

  it.each([
    { width: 1440, y: 850, crossing: 760 },
    { width: 390, y: 850, crossing: 805 },
  ])("R1 keeps a painted photo in the bottom viewport band static at width $width", async ({
    width,
    y,
    crossing,
  }) => {
    Object.defineProperty(window, "innerWidth", {
      value: width,
      configurable: true,
    });
    top = y;
    const { node, slot } = photo();
    runtime.scan(node, false);
    await Promise.resolve();
    expect(slot.dataset.motionState).toBe("settled");
    expect(slot.style.clipPath).toBe("");
    top = crossing;
    intersection([{ target: slot, isIntersecting: true }]);
    expect(animations).toHaveLength(0);
    expect(slot.style.clipPath).toBe("");
  });

  it("R1 prepares a decoded photo outside the real viewport before a slow crossing", async () => {
    const { node, slot } = photo();
    runtime.scan(node, false);
    await Promise.resolve();
    expect(slot.style.clipPath).toBe("inset(0 100% 0 0)");
    top = 880;
    window.dispatchEvent(new Event("scroll"));
    expect(slot.style.clipPath).toBe("inset(0 100% 0 0)");
    expect(animations).toHaveLength(0);
    top = 760;
    intersection([{ target: slot, isIntersecting: true }]);
    expect(animations).toHaveLength(1);
    expect(animations[0].frames[0]).toEqual({ clipPath: "inset(0 100% 0 0)" });
    expect(vi.mocked(HTMLElement.prototype.animate).mock.contexts).toEqual([
      slot,
    ]);
    expect(node.querySelector("a")?.style.transform).toBe("");
    expect(node.querySelector("p")?.style.clipPath).toBe("");
    runtime.release(node);
    expect(slot.style.clipPath).toBe("");
    expect(animations[0].cancel).toHaveBeenCalledOnce();
  });

  it.each([
    "scroll-before-decode",
    "observer-before-decode",
  ])("R1 never prepares or closes a visible photo after %s", async (delivery) => {
    let decode: () => void = () => {};
    const { node, image, slot } = photo();
    image.decode = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          decode = resolve;
        }),
    );
    runtime.scan(node, false);
    top = 850;
    if (delivery === "scroll-before-decode")
      window.dispatchEvent(new Event("scroll"));
    else {
      top = 760;
      intersection([{ target: slot, isIntersecting: true }]);
    }
    decode();
    await Promise.resolve();
    expect(slot.style.clipPath).toBe("");
    top = 760;
    intersection([{ target: slot, isIntersecting: true }]);
    expect(animations).toHaveLength(0);
    expect(slot.dataset.motionState).toBe("settled");
  });

  it.each([
    "focus",
    "resize",
    "reduce",
    "release",
  ])("R1 removes a prepared mask on %s without a late replay", async (interruption) => {
    const { node, slot } = photo();
    slot.style.clipPath = "inset(2px)";
    runtime.scan(node, false);
    await Promise.resolve();
    expect(slot.style.clipPath).toBe("inset(0 100% 0 0)");
    if (interruption === "focus") {
      const link = node.querySelector("a");
      if (!link) throw new Error("Missing actual action");
      link.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    } else if (interruption === "resize")
      window.dispatchEvent(new Event("resize"));
    else if (interruption === "reduce") {
      reduced = true;
      mediaChange();
    } else runtime.release(node);
    expect(slot.style.clipPath).toBe("inset(2px)");
    top = 760;
    intersection([{ target: slot, isIntersecting: true }]);
    expect(animations).toHaveLength(0);
  });

  it("R2 settles a completely skipped pending story before reverse crossing", () => {
    const node = scene("skipped-story");
    const target = node.querySelector("p");
    if (!target) throw new Error("Missing actual heading");
    runtime.scan(node, false);
    top = -500;
    window.dispatchEvent(new Event("scroll"));
    expect(target.dataset.motionState).toBe("settled");
    cross(target);
    expect(animations).toHaveLength(0);
  });

  it("R2 keeps a pending story below the viewport eligible", () => {
    const node = scene("still-below");
    const target = node.querySelector("p");
    if (!target) throw new Error("Missing actual heading");
    runtime.scan(node, false);
    top = 1000;
    window.dispatchEvent(new Event("scroll"));
    expect(target.dataset.motionState).toBe("pending");
    cross(target);
    expect(animations).toHaveLength(3);
  });
});

describe("v3 root handoff", () => {
  it("prepares once under a cover and resumes without restarting its animation", () => {
    top = 100;
    const node = scene("root-held", "hero");
    runtime.scan(node, true, { paused: true });
    const animation = vi.mocked(HTMLElement.prototype.animate).mock.results[0]
      .value;
    expect(animation.pause).toHaveBeenCalledOnce();
    runtime.resume(node);
    expect(animation.play).toHaveBeenCalledOnce();
    expect(animations).toHaveLength(3);
  });
  it("leaves a Hero photo visible when the global curtain already reveals it", async () => {
    top = 100;
    const node = scene("intro-photo", "hero");
    node.innerHTML =
      '<div data-motion-part="image"><img alt="Architecture"></div>';
    const image = node.querySelector("img");
    if (!image) throw new Error("Missing photo");
    Object.defineProperty(image, "complete", { value: true });
    Object.defineProperty(image, "naturalWidth", { value: 1408 });
    image.decode = vi.fn().mockResolvedValue(undefined);
    runtime.scan(node, true, { skipVisiblePhoto: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(animations).toHaveLength(0);
  });
  it("uses one fallback opening profile rather than double-animating a heading", () => {
    top = 100;
    runtime.scan(scene("fallback-home", "hero"), true, { fallback: true });
    expect(animations[0].options.duration).toBe(1200);
    expect(animations[0].frames[0]).toEqual({
      opacity: 0,
      transform: "translateY(12px)",
    });
    expect(animations).toHaveLength(3);
  });
});

it.each([
  40, 3010,
])("joins a section photo to its editorial clock with arrival at%s", async (arrival) => {
  const callbacks = new Map<
    Element,
    (entries: Partial<IntersectionObserverEntry>[]) => void
  >();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        private callback: (
          entries: Partial<IntersectionObserverEntry>[],
        ) => void,
      ) {}
      observe(node: Element) {
        callbacks.set(node, this.callback);
      }
      disconnect() {}
    },
  );
  const node = scene("chapter");
  const slot = document.createElement("div");
  slot.dataset.motionPart = "image";
  slot.innerHTML = '<img alt="Architecture">';
  node.append(slot);
  const image = slot.querySelector("img");
  const heading = node.querySelector("p");
  if (!image || !heading) throw new Error("Missing actual narrative surface");
  Object.defineProperty(image, "complete", { value: true });
  Object.defineProperty(image, "naturalWidth", { value: 1408 });
  image.decode = vi.fn().mockResolvedValue(undefined);
  const clock = vi.spyOn(performance, "now").mockReturnValue(10);
  runtime.scan(node, false);
  await Promise.resolve();
  top = 300;
  callbacks.get(heading)?.([{ target: heading, isIntersecting: true }]);
  expect(animations).toHaveLength(3);
  clock.mockReturnValue(arrival);
  callbacks.get(slot)?.([{ target: slot, isIntersecting: true }]);
  expect(animations).toHaveLength(4);
  expect(animations[3].options.delay).toBe(Math.max(0, 2410 - arrival));
  if (arrival < 2410)
    expect(arrival + Number(animations[3].options.delay)).toBe(
      10 +
        Number(animations[2].options.delay) +
        Number(animations[2].options.duration),
    );
});

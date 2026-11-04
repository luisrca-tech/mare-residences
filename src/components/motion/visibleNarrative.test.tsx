import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installMotion } from "./motionRuntime";
import { bootstrapMotion } from "./motionBootstrap";
import { MOTION_PACING } from "./motionBootstrap";
import { createSiteMotion } from "./siteMotion";

let runtime: ReturnType<typeof installMotion>;
let controller: ReturnType<typeof createSiteMotion> | undefined;
let fonts: { status: string; ready: Promise<void>; check: () => boolean };
let ready: () => void;
let reduced = false;
let preferences: (() => void)[];
let clock = 0;
let base = 1200;
let secondBase = 2400;
let coverBottom = 900;
let callbacks: Map<Element, IntersectionObserverCallback>;
let animations: {
  node: HTMLElement;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  finish: () => void;
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
}[];
let frames: Map<number, FrameRequestCallback>;

function part(root: ParentNode, selector: string) {
  const node = root.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`Missing fixture element: ${selector}`);
  return node;
}
function story(key = "one") {
  const node = document.createElement("div");
  node.dataset.motionScene = key;
  node.dataset.motionNarrative = "visible";
  node.innerHTML =
    '<p data-motion-part="label">Residences</p><h2 data-motion-part="heading">A home beside the sea</h2><p data-motion-part="body">A complete explanation.</p><ul data-motion-part="list"><li>One complete fact</li></ul><a href="/contato">Contact</a><figcaption data-motion-part="caption">Architecture</figcaption>';
  document.body.append(node);
  return node;
}
function cross(element: Element) {
  callbacks.get(element)?.(
    [
      {
        target: element,
        isIntersecting: true,
        intersectionRatio: 1,
      } as unknown as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
}
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

it.each([
  1, 2, 3,
])("keeps the legacy configurable reading gap after a %i-line title", async (lineCount) => {
  runtime.destroy();
  const readingGap = 340;
  runtime = installMotion({
    ...MOTION_PACING,
    readingGap,
    bodyBeat: 0,
  } as unknown as typeof MOTION_PACING);
  const descriptor = Object.getOwnPropertyDescriptor(
    Range.prototype,
    "getBoundingClientRect",
  );
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      const bounds = this.startContainer.parentElement?.getBoundingClientRect();
      if (!bounds) throw new Error("Missing measured source");
      const top =
        bounds.top +
        Math.min(lineCount - 1, Math.floor(this.startOffset / 4)) * 32;
      return {
        top,
        bottom: top + 24,
        left: 0,
        right: 100,
        width: 100,
        height: 24,
      };
    },
  });
  try {
    const node = story();
    delete node.dataset.motionNarrative;
    part(node, "h2").textContent = "One Two Six";
    runtime.scan(node, false);
    base = 100;
    cross(part(node, "h2"));
    const lines = animations.filter((a) =>
      a.node.hasAttribute("data-motion-line"),
    );
    expect(lines).toHaveLength(lineCount);
    const body = animations.find((a) => a.node.dataset.motionPart === "body");
    expect(Number(body?.options.delay)).toBe(
      Number(lines.at(-1)?.options.delay) +
        Number(lines.at(-1)?.options.duration) +
        readingGap,
    );
    for (const a of animations) a.finish();
    await flush();
    expect(node.querySelector("[data-motion-lines]")).toBeNull();
    expect(part(node, "h2").textContent).toBe("One Two Six");
  } finally {
    if (descriptor)
      Object.defineProperty(
        Range.prototype,
        "getBoundingClientRect",
        descriptor,
      );
    else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  }
});

it("overlaps the action a short beat after a list arriving later than its body", () => {
  const node = story();
  const list = part(node, "ul");
  const action = part(node, "a");
  let lowerTop = 1200;
  for (const target of [list, action])
    Object.defineProperty(target, "getBoundingClientRect", {
      value: () => ({
        top: lowerTop,
        bottom: lowerTop + 60,
        height: 60,
        left: 0,
        right: 400,
        width: 400,
      }),
    });
  runtime.scan(node, false);
  base = 100;
  cross(part(node, "h2"));
  clock = 8000;
  lowerTop = 300;
  cross(list);
  cross(action);
  const listEntry = animations.find((a) => a.node === list);
  const actionEntry = animations.find((a) => a.node === action);
  expect(listEntry?.options.delay).toBe(0);
  expect(Number(actionEntry?.options.delay)).toBe(MOTION_PACING.grouped.beat);
  expect(Number(actionEntry?.options.delay)).toBeLessThan(
    Number(listEntry?.options.duration),
  );
});

function mediaStory(decode = () => Promise.resolve()) {
  const node = story();
  const caption = part(node, "figcaption");
  const photo = document.createElement("div");
  photo.dataset.motionPart = "image";
  photo.innerHTML = "<img alt='Architecture'>";
  caption.before(photo);
  const img = photo.querySelector("img") as HTMLImageElement;
  Object.defineProperty(img, "complete", { value: true });
  Object.defineProperty(img, "naturalWidth", { value: 800 });
  img.decode = decode;
  let photoTop = 1200;
  let captionTop = 1650;
  for (const target of [photo, caption])
    Object.defineProperty(target, "getBoundingClientRect", {
      value: () => {
        const top = target === photo ? photoTop : captionTop;
        const height = target === photo ? 400 : 60;
        return {
          top,
          bottom: top + height,
          height,
          left: 0,
          right: 400,
          width: 400,
          x: 0,
          y: top,
          toJSON() {},
        };
      },
    });
  return {
    node,
    photo,
    caption,
    place(image: number, text: number) {
      photoTop = image;
      captionTop = text;
    },
  };
}

it.each(
  [1, 3].flatMap((lines) =>
    ["text-first", "image-first"].map((order) => ({ lines, order })),
  ),
)("overlaps grouped title/media/support/action with $lines lines in $order order", async ({
  lines: lineCount,
  order,
}) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Range.prototype,
    "getBoundingClientRect",
  );
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      const bounds = this.startContainer.parentElement?.getBoundingClientRect();
      if (!bounds) throw new Error("Missing measured source");
      const top =
        bounds.top +
        Math.min(lineCount - 1, Math.floor(this.startOffset / 4)) * 32;
      return {
        top,
        bottom: top + 24,
        left: 0,
        right: 100,
        width: 100,
        height: 24,
      };
    },
  });
  try {
    const { node, photo, caption, place } = mediaStory();
    part(node, "ul").remove();
    part(node, "h2").textContent = "One Two Six";
    runtime.scan(node, false);
    await flush();
    expect(animations).toHaveLength(0);
    base = 100;
    place(100, 550);
    if (order === "image-first") cross(photo);
    cross(part(node, "h2"));
    if (order === "text-first") cross(photo);
    const titles = animations.filter((a) =>
      a.node.hasAttribute("data-motion-line"),
    );
    const media = animations.find((a) => a.node === photo);
    const body = animations.find((a) => a.node.dataset.motionPart === "body");
    const action = animations.find((a) => a.node.tagName === "A");
    const text = animations.find((a) => a.node === caption);
    expect(titles).toHaveLength(lineCount);
    expect(media && body && action && text).toBeTruthy();
    const titleStart = Number(titles[0].options.delay);
    expect(
      Math.abs(Number(media?.options.delay) - titleStart),
    ).toBeLessThanOrEqual(120);
    expect(Number(body?.options.delay) - titleStart).toBeGreaterThanOrEqual(
      100,
    );
    expect(Number(body?.options.delay) - titleStart).toBeLessThanOrEqual(160);
    expect(
      Number(action?.options.delay) - Number(body?.options.delay),
    ).toBeGreaterThanOrEqual(100);
    expect(
      Number(action?.options.delay) - Number(body?.options.delay),
    ).toBeLessThanOrEqual(160);
    expect(Number(body?.options.delay)).toBeLessThan(
      titleStart + Number(titles[0].options.duration),
    );
    expect(Number(action?.options.delay)).toBeLessThan(
      Number(body?.options.delay) + Number(body?.options.duration),
    );
    expect(Number(text?.options.delay)).toBeGreaterThanOrEqual(
      Number(media?.options.delay) + Number(media?.options.duration),
    );
    for (const animation of animations) animation.finish();
    await flush();
    expect(node.querySelector("[data-motion-lines]")).toBeNull();
    expect(caption.style.opacity).toBe("");
  } finally {
    if (descriptor)
      Object.defineProperty(
        Range.prototype,
        "getBoundingClientRect",
        descriptor,
      );
    else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  }
});

it.each([
  "text-first",
  "image-first",
])("waits for a late photograph before its caption in %s callback order", async (order) => {
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false);
  await flush();
  base = 100;
  cross(part(node, "h2"));
  for (const animation of animations) animation.finish();
  await flush();
  clock = 8000;
  place(100, 550);
  if (order === "text-first") {
    cross(caption);
    expect(animations.filter((a) => a.node === caption)).toHaveLength(0);
  }
  cross(photo);
  if (order === "image-first") cross(caption);
  const media = animations.find((a) => a.node === photo);
  const text = animations.find((a) => a.node === caption);
  expect(media).toBeDefined();
  expect(text).toBeDefined();
  expect(Number(text?.options.delay)).toBe(
    Number(media?.options.delay) + Number(media?.options.duration),
  );
});

it("keeps an offscreen mobile photo unspent while eligible reading groups overlap", async () => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 425,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 844,
  });
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false);
  await flush();
  base = 100;
  cross(part(node, "h2"));
  const body = animations.find((a) => a.node.dataset.motionPart === "body");
  const action = animations.find((a) => a.node.tagName === "A");
  expect(Number(action?.options.delay)).toBeLessThan(
    Number(body?.options.delay) + Number(body?.options.duration),
  );
  expect(animations.some((a) => a.node === photo)).toBe(false);
  expect(caption.style.opacity).toBe("0");
  clock = 8000;
  place(100, 550);
  cross(photo);
  cross(caption);
  const media = animations.find((a) => a.node === photo);
  const text = animations.find((a) => a.node === caption);
  expect(media?.options.delay).toBe(0);
  expect(Number(text?.options.delay)).toBeGreaterThanOrEqual(
    Number(media?.options.duration),
  );
});

it("keeps title and photo alive in two adjacent grouped stories and retires the oldest whole story on a third", async () => {
  const one = mediaStory();
  const two = mediaStory();
  two.node.dataset.motionScene = "two";
  const third = story("three");
  runtime.scan(document, false);
  await flush();
  base = 100;
  secondBase = 100;
  for (const item of [one, two]) {
    item.place(100, 550);
    cross(part(item.node, "h2"));
    cross(item.photo);
  }
  const first = animations.filter((a) => one.node.contains(a.node));
  const second = animations.filter((a) => two.node.contains(a.node));
  expect(first.length).toBeGreaterThan(0);
  expect(second.length).toBeGreaterThan(0);
  expect(first.every((a) => a.cancel.mock.calls.length === 0)).toBe(true);
  expect(second.every((a) => a.cancel.mock.calls.length === 0)).toBe(true);
  cross(part(third, "h2"));
  expect(first.every((a) => a.cancel.mock.calls.length === 1)).toBe(true);
  expect(second.every((a) => a.cancel.mock.calls.length === 0)).toBe(true);
});

it("does not spend a paused photograph clock before its real handoff", async () => {
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false, { paused: true });
  await flush();
  base = 100;
  place(100, 550);
  cross(part(node, "h2"));
  cross(caption);
  cross(photo);
  clock = 8000;
  runtime.resume(node, "text");
  expect(animations.filter((a) => a.node === caption)).toHaveLength(0);
  clock = 9000;
  runtime.resume(node, "image");
  const text = animations.find((a) => a.node === caption);
  expect(text).toBeDefined();
  // The photo's original delay is paused too, then its entire curtain runs.
  const media = animations.find((a) => a.node === photo);
  expect(Number(text?.options.delay)).toBe(
    Number(media?.options.delay) + Number(media?.options.duration),
  );
});

it("keeps the caption's own crossing after an earlier completed photo", async () => {
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false);
  await flush();
  base = 100;
  cross(part(node, "h2"));
  clock = 8000;
  place(100, 1600);
  cross(photo);
  expect(animations.some((a) => a.node === caption)).toBe(false);
  clock = 9400;
  animations.find((a) => a.node === photo)?.finish();
  await flush();
  expect(animations.some((a) => a.node === caption)).toBe(false);
  expect(caption.style.opacity).toBe("0");
  clock = 12000;
  place(-500, 100);
  cross(caption);
  const text = animations.find((a) => a.node === caption);
  expect(text?.options.delay).toBe(0);
  text?.finish();
  await flush();
  expect(caption.style.opacity).toBe("");
});

it("unblocks a waiting caption when a paused curtain is cancelled", async () => {
  const { node, photo, caption, place } = mediaStory();
  const animate = photo.animate.bind(photo);
  let cancelPhoto = () => {};
  Object.defineProperty(photo, "animate", {
    value: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = animate(keyframes, options);
      const finished = new Promise<void>((_, reject) => {
        cancelPhoto = () =>
          reject(new Error("Controlled external cancellation"));
      });
      return { ...animation, finished };
    },
  });
  runtime.scan(node, false, { paused: true });
  await flush();
  base = 100;
  place(100, 550);
  cross(part(node, "h2"));
  cross(caption);
  cross(photo);
  clock = 8000;
  runtime.resume(node, "text");
  expect(animations.some((a) => a.node === caption)).toBe(false);
  cancelPhoto();
  await flush();
  expect(photo.dataset.motionState).toBe("settled");
  expect(photo.style.clipPath).toBe("");
  const text = animations.find((a) => a.node === caption);
  expect(text).toBeDefined();
  text?.finish();
  await flush();
  expect(caption.style.opacity).toBe("");
});

it.each([
  "decode-pending",
  "decode-error",
  "animation-error",
  "static",
])("releases a crossed caption when its photo uses %s fallback", async (mode) => {
  const decode =
    mode === "decode-pending"
      ? () => new Promise<void>(() => {})
      : mode === "decode-error"
        ? () => Promise.reject(new Error("Controlled decode failure"))
        : () => Promise.resolve();
  const { node, photo, caption, place } = mediaStory(decode);
  if (mode === "static") place(800, 1650);
  runtime.scan(node, false);
  await flush();
  base = 100;
  cross(part(node, "h2"));
  clock = 8000;
  place(100, 550);
  cross(caption);
  if (mode !== "static")
    expect(animations.some((a) => a.node === caption)).toBe(false);
  if (mode === "animation-error")
    Object.defineProperty(photo, "animate", {
      value: () => {
        throw new Error("Controlled animation failure");
      },
    });
  cross(photo);
  await flush();
  expect(photo.dataset.motionState).toBe("settled");
  expect(photo.style.clipPath).toBe("");
  const text = animations.find((a) => a.node === caption);
  expect(text).toBeDefined();
  expect(text?.options.delay).toBe(0);
  text?.finish();
  await flush();
  expect(caption.style.opacity).toBe("");
});

it.each([
  "reduce",
  "focus",
  "resize",
  "hash",
  "release",
  "destroy",
])("restores a caption waiting on its photo after %s without late re-hiding", async (cause) => {
  let decodeReady = () => {};
  const { node, photo, caption, place } = mediaStory(
    () =>
      new Promise<void>((resolve) => {
        decodeReady = resolve;
      }),
  );
  runtime.scan(node, false);
  base = 100;
  cross(part(node, "h2"));
  clock = 8000;
  place(100, 550);
  cross(caption);
  expect(caption.style.opacity).toBe("0");
  expect(animations.some((a) => a.node === caption)).toBe(false);
  if (cause === "reduce") {
    reduced = true;
    for (const callback of preferences) callback();
  } else if (cause === "focus") part(node, "a").focus();
  else if (cause === "release") runtime.release(node);
  else if (cause === "destroy") runtime.destroy();
  else
    window.dispatchEvent(new Event(cause === "hash" ? "hashchange" : "resize"));
  expect(caption.style.opacity).toBe("");
  decodeReady();
  await flush();
  cross(photo);
  expect(caption.style.opacity).toBe("");
  expect(photo.style.clipPath).toBe("");
  expect(animations.some((a) => a.node === caption)).toBe(false);
});

beforeEach(() => {
  vi.useFakeTimers();
  base = 1200;
  secondBase = 2400;
  coverBottom = 900;
  clock = 0;
  reduced = false;
  callbacks = new Map();
  animations = [];
  frames = new Map();
  preferences = [];
  history.replaceState({}, "", "/");
  sessionStorage.clear();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1440,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 900,
  });
  fonts = {
    status: "loaded",
    ready: new Promise<void>((done) => {
      ready = done;
    }),
    check: () => true,
  };
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: fonts,
  });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([]);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, cb: () => void) => preferences.push(cb),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = frames.size + 1;
    frames.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        callbacks.set(target, this.callback);
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const offset = this.closest('[data-motion-scene="two"]')
        ? secondBase
        : base;
      const order = [
        "label",
        "heading",
        "body",
        "list",
        undefined,
        "caption",
      ].indexOf(this.dataset.motionPart);
      const top =
        this.id === "mare-intro"
          ? coverBottom - 900
          : offset + Math.max(0, order) * 70;
      return {
        top,
        bottom: this.id === "mare-intro" ? coverBottom : top + 60,
        left: 0,
        right: 500,
        width: 500,
        height: 60,
        x: 0,
        y: top,
        toJSON() {},
      };
    },
  );
  HTMLElement.prototype.animate = vi.fn(function (
    this: HTMLElement,
    keyframes,
    options,
  ) {
    let finish = () => {};
    const finished = new Promise<void>((done) => {
      finish = done;
    });
    const item = {
      node: this,
      frames: keyframes as Keyframe[],
      options: options as KeyframeAnimationOptions,
      finish,
      cancel: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
    };
    animations.push(item);
    return { ...item, finished } as unknown as Animation;
  });
  runtime = installMotion();
});
afterEach(() => {
  controller?.destroy();
  controller = undefined;
  runtime.destroy();
  const host = window as Window & {
    __mareIntro?: { timer: number; savePosition: () => void };
  };
  if (host.__mareIntro) {
    clearTimeout(host.__mareIntro.timer);
    window.removeEventListener("pagehide", host.__mareIntro.savePosition);
  }
  delete host.__mareIntro;
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("conceals offscreen story text before its own crossing without removing layout or semantics", () => {
  const node = story();
  runtime.scan(node, false);
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
  expect(node.querySelector("h2")?.textContent).toContain(
    "A home beside the sea",
  );
  expect(node.querySelector("a")?.tabIndex).toBe(0);
  expect(node.hasAttribute("hidden")).toBe(false);
  expect(animations).toHaveLength(0);
  base = 100;
  cross(part(node, "h2"));
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.some((a) => a.frames[0]?.opacity === 0)).toBe(true);
});

it("keeps crossed text pending for delayed fonts and starts when readiness resolves", async () => {
  fonts.status = "loading";
  const node = story();
  runtime.scan(node, false);
  base = 100;
  cross(part(node, "h2"));
  expect(node.querySelector<HTMLElement>("h2")?.dataset.motionState).toBe(
    "pending",
  );
  expect(animations).toHaveLength(0);
  fonts.status = "loaded";
  ready();
  await flush();
  expect(node.querySelector<HTMLElement>("h2")?.dataset.motionState).toBe(
    "running",
  );
  expect(animations.length).toBeGreaterThan(0);
});

it("does not settle future sections when the first section enters", () => {
  const one = story();
  const two = story("two");
  runtime.scan(document, false);
  base = 100;
  cross(part(one, "h2"));
  expect(
    two.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
  expect(animations.some((a) => two.contains(a.node))).toBe(false);
});

it.each([
  "resize",
  "hidden-visible",
  "reduce-on-off",
])("keeps the next unread story eligible after %s while preserving exposed copy", (event) => {
  const one = story();
  const two = story("two");
  controller = createSiteMotion({
    runtime,
    navigate: vi.fn(),
    syncScroll: vi.fn(),
  });
  base = 100;
  cross(part(one, "h2"));
  if (event === "resize") window.dispatchEvent(new Event("resize"));
  else if (event === "hidden-visible") {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  } else {
    reduced = true;
    for (const callback of preferences) callback();
    expect(part(two, "p[data-motion-part='body']").style.opacity).toBe("");
    reduced = false;
    for (const callback of preferences) callback();
  }
  expect(part(one, "p[data-motion-part='body']").style.opacity).toBe("");
  expect(part(two, "h2").dataset.motionState).toBe("pending");
  expect(part(two, "p[data-motion-part='body']").style.opacity).toBe("0");
  expect(animations.some((a) => two.contains(a.node))).toBe(false);
  secondBase = 100;
  cross(part(two, "h2"));
  expect(animations.some((a) => two.contains(a.node))).toBe(true);
});

it.each([
  "deadline",
  "late-hydration",
  "reload-warm",
  "reload-cold",
])("retains future section motion through Home %s without hiding exposed ink", async (entry) => {
  base = 100;
  const hero = story();
  hero.dataset.motionScene = "home-hero";
  hero.dataset.motionKind = "hero";
  const next = story("two");
  const panel = document.createElement("div");
  panel.id = "mare-intro";
  panel.innerHTML = "<span data-intro-wordmark>maré</span>";
  document.body.prepend(panel);
  if (entry.startsWith("reload")) {
    vi.mocked(performance.getEntriesByType).mockImplementation((type) =>
      type === "navigation"
        ? [{ type: "reload" } as unknown as PerformanceEntry]
        : [],
    );
    sessionStorage.setItem(
      "mare-motion-position",
      JSON.stringify({ pathname: "/", scrollY: 0 }),
    );
  }
  if (entry === "reload-cold") fonts.status = "loading";
  bootstrapMotion();
  if (entry === "late-hydration") {
    clock = 8000;
    vi.advanceTimersByTime(8000);
  }
  controller = createSiteMotion({
    runtime,
    navigate: vi.fn(),
    syncScroll: vi.fn(),
  });
  if (entry === "deadline") {
    clock = 7000;
    vi.advanceTimersByTime(7000);
  } else if (entry.startsWith("reload")) {
    fonts.status = "loaded";
    ready();
    await flush();
    coverBottom = 0;
    for (const callback of [...frames.values()]) callback(clock);
    animations.find((a) => a.node === panel)?.finish();
    await flush();
  }
  expect(part(next, "h2").dataset.motionState).toBe("pending");
  expect(part(next, '[data-motion-part="body"]').style.opacity).toBe("0");
  if (entry === "late-hydration" || entry === "deadline")
    expect(part(hero, '[data-motion-part="body"]').style.opacity).toBe("");
  secondBase = 100;
  cross(part(next, "h2"));
  expect(animations.some((a) => next.contains(a.node))).toBe(true);
});

it("allows unread content to enter after an initially reduced preference is disabled", () => {
  reduced = true;
  const node = story();
  runtime.scan(node, false);
  expect(part(node, '[data-motion-part="body"]').style.opacity).toBe("");
  reduced = false;
  for (const callback of preferences) callback();
  expect(part(node, '[data-motion-part="body"]').style.opacity).toBe("0");
  base = 100;
  cross(part(node, "h2"));
  expect(animations.length).toBeGreaterThan(0);
});

it.each([
  { initiallyReduced: false, reverseBeforeToggle: false },
  { initiallyReduced: true, reverseBeforeToggle: false },
  { initiallyReduced: true, reverseBeforeToggle: true },
])("preserves exposed CTA ink and recovers an unread body after reduced=$initiallyReduced, reverse=$reverseBeforeToggle", async ({
  initiallyReduced,
  reverseBeforeToggle,
}) => {
  history.replaceState({}, "", "/residencias");
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 425,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 844,
  });
  reduced = initiallyReduced;
  base = 100;
  const node = story("contact-cta");
  part(node, "ul").remove();
  part(node, "figcaption").remove();
  const heading = part(node, "h2");
  const body = part(node, '[data-motion-part="body"]');
  const action = part(node, "a");
  let lowerTop = 1000;
  for (const target of [body, action])
    Object.defineProperty(target, "getBoundingClientRect", {
      value: () => ({
        top: lowerTop,
        bottom: lowerTop + 60,
        height: 60,
        left: 0,
        right: 300,
        width: 300,
      }),
    });
  runtime.scan(node, false);
  expect(heading.style.opacity).toBe("");
  expect(body.style.opacity).toBe(initiallyReduced ? "" : "0");
  expect(animations).toHaveLength(0);
  if (reverseBeforeToggle) base = 1200;
  reduced = false;
  for (const callback of preferences) callback();
  expect(heading.style.opacity).toBe("");
  expect(heading.querySelector("[data-motion-lines]")).toBeNull();
  expect(body.style.opacity).toBe("0");
  expect(animations).toHaveLength(0);
  clock = 8000;
  lowerTop = 300;
  cross(body);
  const entrance = animations.find((a) => a.node === body);
  expect(entrance).toBeDefined();
  expect(entrance?.frames[0].opacity).toBe(0);
  expect(animations.some((a) => a.node === heading)).toBe(false);
  for (const animation of animations) animation.finish();
  await flush();
  expect(body.style.opacity).toBe("");
  expect(heading.style.opacity).toBe("");
});

it("retains unread lower copy within a partially read story after resize", async () => {
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false);
  await flush();
  base = 100;
  cross(part(node, "h2"));
  const headingEntrances = animations.filter(
    (a) => a.node === part(node, "h2"),
  ).length;
  window.dispatchEvent(new Event("resize"));
  await flush();
  expect(part(node, "h2").style.opacity).toBe("");
  expect(caption.style.opacity).toBe("0");
  base = 1200;
  place(1400, 2000);
  window.dispatchEvent(new Event("resize"));
  await flush();
  expect(part(node, "h2").style.opacity).toBe("");
  expect(node.querySelector("[data-motion-lines]")).toBeNull();
  base = 100;
  clock = 8000;
  place(100, 550);
  cross(caption);
  cross(photo);
  expect(animations.filter((a) => a.node === part(node, "h2"))).toHaveLength(
    headingEntrances,
  );
  expect(animations.some((a) => a.node === caption)).toBe(true);
});

it.each([
  "text-first",
  "image-first",
])("preserves R7 and fresh photo geometry after unread resize in %s order", async (order) => {
  const { node, photo, caption, place } = mediaStory();
  runtime.scan(node, false);
  await flush();
  window.dispatchEvent(new Event("resize"));
  await flush();
  expect(photo.style.clipPath).toBe("inset(0 100% 0 0)");
  base = 100;
  cross(part(node, "h2"));
  clock = 8000;
  place(100, 550);
  if (order === "text-first") cross(caption);
  cross(photo);
  if (order === "image-first") cross(caption);
  const media = animations.find((a) => a.node === photo);
  const text = animations.find((a) => a.node === caption);
  expect(media).toBeDefined();
  expect(text).toBeDefined();
  expect(Number(text?.options.delay)).toBeGreaterThanOrEqual(
    Number(media?.options.delay) + Number(media?.options.duration),
  );
});

it("remeasures an unread heading after resize without re-hiding exposed heading ink", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Range.prototype,
    "getBoundingClientRect",
  );
  let lineCount = 1;
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      const bounds = this.startContainer.parentElement?.getBoundingClientRect();
      if (!bounds) throw new Error("Missing source");
      const top =
        bounds.top +
        Math.min(lineCount - 1, Math.floor(this.startOffset / 4)) * 32;
      return {
        top,
        bottom: top + 24,
        left: 0,
        right: 100,
        width: 100,
        height: 24,
      };
    },
  });
  try {
    const one = story();
    const two = story("two");
    part(two, "h2").textContent = "One Two Six";
    runtime.scan(document, false);
    base = 100;
    cross(part(one, "h2"));
    lineCount = 3;
    window.dispatchEvent(new Event("resize"));
    expect(one.querySelector("[data-motion-lines]")).toBeNull();
    expect(two.querySelectorAll("[data-motion-line]")).toHaveLength(3);
    secondBase = 100;
    cross(part(two, "h2"));
    expect(
      animations.filter(
        (a) => two.contains(a.node) && a.node.hasAttribute("data-motion-line"),
      ),
    ).toHaveLength(3);
  } finally {
    if (descriptor)
      Object.defineProperty(
        Range.prototype,
        "getBoundingClientRect",
        descriptor,
      );
    else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  }
});

it("measures line masks after fonts and staggers the title before its explanation", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Range.prototype,
    "getBoundingClientRect",
  );
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: Range) {
      const parent = this.startContainer.parentElement;
      if (!parent) throw new Error("Missing measured source");
      const bounds = parent.getBoundingClientRect();
      return {
        top: bounds.top + (this.startOffset < 12 ? 0 : 32),
        left: bounds.left,
        width: 180,
        height: 24,
        bottom: bounds.top + 24,
      };
    },
  });
  try {
    const node = story();
    runtime.scan(node, false);
    const fragments = [
      ...node.querySelectorAll<HTMLElement>("[data-motion-line]"),
    ];
    expect(fragments).toHaveLength(2);
    expect(
      fragments.every((x) => x.style.transform === "translateY(115%)"),
    ).toBe(true);
    expect(animations).toHaveLength(0);
    base = 100;
    cross(part(node, "h2"));
    const lines = animations.filter((a) =>
      a.node.hasAttribute("data-motion-line"),
    );
    expect(lines).toHaveLength(2);
    expect(
      Number(lines[1].options.delay) - Number(lines[0].options.delay),
    ).toBe(80);
    const body = animations.find((a) => a.node.dataset.motionPart === "body");
    if (!body) throw new Error("Missing body entrance");
    expect(Number(body.options.delay)).toBeGreaterThan(
      Number(lines[0].options.delay),
    );
    expect(Number(body.options.delay)).toBeLessThan(
      Number(lines[0].options.delay) + Number(lines[0].options.duration),
    );
    const action = animations.find((a) => a.node.tagName === "A");
    if (!action) throw new Error("Missing action entrance");
    expect(Number(action.options.delay)).toBeGreaterThan(
      Number(body.options.delay),
    );
    for (const animation of animations) animation.finish();
    await flush();
    expect(node.querySelector("[data-motion-lines]")).toBeNull();
    expect(node.querySelector("h2")?.textContent).toBe("A home beside the sea");
    expect(node.querySelector("h2")?.style.color).toBe("");
  } finally {
    if (descriptor)
      Object.defineProperty(
        Range.prototype,
        "getBoundingClientRect",
        descriptor,
      );
    else Reflect.deleteProperty(Range.prototype, "getBoundingClientRect");
  }
});

it("waits for a meaningful viewport intersection instead of treating any observer callback as entrance", () => {
  const node = story();
  runtime.scan(node, false);
  const title = part(node, "h2");
  base = 100;
  callbacks.get(title)?.(
    [
      {
        target: title,
        isIntersecting: true,
        intersectionRatio: 0.05,
      } as unknown as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
  expect(animations).toHaveLength(0);
  cross(title);
  expect(animations.length).toBeGreaterThan(0);
});

it("keeps a lower action concealed until its own crossing and consumes elapsed story time", () => {
  const node = story();
  const anchor = part(node, "a");
  let actionTop = 1200;
  Object.defineProperty(anchor, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        top: actionTop,
        bottom: actionTop + 52,
        left: 0,
        right: 230,
        width: 230,
        height: 52,
      }) as DOMRect,
  });
  runtime.scan(node, false);
  base = 100;
  cross(part(node, "h2"));
  expect(animations.some((a) => a.node === anchor)).toBe(false);
  expect(anchor.style.opacity).toBe("0");
  clock = 6000;
  actionTop = 300;
  cross(anchor);
  const entrance = animations.find((a) => a.node === anchor);
  expect(entrance).toBeDefined();
  expect(entrance?.options.delay).toBe(0);
});

it("does not expire normal prepared sections while the visitor reads an earlier section", () => {
  const node = story();
  runtime.scan(node, false);
  vi.advanceTimersByTime(30000);
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
  expect(animations).toHaveLength(0);
});

it.each([
  "focus",
  "reduce",
  "resize",
  "hash",
  "history",
  "skip",
  "release",
])("preserves safe source state on %s through late font continuations", async (reason) => {
  fonts.status = "loading";
  const node = story();
  runtime.scan(node, false);
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
  if (reason === "focus")
    part(node, "a").dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  if (reason === "reduce") {
    reduced = true;
    for (const callback of preferences) callback();
  }
  if (reason === "resize") window.dispatchEvent(new Event("resize"));
  if (reason === "hash") window.dispatchEvent(new Event("hashchange"));
  if (reason === "history") window.dispatchEvent(new PopStateEvent("popstate"));
  if (reason === "skip") {
    base = -2000;
    window.dispatchEvent(new Event("scroll"));
  }
  if (reason === "release") runtime.release(node);
  fonts.status = "loaded";
  ready();
  await flush();
  if (reason === "resize") {
    expect(part(node, '[data-motion-part="body"]').style.opacity).toBe("0");
    expect(animations).toHaveLength(0);
    base = 100;
    cross(part(node, "h2"));
    expect(animations.length).toBeGreaterThan(0);
    return;
  }
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("");
  expect(node.querySelector("[data-motion-lines]")).toBeNull();
  expect(animations).toHaveLength(0);
});

it("fails open when font readiness never arrives and never hides already exposed text after hydration", async () => {
  fonts.status = "loading";
  const pending = story();
  runtime.scan(pending, false);
  vi.advanceTimersByTime(7000);
  expect(
    pending.querySelector<HTMLElement>('[data-motion-part="body"]')?.style
      .opacity,
  ).toBe("");
  base = 100;
  const exposed = story("visible-late");
  runtime.scan(exposed, false);
  expect(
    exposed.querySelector<HTMLElement>('[data-motion-part="body"]')?.style
      .opacity,
  ).toBe("");
  fonts.status = "loaded";
  ready();
  await flush();
  expect(exposed.querySelector("[data-motion-lines]")).toBeNull();
  expect(animations).toHaveLength(0);
});

it.each([
  { width: 425, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1600, height: 500 },
])("prepares independently and settles reverse/resize safely at$width x$height", ({
  width,
  height,
}) => {
  Object.defineProperty(window, "innerWidth", { value: width });
  Object.defineProperty(window, "innerHeight", { value: height });
  base = height + 300;
  const node = story();
  runtime.scan(node, false);
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
  base = 100;
  cross(part(node, "h2"));
  expect(animations.length).toBeGreaterThan(0);
  base = -2000;
  window.dispatchEvent(new Event("scroll"));
  const count = animations.length;
  base = 100;
  cross(part(node, "h2"));
  expect(animations).toHaveLength(count);
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("");
});

it("fails open if observer initialization throws after preparing text", () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor() {
        throw new Error("Observer unavailable");
      }
    },
  );
  const node = story();
  expect(() => runtime.scan(node, false)).not.toThrow();
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("");
  expect(node.querySelector("[data-motion-lines]")).toBeNull();
});

it("moves the action beat after a late explanation instead of revealing both together", () => {
  const node = story();
  const body = part(node, '[data-motion-part="body"]');
  const action = part(node, "a");
  let later = 1200;
  for (const target of [body, action])
    Object.defineProperty(target, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          top: later,
          bottom: later + 60,
          left: 0,
          right: 500,
          width: 500,
          height: 60,
        }) as DOMRect,
    });
  runtime.scan(node, false);
  base = 100;
  cross(part(node, "h2"));
  clock = 6000;
  later = 300;
  cross(body);
  cross(action);
  const bodyEntry = animations.find((item) => item.node === body);
  const actionEntry = animations.find((item) => item.node === action);
  if (!bodyEntry || !actionEntry) throw new Error("Missing late reading beats");
  expect(Number(actionEntry.options.delay)).toBe(MOTION_PACING.grouped.beat);
  expect(Number(actionEntry.options.delay)).toBeLessThan(
    Number(bodyEntry.options.duration),
  );
});

it("does not spend a lower caption beat before meaningful pixels cross the entrance line", () => {
  const node = story();
  const caption = part(node, '[data-motion-part="caption"]');
  let captionTop = 1200;
  Object.defineProperty(caption, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        top: captionTop,
        bottom: captionTop + 60,
        left: 0,
        right: 500,
        height: 60,
        width: 500,
      }) as DOMRect,
  });
  runtime.scan(node, false);
  base = 100;
  captionTop = 760;
  cross(part(node, "h2"));
  expect(animations.some((a) => a.node === caption)).toBe(false);
});

it("never conceals an already exposed surface while preparing other offscreen parts of its story", () => {
  const node = story();
  const body = part(node, '[data-motion-part="body"]');
  Object.defineProperty(body, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        top: 100,
        bottom: 160,
        left: 0,
        right: 500,
        width: 500,
        height: 60,
      }) as DOMRect,
  });
  runtime.scan(node, false);
  expect(body.style.opacity).toBe("");
  expect(body.style.color).toBe("");
  expect(animations).toHaveLength(0);
});
it("prepares Hero text while the opaque intro covers it even when fonts are still loading", () => {
  fonts.status = "loading";
  base = 100;
  const node = story();
  node.dataset.motionScene = "home-hero";
  node.dataset.motionKind = "hero";
  const panel = document.createElement("div");
  panel.id = "mare-intro";
  panel.innerHTML = "<span data-intro-wordmark>maré</span>";
  document.body.prepend(panel);
  bootstrapMotion();
  const scan = vi.spyOn(runtime, "scan");
  controller = createSiteMotion({ runtime, navigate() {}, syncScroll() {} });
  expect(scan).toHaveBeenCalledWith(
    node,
    true,
    expect.objectContaining({ paused: true, coveredBy: panel }),
  );
  expect(
    node.querySelector<HTMLElement>('[data-motion-part="body"]')?.style.opacity,
  ).toBe("0");
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installMotion } from "./motionRuntime";
import { bootstrapMotion } from "./motionBootstrap";
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
    ).toBe(180);
    const body = animations.find((a) => a.node.dataset.motionPart === "body");
    if (!body) throw new Error("Missing body entrance");
    expect(Number(body.options.delay)).toBeGreaterThan(
      Number(lines[1].options.delay) + Number(lines[1].options.duration),
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
])("restores all prepared source text on %s and ignores late font continuations", async (reason) => {
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
  expect(Number(actionEntry.options.delay)).toBeGreaterThanOrEqual(
    Number(bodyEntry.options.duration) + 200,
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

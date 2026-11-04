import { MOTION_PACING } from "./motionBootstrap";
import { prepareTextReveal } from "./textReveal";

export type SceneOptions = {
  paused?: boolean;
  skipVisiblePhoto?: boolean;
  fallback?: boolean;
  coveredBy?: HTMLElement;
};
type MotionApi = {
  scan(root: ParentNode, beforePaint: boolean, options?: SceneOptions): void;
  resume(root: ParentNode, part?: "text" | "image"): void;
  settle(root?: ParentNode): void;
  settleVisible(): void;
  release(root: HTMLElement): void;
  destroy(): void;
};
type MotionWindow = Window & { __mareMotion?: MotionApi };

// Explicit dependencies also permit deterministic serialization of the runtime in regression fixtures.
export function installMotion(
  pacing = MOTION_PACING,
  prepareHeading = prepareTextReveal,
): MotionApi {
  const host = window as MotionWindow;
  if (host.__mareMotion) return host.__mareMotion;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = new Map<HTMLElement, (() => void)[]>();
  const seen = new Set<string>();
  type Group = {
    scene: HTMLElement;
    target: HTMLElement;
    end: HTMLElement;
    key: string;
    state: "pending" | "running" | "settled";
    animations: Animation[];
    image: boolean;
    paused: boolean;
    restoreMask?: () => void;
    resume?: () => void;
    clearText?: () => void;
    onSettle?: () => void;
    observer?: IntersectionObserver;
    hasUnread?: () => boolean;
  };
  const groups = new Set<Group>();
  const active = new Set<Group>();
  let restored = performance
    .getEntriesByType("navigation")
    .some(
      (entry) => (entry as PerformanceNavigationTiming).type === "back_forward",
    );
  let path = location.pathname;
  const small = () => innerWidth < 1024 || innerHeight < 720;
  const settle = (group: Group, remember = true) => {
    if (group.state === "settled") return;
    group.state = "settled";
    group.target.dataset.motionState = "settled";
    if (remember) seen.add(group.key);
    group.observer?.disconnect();
    for (const animation of group.animations) animation.cancel();
    group.restoreMask?.();
    group.clearText?.();
    active.delete(group);
    group.onSettle?.();
  };
  const settleAll = () => {
    for (const group of groups) settle(group);
  };
  const settleVisible = () => {
    refresh();
  };
  const focus = (event: Event) => {
    for (const group of groups) {
      if (event.target instanceof Node && group.scene.contains(event.target)) {
        settle(group);
      }
    }
  };
  const scroll = () => {
    for (const group of groups) {
      if (group.state === "settled") continue;
      const rect = group.target.getBoundingClientRect();
      if (
        group.end.getBoundingClientRect().bottom <= 0 ||
        (group.state === "running" && rect.top >= innerHeight) ||
        (group.state === "pending" &&
          group.image &&
          !group.restoreMask &&
          rect.top < innerHeight)
      )
        settle(group);
    }
  };
  const pop = () => {
    restored = true;
    path = location.pathname;
    settleAll();
  };
  const click = (event: MouseEvent) => {
    const link =
      event.target instanceof Element ? event.target.closest("a") : null;
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      link.target ||
      link.hasAttribute("download")
    )
      return;
    const destination = new URL(link.href, location.href);
    if (
      destination.origin === location.origin &&
      destination.pathname !== location.pathname
    ) {
      settleAll();
      restored = false;
      seen.clear();
      path = destination.pathname;
    }
  };
  const visibility = () => {
    if (document.hidden) settleVisible();
    else refresh();
  };
  const reduce = () => {
    refresh();
  };
  window.addEventListener("resize", refresh);
  window.addEventListener("pagehide", settleAll);
  window.addEventListener("pageshow", popPersisted);
  window.addEventListener("popstate", pop);
  window.addEventListener("hashchange", settleAll);
  window.addEventListener("scroll", scroll, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  document.addEventListener("focusin", focus, true);
  document.addEventListener("click", click, true);
  preference.addEventListener("change", reduce);
  function popPersisted(event: PageTransitionEvent) {
    if (event.persisted) pop();
  }
  const release = (scene: HTMLElement) => {
    for (const dispose of scenes.get(scene) ?? []) dispose();
    scenes.delete(scene);
  };
  function refresh() {
    // Rebuild only unread entrances after layout changes; exposed content stays final.
    const unread = [...groups]
      .filter(
        (group) =>
          (group.state === "pending" &&
            group.target.getBoundingClientRect().top >= innerHeight) ||
          group.hasUnread?.(),
      )
      .map((group) => group.key);
    for (const scene of scenes.keys()) release(scene);
    for (const key of unread) seen.delete(key);
    if (!preference.matches) scan(document, false);
  }
  const scan = (
    root: ParentNode,
    beforePaint: boolean,
    options: SceneOptions = {},
  ) => {
    for (const scene of scenes.keys()) {
      if (!scene.isConnected) release(scene);
    }
    if (path !== location.pathname) {
      path = location.pathname;
      if (!restored) seen.clear();
    }
    const nodes =
      root instanceof HTMLElement && root.matches("[data-motion-scene]")
        ? [root]
        : [...root.querySelectorAll<HTMLElement>("[data-motion-scene]")];
    for (const scene of nodes) {
      if (scenes.has(scene)) continue;
      const disposers: (() => void)[] = [];
      scenes.set(scene, disposers);
      const hero = scene.dataset.motionKind === "hero";
      const headings = [
        ...scene.querySelectorAll<HTMLElement>('[data-motion-part="heading"]'),
      ];
      const body = scene.querySelector<HTMLElement>(
        '[data-motion-part="body"]',
      );
      const photo = scene.querySelector<HTMLElement>(
        '[data-motion-part="image"]',
      );
      let storyStartedAt: number | null = null;
      let evidenceBeat: number = pacing.photoBeat;
      let photoStartedAt: number | null = null;
      let photoSettled = !photo;
      let retryCaption = () => {};
      const fullStory = scene.dataset.motionNarrative === "visible";
      const timing = fullStory ? { ...pacing, ...pacing.grouped } : pacing;
      const beat = pacing.grouped.beat;
      const textNodes = [
        ...scene.querySelectorAll<HTMLElement>(
          fullStory
            ? '[data-motion-part]:not([data-motion-part="image"]), a, button'
            : '[data-motion-part="heading"], [data-motion-part="body"]',
        ),
      ];
      const add = (target: HTMLElement, image: boolean) => {
        const key =
          location.pathname +
          ":" +
          scene.dataset.motionScene +
          (image ? ":image" : ":text");
        const group: Group = {
          scene,
          target,
          end: image ? target : (textNodes.at(-1) ?? body ?? target),
          key,
          state: "pending",
          animations: [],
          image,
          paused: options.paused ?? false,
        };
        groups.add(group);
        if (image)
          group.onSettle = () => {
            photoSettled = true;
            retryCaption();
          };
        target.dataset.motionState = "pending";
        let decoded = false;
        const img = image ? target.querySelector("img") : null;
        const covered = () => {
          const cover = options.coveredBy;
          if (
            !cover?.isConnected ||
            cover !== document.getElementById("mare-intro") ||
            !cover.hasAttribute("data-active")
          )
            return false;
          const panel = cover.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          // Only the root's opaque intro may protect an otherwise visible photo.
          return (
            rect.bottom > 0 &&
            rect.top < innerHeight &&
            panel.top <= Math.max(0, rect.top) &&
            panel.bottom >= Math.min(innerHeight, rect.bottom) &&
            panel.left <= Math.max(0, rect.left) &&
            panel.right >= Math.min(innerWidth, rect.right)
          );
        };
        const arm = () => {
          if (
            group.state !== "pending" ||
            group.restoreMask ||
            !target.animate ||
            (target.getBoundingClientRect().top < innerHeight && !covered())
          )
            return;
          // Arm outside the viewport or behind the proven intro; never hide exposed pixels.
          const previous = target.style.getPropertyValue("clip-path");
          const priority = target.style.getPropertyPriority("clip-path");
          group.restoreMask = () => {
            if (previous)
              target.style.setProperty("clip-path", previous, priority);
            else target.style.removeProperty("clip-path");
          };
          target.style.setProperty("clip-path", "inset(0 100% 0 0)");
        };
        const prepare = () => {
          decoded = true;
          arm();
        };
        if (img?.complete && img.naturalWidth > 0) {
          // A resolved decode before eligibility is required; never reveal a late image.
          img
            .decode()
            .then(prepare)
            .catch(() => {});
        } else if (img) {
          const loaded = () => {
            img
              .decode()
              .then(prepare)
              .catch(() => {});
          };
          img.addEventListener("load", loaded, { once: true });
          disposers.push(() => img.removeEventListener("load", loaded));
        }
        let fontsReady = image || document.fonts?.status === "loaded";
        let requested = false;
        let enterText = () => {};
        let photoDelay = 0;
        const start = (beforeVisiblePaint = false) => {
          if (group.state !== "pending") return;
          if (!image && !fontsReady) {
            requested = true;
            return;
          }
          if (
            preference.matches ||
            restored ||
            location.hash ||
            seen.has(key) ||
            !target.animate ||
            (image
              ? !decoded || (!group.restoreMask && !beforeVisiblePaint)
              : false) ||
            scene.contains(document.activeElement)
          ) {
            settle(group);
            return;
          }
          const activeScenes = new Set([...active].map((item) => item.scene));
          if (!activeScenes.has(scene) && activeScenes.size >= 2) {
            const oldest = active.values().next().value?.scene;
            for (const item of active) if (item.scene === oldest) settle(item);
          }
          group.state = "running";
          target.dataset.motionState = "running";
          active.add(group);
          const animate = (
            node: HTMLElement,
            frames: Keyframe[],
            duration: number,
            delay: number,
            easing: string,
          ) => {
            const animation = node.animate(frames, {
              duration,
              delay,
              easing,
              fill: "both",
            });
            if (group.paused) animation.pause();
            group.animations.push(animation);
          };
          if (image) {
            photoDelay =
              fullStory || hero || storyStartedAt === null
                ? 0
                : Math.max(
                    0,
                    storyStartedAt + evidenceBeat - performance.now(),
                  );
            // A paused curtain has no running clock until its actual handoff.
            photoStartedAt = group.paused
              ? null
              : performance.now() + photoDelay;
            try {
              animate(
                target,
                [
                  { clipPath: "inset(0 100% 0 0)" },
                  { clipPath: "inset(0 0% 0 0)" },
                ],
                timing.photo,
                photoDelay,
                pacing.curtainEase,
              );
            } catch {
              settle(group);
              return;
            }
            retryCaption();
          } else {
            enterText();
            return;
          }
          Promise.all(group.animations.map((animation) => animation.finished))
            .then(() => settle(group))
            .catch(() => settle(group));
        };
        const rect = target.getBoundingClientRect();
        const line = innerHeight * (small() ? 0.9 : 0.85);
        const entries = textNodes.map((node, index) => ({
          node,
          key: key + ":" + index,
          role: node.dataset.motionPart ?? "action",
          surfaces: [node],
          mode: "fade" as "lines" | "fade",
          at: null as number | null,
          crossed: false,
          started: false,
          done: false,
          restore: () => {},
        }));
        if (!image && fullStory)
          group.hasUnread = () =>
            group.state !== "settled" &&
            entries.some(
              (entry) =>
                !entry.started &&
                !entry.done &&
                entry.node.getBoundingClientRect().top >= innerHeight,
            );
        let fontTimer = 0;
        let bodyBeat: number = pacing.bodyBeat;
        const completeText = () => {
          if (entries.every((entry) => entry.done)) settle(group);
        };
        const restoreEntry = (entry: (typeof entries)[number]) => {
          entry.restore();
          entry.done = true;
        };
        const revealEntry = (
          entry: (typeof entries)[number],
          now = performance.now(),
        ) => {
          if (
            group.state !== "running" ||
            entry.started ||
            entry.done ||
            !fontsReady
          )
            return;
          const bounds = entry.node.getBoundingClientRect();
          if (bounds.bottom <= 0) {
            restoreEntry(entry);
            completeText();
            return;
          }
          const visible = Math.max(
            0,
            Math.min(bounds.bottom, line) - Math.max(0, bounds.top),
          );
          const height = bounds.height || bounds.bottom - bounds.top;
          if (!entry.crossed && visible < Math.min(height, innerHeight) * 0.15)
            return;
          const role = entry.role;
          // The media callback may arrive after this entry's own crossing.
          // Wait for its real clock or readable fallback, never an expired story offset.
          if (
            role === "caption" &&
            (group.paused || (!photoSettled && photoStartedAt === null))
          )
            return;
          entry.started = true;
          seen.add(entry.key);
          const offset = fullStory
            ? role === "body"
              ? beat
              : role === "list"
                ? beat * 2
                : role === "action"
                  ? beat *
                    (entries.some((item) => item.role === "list") ? 3 : 2)
                  : 0
            : role === "body"
              ? bodyBeat
              : role === "list"
                ? bodyBeat + pacing.body
                : role === "caption"
                  ? hero
                    ? pacing.photo + pacing.readingGap
                    : evidenceBeat + pacing.photo
                  : role === "action"
                    ? Math.max(
                        bodyBeat +
                          pacing.body +
                          (entries.some((item) => item.role === "list")
                            ? pacing.body
                            : 0) +
                          pacing.readingGap,
                        photo && !hero ? evidenceBeat + pacing.photo : 0,
                      )
                    : 0;
          const duration =
            role === "heading"
              ? timing.heading
              : role === "label"
                ? timing.label
                : role === "action"
                  ? timing.action
                  : timing.body;
          let begin = Math.max(now, (storyStartedAt ?? now) + offset);
          for (const previous of entries) {
            if (previous.at === null || previous === entry) continue;
            if (role === "body" && previous.role === "heading")
              begin = Math.max(
                begin,
                previous.at +
                  (fullStory
                    ? beat
                    : pacing.heading +
                      (previous.surfaces.length - 1) * pacing.lineStagger +
                      pacing.readingGap),
              );
            if (
              (role === "list" || role === "action") &&
              previous.role === "body"
            )
              begin = Math.max(
                begin,
                previous.at +
                  (fullStory
                    ? beat
                    : pacing.body +
                      (role === "action" ? pacing.readingGap : 0)),
              );
            if (role === "action" && previous.role === "list")
              begin = Math.max(
                begin,
                previous.at +
                  (fullStory ? beat : pacing.body + pacing.readingGap),
              );
          }
          if (role === "caption" && !photoSettled && photoStartedAt !== null)
            begin = Math.max(begin, photoStartedAt + timing.photo);
          entry.at = begin;
          const distance =
            role === "label"
              ? 0
              : role === "heading"
                ? small()
                  ? 6
                  : 12
                : small()
                  ? 6
                  : 10;
          try {
            const local = entry.surfaces.map((surface, index) => {
              const animation = surface.animate(
                entry.mode === "lines"
                  ? [
                      { transform: "translateY(115%)" },
                      { transform: "translateY(0%)" },
                    ]
                  : [
                      { opacity: 0, transform: `translateY(${distance}px)` },
                      { opacity: 1, transform: "translateY(0px)" },
                    ],
                {
                  duration,
                  delay: Math.max(0, begin - now) + index * timing.lineStagger,
                  easing: pacing.textEase,
                  fill: "both",
                },
              );
              if (group.paused) animation.pause();
              group.animations.push(animation);
              return animation;
            });
            void Promise.all(local.map((animation) => animation.finished))
              .then(() => {
                if (group.state === "settled") return;
                restoreEntry(entry);
                for (const animation of local) {
                  animation.cancel();
                  const index = group.animations.indexOf(animation);
                  if (index >= 0) group.animations.splice(index, 1);
                }
                completeText();
              })
              .catch(() => settle(group));
          } catch {
            settle(group);
          }
        };
        enterText = () => {
          const now = performance.now();
          storyStartedAt ??= now;
          for (const entry of entries) revealEntry(entry, now);
        };
        if (!image)
          retryCaption = () => {
            for (const entry of entries)
              if (entry.role === "caption") revealEntry(entry);
          };
        const observe = () => {
          if (group.observer || typeof IntersectionObserver === "undefined")
            return;
          try {
            group.observer = new IntersectionObserver(
              (records) => {
                for (const record of records) {
                  if (!record.isIntersecting) continue;
                  if (
                    !image &&
                    record.intersectionRatio !== undefined &&
                    record.intersectionRatio < 0.15
                  )
                    continue;
                  if (image) {
                    if (record.target === target) start();
                  } else {
                    const entry = entries.find(
                      (item) => item.node === record.target,
                    );
                    if (entry) {
                      entry.crossed = true;
                      start();
                      revealEntry(entry);
                    }
                  }
                }
              },
              {
                rootMargin: `0px 0px -${innerHeight - line}px 0px`,
                threshold: image ? 0 : 0.15,
              },
            );
            if (image) group.observer.observe(target);
            else
              for (const entry of entries) group.observer.observe(entry.node);
          } catch {
            settle(group);
          }
        };
        const armText = () => {
          const restorers: (() => void)[] = [];
          group.clearText = () => {
            clearTimeout(fontTimer);
            for (const restore of restorers) restore();
          };
          for (const entry of entries) {
            const node = entry.node;
            if (
              seen.has(entry.key) ||
              (!beforePaint && node.getBoundingClientRect().top < innerHeight)
            ) {
              entry.done = true;
              seen.add(entry.key);
              continue;
            }
            const previous = node.style.getPropertyValue("opacity");
            const priority = node.style.getPropertyPriority("opacity");
            const restoreOpacity = () => {
              if (previous)
                node.style.setProperty("opacity", previous, priority);
              else node.style.removeProperty("opacity");
            };
            entry.restore = restoreOpacity;
            restorers.push(() => entry.restore());
            node.style.opacity = "0";
          }
          const measure = () => {
            if (group.state === "settled" || !scene.isConnected) return;
            fontsReady = true;
            clearTimeout(fontTimer);
            try {
              let lines = 1;
              for (const entry of entries) {
                if (entry.role !== "heading" || entry.done) continue;
                const opacity = entry.restore;
                const prepared = prepareHeading(entry.node);
                entry.surfaces = prepared.surfaces;
                entry.mode = prepared.mode;
                entry.node.dataset.motionTextMode = prepared.mode;
                entry.restore = () => {
                  prepared.restore();
                  opacity();
                };
                if (prepared.mode === "lines") {
                  opacity();
                  lines = Math.max(lines, prepared.surfaces.length);
                }
              }
              bodyBeat = Math.max(
                pacing.bodyBeat,
                pacing.heading +
                  (lines - 1) * pacing.lineStagger +
                  pacing.readingGap,
              );
              evidenceBeat = bodyBeat + pacing.body;
              if (requested) start();
            } catch {
              settle(group);
            }
          };
          if (fontsReady) measure();
          else {
            fontTimer = window.setTimeout(() => settle(group), pacing.deadline);
            void document.fonts?.ready
              ?.then(measure)
              .catch(() => settle(group));
          }
          observe();
        };
        const coveredPhoto = image && group.paused && covered();
        group.resume = () => {
          if (!image) {
            if (group.state === "running") {
              const now = performance.now();
              const shift = now - (storyStartedAt ?? now);
              for (const entry of entries)
                if (entry.at !== null) entry.at += shift;
              storyStartedAt = now;
              enterText();
            } else if (requested && fontsReady) start();
            return;
          }
          if (group.state === "running" && photoStartedAt === null) {
            photoStartedAt = performance.now() + photoDelay;
            retryCaption();
          }
          if (
            group.state === "pending" &&
            coveredPhoto &&
            target.getBoundingClientRect().top < innerHeight
          )
            start();
        };
        if (
          preference.matches ||
          restored ||
          location.hash ||
          seen.has(key) ||
          (rect.bottom <= 0 &&
            (image ||
              !fullStory ||
              group.end.getBoundingClientRect().bottom <= 0)) ||
          (image &&
            rect.top < innerHeight &&
            (!beforePaint || options.skipVisiblePhoto) &&
            !coveredPhoto)
        ) {
          if (preference.matches && !image)
            for (const entry of entries)
              if (entry.node.getBoundingClientRect().top < innerHeight)
                seen.add(entry.key);
          settle(
            group,
            !(
              preference.matches &&
              (rect.top >= innerHeight || group.hasUnread?.())
            ),
          );
        } else if (coveredPhoto && rect.top < innerHeight) {
          // Close only behind the proven opaque cover; decode must finish before release.
          // A cold image that misses that handoff settles visibly instead of closing late.
          arm();
        } else if (
          !image &&
          !fullStory &&
          rect.top < innerHeight &&
          !beforePaint
        ) {
          settle(group);
        } else if (!image) {
          if (typeof IntersectionObserver === "undefined") {
            settle(group);
          } else armText();
          if (entries.every((entry) => entry.done)) settle(group);
          else if (
            rect.top <= line &&
            entries.some(
              (entry) =>
                !entry.done && entry.node.getBoundingClientRect().top < line,
            )
          )
            start();
          else if (typeof IntersectionObserver === "undefined") settle(group);
        } else if (rect.top <= line) {
          if (!beforePaint) settle(group);
          else if (image) {
            // Decode may complete in this microtask; the next rendering frame closes eligibility.
            let eligible = true;
            const frame = requestAnimationFrame(() => {
              eligible = false;
              if (group.state === "pending") settle(group);
            });
            disposers.push(() => cancelAnimationFrame(frame));
            img
              ?.decode()
              .then(() => {
                decoded = true;
                if (eligible) start(true);
              })
              .catch(() => settle(group));
            if (!img) settle(group);
          } else start();
        } else if (typeof IntersectionObserver === "undefined") settle(group);
        else {
          observe();
        }
        disposers.push(() => {
          settle(group);
          groups.delete(group);
        });
      };
      if (headings[0]) add(headings[0], false);
      if (photo) add(photo, true);
    }
  };
  const destroy = () => {
    for (const scene of scenes.keys()) release(scene);
    window.removeEventListener("resize", refresh);
    window.removeEventListener("pagehide", settleAll);
    window.removeEventListener("pageshow", popPersisted);
    window.removeEventListener("popstate", pop);
    window.removeEventListener("hashchange", settleAll);
    window.removeEventListener("scroll", scroll);
    document.removeEventListener("visibilitychange", visibility);
    document.removeEventListener("focusin", focus, true);
    document.removeEventListener("click", click, true);
    preference.removeEventListener("change", reduce);
    delete host.__mareMotion;
  };
  const resume = (root: ParentNode, part?: "text" | "image") => {
    for (const group of groups) {
      if (!root.contains(group.scene) || !group.paused) continue;
      if (part && group.image !== (part === "image")) continue;
      group.paused = false;
      if (group.state === "running")
        for (const animation of group.animations) animation.play();
      group.resume?.();
    }
  };
  const settleRoot = (root: ParentNode = document) => {
    for (const group of groups) if (root.contains(group.scene)) settle(group);
  };
  host.__mareMotion = {
    scan,
    resume,
    settle: settleRoot,
    settleVisible,
    release,
    destroy,
  };
  return host.__mareMotion;
}

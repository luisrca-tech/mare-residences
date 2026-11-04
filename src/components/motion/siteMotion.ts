import type { MotionWindow } from "@/types/motion";
import type { installMotion, SceneOptions } from "./motionRuntime";
import { MOTION_PACING } from "./motionBootstrap";

type SiteOptions = {
  navigate: (href: string) => void;
  runtime: ReturnType<typeof installMotion>;
  syncScroll: () => void;
};
type Navigation = {
  path: string;
  href: string;
  committed: boolean;
  native: boolean;
  ready: () => void;
  view?: ViewTransition;
  animation?: Animation;
  timer: number;
};

export function createSiteMotion({
  navigate,
  runtime,
  syncScroll,
}: SiteOptions) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const host = window as MotionWindow;
  const surface = document.getElementById("mare-intro");
  let currentPath = location.pathname;
  let disposed = false;
  let restoring = false;
  let settledPath = "";
  let pending: Navigation | null = null;
  const retired = new Set<string>();
  const fallbackAnimations = new Set<Animation>();
  let intro: {
    frame: number;
    timer: number;
    animations: Animation[];
    prepared: boolean;
    resumed: boolean;
    photoResumed: boolean;
  } | null = null;
  const compact = () => innerWidth < 1024 || innerHeight < 720;
  const scenes = () => [
    ...document.querySelectorAll<HTMLElement>("[data-motion-scene]"),
  ];
  const hero = () =>
    document.querySelector<HTMLElement>('[data-motion-scene="home-hero"]');
  const scan = (
    fresh: boolean,
    options: SceneOptions = {},
    omitHero = false,
  ) => {
    for (const node of scenes()) {
      if (!omitHero || node !== hero()) runtime.scan(node, fresh, options);
    }
  };
  const clearFallback = () => {
    for (const animation of fallbackAnimations) animation.cancel();
    fallbackAnimations.clear();
  };
  const finishIntro = (skipped: boolean) => {
    const active = intro;
    if (!active) return;
    intro = null;
    clearTimeout(active.timer);
    cancelAnimationFrame(active.frame);
    for (const animation of active.animations) animation.cancel();
    surface?.removeAttribute("data-active");
    if (host.__mareIntro) host.__mareIntro.eligible = false;
    const node = hero();
    if (node) {
      if (!active.prepared)
        runtime.scan(node, false, { skipVisiblePhoto: true });
      if (skipped) runtime.settle(node);
      else runtime.resume(node);
    }
  };
  const closeNavigation = (navigation: Navigation, settle: boolean) => {
    if (pending !== navigation) return;
    if (settle && navigation.committed) retired.add(navigation.path);
    pending = null;
    clearTimeout(navigation.timer);
    navigation.ready();
    navigation.animation?.cancel();
    navigation.view?.skipTransition();
    document.documentElement.removeAttribute("data-mare-transition");
    if (settle) runtime.settleVisible();
  };
  const commitNavigation = (navigation: Navigation) => {
    if (pending !== navigation || navigation.committed || disposed) return;
    navigation.committed = true;
    try {
      navigate(navigation.href);
    } catch {
      navigation.committed = false;
      closeNavigation(navigation, true);
    }
  };
  const interrupt = (commit = true) => {
    finishIntro(true);
    clearFallback();
    const navigation = pending;
    if (navigation) {
      if (commit) {
        settledPath = navigation.path;
        commitNavigation(navigation);
      }
      closeNavigation(navigation, true);
    }
  };
  const fallbackHeading = () => {
    const heading = document.querySelector<HTMLElement>("main h1");
    if (
      !heading ||
      heading.hasAttribute("data-motion-part") ||
      !heading.animate ||
      media.matches
    )
      return;
    const animation = heading.animate(
      [
        { opacity: 0.85, transform: `translateY(${compact() ? 4 : 8}px)` },
        { opacity: 1, transform: "translateY(0px)" },
      ],
      {
        duration: MOTION_PACING.heading,
        easing: MOTION_PACING.textEase,
        fill: "both",
      },
    );
    fallbackAnimations.add(animation);
    void animation.finished
      .then(() => {
        animation.cancel();
        fallbackAnimations.delete(animation);
      })
      .catch(() => fallbackAnimations.delete(animation));
  };

  const startIntro = () => {
    const bootstrap = host.__mareIntro;
    if (
      !surface?.animate ||
      !bootstrap?.eligible ||
      media.matches ||
      location.hash ||
      scrollY > 1
    )
      return false;
    clearTimeout(bootstrap.timer);
    const elapsed = Math.max(0, performance.now() - bootstrap.startedAt);
    const liftStart = Math.max(0, MOTION_PACING.introHold - elapsed);
    // Hydration can consume the brand hold, but never compress the visible lift.
    if (
      elapsed + liftStart + MOTION_PACING.introLift >=
      MOTION_PACING.deadline
    ) {
      bootstrap.eligible = false;
      surface.removeAttribute("data-active");
      return false;
    }
    const active = {
      frame: 0,
      timer: 0,
      animations: [] as Animation[],
      prepared: false,
      resumed: false,
      photoResumed: false,
    };
    intro = active;
    surface.setAttribute("data-active", "");
    active.timer = window.setTimeout(
      () => {
        if (intro === active) {
          finishIntro(true);
          runtime.settleVisible();
        }
      },
      Math.max(0, MOTION_PACING.deadline - elapsed),
    );
    const prepare = () => {
      if (intro !== active || active.prepared) return;
      const node = hero();
      if (!node) return;
      const parts = [
        ...node.querySelectorAll<HTMLElement>(
          '[data-motion-part="heading"], [data-motion-part="body"]',
        ),
      ];
      if (
        !parts.length ||
        surface.getBoundingClientRect().bottom <
          Math.max(
            ...parts.map((part) =>
              Math.min(innerHeight, part.getBoundingClientRect().bottom),
            ),
          )
      )
        return;
      runtime.scan(node, true, { paused: true, coveredBy: surface });
      active.prepared = true;
    };
    prepare();
    void document.fonts.ready.then(prepare).catch(() => {});
    const wordmark = surface.querySelector<HTMLElement>(
      "[data-intro-wordmark]",
    );
    if (wordmark?.animate)
      active.animations.push(
        wordmark.animate(
          [
            { opacity: 0.4, transform: `translateY(${compact() ? 4 : 6}px)` },
            { opacity: 1, transform: "translateY(0px)" },
          ],
          {
            duration: Math.max(0, MOTION_PACING.introBrand - elapsed),
            easing: MOTION_PACING.textEase,
            fill: "both",
          },
        ),
      );
    const panel = surface.animate(
      [{ transform: "translateY(0%)" }, { transform: "translateY(-100%)" }],
      {
        duration: MOTION_PACING.introLift,
        delay: liftStart,
        easing: MOTION_PACING.curtainEase,
        fill: "both",
      },
    );
    active.animations.push(panel);
    const measure = () => {
      if (intro !== active) return;
      const node = hero();
      const target = node?.querySelector<HTMLElement>(
        '[data-motion-part="heading"]',
      );
      if (
        active.prepared &&
        !active.resumed &&
        node &&
        target &&
        surface.getBoundingClientRect().bottom <=
          target.getBoundingClientRect().top
      ) {
        active.resumed = true;
        runtime.resume(node, "text");
      }
      const photo = node?.querySelector<HTMLElement>(
        '[data-motion-part="image"]',
      );
      if (
        active.prepared &&
        !active.photoResumed &&
        node &&
        photo &&
        surface.getBoundingClientRect().bottom <=
          photo.getBoundingClientRect().top
      ) {
        active.photoResumed = true;
        runtime.resume(node, "image");
      }
      active.frame = requestAnimationFrame(measure);
    };
    active.frame = requestAnimationFrame(measure);
    void panel.finished
      .then(() => {
        if (intro === active) finishIntro(false);
      })
      .catch(() => {
        if (intro === active) finishIntro(true);
      });
    scan(false, {}, true);
    return true;
  };

  const click = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      !(event.target instanceof Element)
    )
      return;
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (
      !anchor ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target.toLowerCase() !== "_self")
    )
      return;
    let destination: URL;
    try {
      destination = new URL(anchor.href, location.href);
    } catch {
      return;
    }
    if (
      !["http:", "https:"].includes(destination.protocol) ||
      destination.origin !== location.origin ||
      destination.pathname === location.pathname
    )
      return;
    if (media.matches) return;
    event.preventDefault();
    finishIntro(true);
    clearFallback();
    if (pending) closeNavigation(pending, true);
    restoring = false;
    settledPath = "";
    let ready = () => {};
    const prepared = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const navigation: Navigation = {
      path: destination.pathname,
      href: destination.pathname + destination.search + destination.hash,
      committed: false,
      native: false,
      ready,
      timer: 0,
    };
    pending = navigation;
    navigation.timer = window.setTimeout(() => {
      if (pending === navigation) interrupt();
    }, MOTION_PACING.deadline);
    if (typeof document.startViewTransition !== "function") {
      commitNavigation(navigation);
      return;
    }
    navigation.native = true;
    document.documentElement.setAttribute("data-mare-transition", "");
    try {
      const view = document.startViewTransition(async () => {
        if (pending !== navigation || disposed) return;
        commitNavigation(navigation);
        if (pending === navigation) await prepared;
      });
      navigation.view = view;
      void view.ready
        .then(
          () => {
            if (pending !== navigation || disposed) return;
            navigation.animation = document.documentElement.animate(
              [
                { clipPath: "inset(100% 0 0 0)" },
                { clipPath: "inset(0% 0 0 0)" },
              ],
              {
                duration: MOTION_PACING.transition,
                easing: MOTION_PACING.curtainEase,
                fill: "both",
                pseudoElement: "::view-transition-new(root)",
              },
            );
            void navigation.animation.finished.catch(() => {
              if (pending === navigation) interrupt();
            });
          },
          () => {
            if (pending === navigation) interrupt();
          },
        )
        .catch(() => {
          if (pending === navigation) interrupt();
        });
      void view.finished.then(
        () => {
          if (pending !== navigation || disposed) return;
          pending = null;
          clearTimeout(navigation.timer);
          navigation.animation?.cancel();
          document.documentElement.removeAttribute("data-mare-transition");
          runtime.resume(document);
          syncScroll();
        },
        () => {
          if (pending === navigation) interrupt();
        },
      );
    } catch {
      navigation.native = false;
      document.documentElement.removeAttribute("data-mare-transition");
      commitNavigation(navigation);
    }
  };
  const commit = (path: string) => {
    if (disposed || path === currentPath) return;
    finishIntro(true);
    clearFallback();
    currentPath = path;
    if (retired.delete(path) && pending?.path !== path && !restoring) {
      scan(false);
      return;
    }
    const navigation = pending;
    if (navigation?.path === path && !restoring && !location.hash) {
      if (navigation.native) {
        scan(true, { paused: true, skipVisiblePhoto: true });
        navigation.ready();
      } else {
        scan(true, { fallback: true });
        fallbackHeading();
        closeNavigation(navigation, false);
        syncScroll();
      }
      return;
    }
    if (navigation) closeNavigation(navigation, true);
    const fresh =
      !restoring && !location.hash && settledPath !== path && !media.matches;
    scan(fresh, fresh ? { fallback: true } : {});
    if (fresh) fallbackHeading();
    else runtime.settle();
    settledPath = "";
    restoring = false;
    syncScroll();
  };
  const input = () => {
    if (intro || pending) interrupt();
  };
  const resize = () => {
    interrupt();
    runtime.settleVisible();
  };
  const focus = (event: FocusEvent) => {
    if (intro || pending) interrupt();
    else {
      clearFallback();
      if (event.target instanceof HTMLElement && event.target.id === "conteudo")
        runtime.settle(event.target);
    }
  };
  const pop = () => {
    restoring = true;
    retired.clear();
    interrupt(false);
    runtime.settle();
  };
  const hash = () => {
    interrupt(false);
    runtime.settle();
    syncScroll();
  };
  const preference = () => {
    if (media.matches) {
      interrupt();
      runtime.settle();
    }
  };
  const visibility = () => {
    if (document.hidden) resize();
  };
  const scroll = () => {
    if (intro && scrollY > 1) interrupt();
  };
  const show = (event: PageTransitionEvent) => {
    if (event.persisted) {
      pop();
      syncScroll();
    }
  };
  const save = host.__mareIntro?.savePosition;
  if (save) window.addEventListener("pagehide", save);
  document.addEventListener("click", click, true);
  document.addEventListener("focusin", focus, true);
  document.addEventListener("pointerdown", input, true);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("keydown", input, true);
  window.addEventListener("wheel", input, { passive: true });
  window.addEventListener("touchstart", input, { passive: true });
  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", resize);
  window.addEventListener("pageshow", show);
  window.addEventListener("popstate", pop);
  window.addEventListener("hashchange", hash);
  window.addEventListener("scroll", scroll, { passive: true });
  media.addEventListener("change", preference);
  if (!startIntro()) {
    surface?.removeAttribute("data-active");
    scan(false);
  }
  return {
    commit,
    destroy() {
      if (disposed) return;
      interrupt(false);
      runtime.settle();
      disposed = true;
      if (save) window.removeEventListener("pagehide", save);
      document.removeEventListener("click", click, true);
      document.removeEventListener("focusin", focus, true);
      document.removeEventListener("pointerdown", input, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", input, true);
      window.removeEventListener("wheel", input);
      window.removeEventListener("touchstart", input);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pagehide", resize);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("scroll", scroll);
      media.removeEventListener("change", preference);
    },
  };
}

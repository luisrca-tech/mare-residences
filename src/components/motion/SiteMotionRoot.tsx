"use client";

import Lenis from "lenis";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { bootstrapMotion, MOTION_PACING } from "./motionBootstrap";
import { installMotion } from "./motionRuntime";
import { createSiteMotion } from "./siteMotion";
import { createSmoothScroll } from "./smoothScroll";

export function SiteMotionRoot({
  children,
  wordmark,
}: {
  children: ReactNode;
  wordmark: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const owner = useRef<ReturnType<typeof createSiteMotion> | null>(null);
  useLayoutEffect(() => {
    const runtime = installMotion();
    const scroll = createSmoothScroll((options) => new Lenis(options));
    const site = createSiteMotion({
      navigate: (href) => router.push(href),
      runtime,
      syncScroll: scroll.sync,
    });
    owner.current = site;
    return () => {
      owner.current = null;
      site.destroy();
      scroll.destroy();
      runtime.destroy();
    };
  }, [router]);
  useLayoutEffect(() => {
    if (pathname) owner.current?.commit(pathname);
  }, [pathname]);
  return (
    <>
      <div
        id="mare-intro"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] items-center justify-center bg-petrol text-ivory"
      >
        <span data-intro-wordmark="" className="type-wordmark">
          {wordmark}
        </span>
      </div>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Static local bootstrap only; wordmark/content are rendered separately as React children.
        dangerouslySetInnerHTML={{
          __html: `(${bootstrapMotion.toString()})(${JSON.stringify(MOTION_PACING)});`,
        }}
      />
      {children}
    </>
  );
}

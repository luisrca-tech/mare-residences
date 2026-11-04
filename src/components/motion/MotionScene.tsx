import type { ReactNode } from "react";

/** Narrative scope only; the persistent site root owns initialization and release. */
export function MotionScene({
  sceneKey,
  kind = "editorial",
  children,
}: {
  sceneKey: string;
  kind?: "hero" | "editorial";
  children: ReactNode;
}) {
  return (
    <div
      data-motion-scene={sceneKey}
      data-motion-kind={kind}
      data-motion-narrative="visible"
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
}

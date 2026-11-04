import type { ContainerProps } from "@/types/components";

export function Container({
  children,
  className = "",
  fullBleed = false,
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[calc(1440px*var(--layout-scale))] px-6 max-[359px]:px-4 md:max-lg:max-w-[calc(768px*var(--layout-scale))] md:px-8 lg:px-[clamp(48px,calc(3.846154vw+8.615385px),64px)] ${fullBleed ? "lg:max-w-none" : "lg:max-w-[calc(1440px*var(--layout-scale))]"} ${className}`}
    >
      {children}
    </div>
  );
}

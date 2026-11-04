import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { ContainerSection } from "./ContainerSection";
import {
  SECTION_FILL_MINUS_HEADER_HEIGHT,
  SECTION_FILL_MINUS_HEADER_VAR,
} from "@/utils/sectionViewport";
import { WIDTH_SCALE_CSS_EXPRESSION } from "@/utils/widthScaling";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  xxlSectionHeight?: number;

  viewportMinusHeader?: boolean;
  lgMaxHeight?: number;
  contained?: boolean;
  padding?: string;
  fillChildren?: boolean;
  enable2xlWidthScaling?: boolean;
}

export function Section({
  children,
  className,
  fullHeight = false,
  xxlSectionHeight,
  viewportMinusHeader = false,
  lgMaxHeight = 720,
  contained = true,
  padding,
  fillChildren,
  style,
  enable2xlWidthScaling = false,
  ...rest
}: SectionProps) {
  const usesViewportMinusHeader = Boolean(viewportMinusHeader);
  const hasNumericXxlHeight =
    typeof xxlSectionHeight === "number" && !usesViewportMinusHeader;
  const hasCustomHeight = hasNumericXxlHeight || usesViewportMinusHeader;
  const hasHeight = hasCustomHeight || fullHeight;
  const shouldFillChildren = fillChildren ?? hasHeight;

  const cssVars: Record<string, string> = {};
  if (hasNumericXxlHeight) {
    cssVars["--xxl-section-height"] = `${xxlSectionHeight}svh`;
    cssVars["--lg-max-height"] = `${lgMaxHeight}px`;
  }
  if (usesViewportMinusHeader) {
    cssVars[SECTION_FILL_MINUS_HEADER_VAR] = SECTION_FILL_MINUS_HEADER_HEIGHT;
  }
  if (enable2xlWidthScaling) {
    cssVars["--section-width-scale"] = WIDTH_SCALE_CSS_EXPRESSION;
  }
  const mergedStyle =
    Object.keys(cssVars).length > 0
      ? ({ ...style, ...cssVars } as CSSProperties)
      : style;

  return (
    <section
      {...rest}
      data-scale-2xl={enable2xlWidthScaling ? "" : undefined}
      style={mergedStyle}
      className={cn(
        "w-full",
        hasNumericXxlHeight && "h-screen",
        usesViewportMinusHeader &&
          "h-[var(--bps-section-fill-minus-header)] max-h-none",
        !hasCustomHeight && fullHeight && "lg:h-screen",
        !contained && padding,
        !contained && shouldFillChildren,
        className,
      )}
    >
      {contained ? (
        <ContainerSection
          className={cn(padding, enable2xlWidthScaling && "2xl:max-w-480")}
          fillChildren={shouldFillChildren}
        >
          {children}
        </ContainerSection>
      ) : (
        children
      )}
    </section>
  );
}

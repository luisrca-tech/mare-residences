/**
 * Viewport height minus the fixed site header.
 *
 * Expects `--site-header-height` on the document root (px): the full fixed
 * `<header>` box height (including outer padding), synced by the app header.
 * Fallback `3rem` covers SSR before measurement.
 *
 * Use with `Section` `viewportMinusHeader`, or in arbitrary Tailwind:
 * `min-h-[length:var(--bps-section-fill-minus-header)]` after setting that
 * custom property on an ancestor, or paste this calc directly.
 */
export const SECTION_FILL_MINUS_HEADER_HEIGHT =
  "calc(100svh - var(--site-header-height, 3rem))";

/** Scoped name injected on `<Section>` when `viewportMinusHeader` is set. */
export const SECTION_FILL_MINUS_HEADER_VAR = "--bps-section-fill-minus-header";

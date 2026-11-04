// Cover-aware resource widths. These describe painted image pixels, which can
// exceed the visible column when object-fit: cover crops a different aspect ratio.
// Home's viewport minimum includes one normal-flow, measured header. The sizing
// budget uses regular header metrics and conservative height buckets. Nested
// height units in sizes stalled image selection in the mounted browser; buckets
// retain width-aware cover budgets through 1080px, with a taller-screen fallback.
export const heroImageSizes = {
  home: "(min-width: 1440px) and (max-height: 719px) max(calc(100vw - 736px), 751px), (min-width: 1440px) and (max-height: 900px) max(calc(100vw - clamp(508px, 35.277778vw, 677.334px) - 228px), clamp(751px, 52.152778vw, 1001.334px), calc(970.16px - clamp(99.16px, 6.886111vw, 132.214px))), (min-width: 1440px) and (max-height: 1080px) max(calc(100vw - clamp(508px, 35.277778vw, 677.334px) - 228px), clamp(751px, 52.152778vw, 1001.334px), calc(1211.36px - clamp(99.16px, 6.886111vw, 132.214px))), (min-width: 1024px) and (max-height: 900px) 872px, (min-width: 1024px) and (max-height: 1080px) 1113px, (min-width: 1024px) and (max-aspect-ratio: 4/3) 134vh, (min-width: 1024px) 100vw, (min-width: 768px) 751px, max(calc(100vw - 32px), 483px)",
  residences:
    "(min-width: 1440px) and (max-height: 719px) 705px, (min-width: 1440px) calc((min(100vw, 1920px) - 228px) * 0.580859 + 1px), (min-width: 1024px) 55vw, (min-width: 768px) 704px, calc(100vw - 32px)",
  neighborhood:
    "(min-width: 1440px) and (max-height: 719px) 819px, (min-width: 1440px) clamp(819px, 56.875vw, 1092px), (min-width: 1024px) min(819px, 60vw), (min-width: 768px) 819px, max(calc(100vw - 32px), 527px)",
} as const;

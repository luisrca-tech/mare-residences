export type Scroller = {
  raf(time: number): void;
  resize(): void;
  scrollTo(top: number, options: { immediate: boolean; force: boolean }): void;
  stop(): void;
  start(): void;
  destroy(): void;
};
export type BootstrapState = {
  eligible: boolean;
  startedAt: number;
  timer: number;
  savePosition: () => void;
};
export type MotionWindow = Window & { __mareIntro?: BootstrapState };

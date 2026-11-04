import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHeaderHeight } from "./useHeaderHeight";

function Header() {
  const ref = useHeaderHeight();
  return <header ref={ref}>Measured header</header>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty("--site-header-height");
});

describe("useHeaderHeight", () => {
  it("publishes actual header height, updates on resize, and restores the prior value", () => {
    let height = 100;
    let notify = () => {};
    const disconnect = vi.fn();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ height }) as DOMRect,
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const root = document.documentElement;
    root.style.setProperty("--site-header-height", "84px");
    const view = render(<Header />);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(root.style.getPropertyValue("--site-header-height")).toBe("100px");
    act(() => {
      height = 118.5;
      notify();
    });
    expect(root.style.getPropertyValue("--site-header-height")).toBe("118.5px");
    act(() => {
      height = 0;
      notify();
    });
    expect(root.style.getPropertyValue("--site-header-height")).toBe("118.5px");
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(root.style.getPropertyValue("--site-header-height")).toBe("84px");
  });

  it("measures and listens to window resize when ResizeObserver is unavailable", () => {
    let height = 100;
    vi.stubGlobal("ResizeObserver", undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ height }) as DOMRect,
    );
    const view = render(<Header />);
    expect(
      document.documentElement.style.getPropertyValue("--site-header-height"),
    ).toBe("100px");
    act(() => {
      height = 130;
      window.dispatchEvent(new Event("resize"));
    });
    expect(
      document.documentElement.style.getPropertyValue("--site-header-height"),
    ).toBe("130px");
    view.unmount();
    expect(
      document.documentElement.style.getPropertyValue("--site-header-height"),
    ).toBe("");
    act(() => {
      height = 150;
      window.dispatchEvent(new Event("resize"));
    });
    expect(
      document.documentElement.style.getPropertyValue("--site-header-height"),
    ).toBe("");
  });
});

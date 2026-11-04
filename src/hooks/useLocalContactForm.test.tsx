import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalContactForm } from "./useLocalContactForm";
import type { ContactValues } from "@/types/contact";
const valid: ContactValues = {
  name: "李",
  email: "demo@example.com",
  phone: "",
  message: "Mensagem fictícia.",
};
function fill(result: { current: ReturnType<typeof useLocalContactForm> }) {
  for (const key of Object.keys(valid) as (keyof ContactValues)[])
    act(() => result.current.setField(key, valid[key]));
}
beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/contato");
});
afterEach(() => {
  vi.useRealTimers();
});
describe("local contact simulation", () => {
  it("blocks invalid input before scheduling work and clears corrected field errors", () => {
    const { result } = renderHook(() => useLocalContactForm());
    act(() => result.current.submit());
    expect(result.current.status).toBe("invalid");
    expect(Object.keys(result.current.errors)).toEqual([
      "name",
      "email",
      "message",
    ]);
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.setField("name", "李"));
    expect(result.current.errors).not.toHaveProperty("name");
    expect(result.current.errors).toHaveProperty("email");
  });
  it("announces loading, prevents duplicate attempts and clears transient values on success", () => {
    const { result } = renderHook(() => useLocalContactForm());
    fill(result);
    act(() => {
      result.current.submit();
      result.current.submit();
    });
    expect(result.current.status).toBe("loading");
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(1199));
    expect(result.current.status).toBe("loading");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toBe("success");
    expect(result.current.values).toEqual({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
  });
  it("fails the first valid error-once attempt, retains values, and recovers on retry", () => {
    window.history.replaceState(null, "", "/contato?demo=error-once");
    const { result } = renderHook(() => useLocalContactForm());
    fill(result);
    act(() => result.current.submit());
    act(() => vi.advanceTimersByTime(1200));
    expect(result.current.status).toBe("failed");
    expect(result.current.values).toEqual(valid);
    act(() => {
      result.current.submit();
      result.current.submit();
    });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(1200));
    expect(result.current.status).toBe("success");
  });
  it("does not consume an error-once attempt for invalid input", () => {
    window.history.replaceState(null, "", "/contato?demo=error-once");
    const { result } = renderHook(() => useLocalContactForm());
    act(() => result.current.submit());
    fill(result);
    act(() => result.current.submit());
    act(() => vi.advanceTimersByTime(1200));
    expect(result.current.status).toBe("failed");
  });
  it("cancels pending work on unmount", () => {
    const { result, unmount } = renderHook(() => useLocalContactForm());
    fill(result);
    act(() => result.current.submit());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

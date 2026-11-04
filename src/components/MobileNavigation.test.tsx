import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "./MobileNavigation";

describe("mobile navigation", () => {
  it("opens an accessible dialog and closes with Escape, returning focus", async () => {
    render(<MobileNavigation />);
    const trigger = screen.getByRole("button", { name: /Menu/ });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Navegação principal",
    });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement || dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("closes when a navigation destination is selected", async () => {
    render(<MobileNavigation />);
    fireEvent.click(screen.getByRole("button", { name: /Menu/ }));
    const dialog = await screen.findByRole("dialog");
    const home = screen.getByRole("link", { name: "Home" });
    expect(dialog.contains(home)).toBe(true);
    expect(home.getAttribute("href")).toBe("/");
    fireEvent.click(home);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

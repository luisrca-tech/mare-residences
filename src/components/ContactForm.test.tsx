import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./ContactForm";
afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, "", "/contato");
});
describe("contact form accessibility", () => {
  it("focuses failure once and preserves continuous editing before successful retry", () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/contato?demo=error-once");
    render(<ContactForm />);
    const name = screen.getByLabelText("Nome completo") as HTMLInputElement;
    const email = screen.getByLabelText("E-mail") as HTMLInputElement;
    const message = screen.getByLabelText("Mensagem") as HTMLTextAreaElement;
    fireEvent.change(name, { target: { value: "Pessoa Fictícia" } });
    fireEvent.change(email, { target: { value: "pessoa@example.com" } });
    fireEvent.change(message, { target: { value: "Mensagem fictícia." } });
    fireEvent.submit(screen.getByRole("form"));
    act(() => vi.advanceTimersByTime(1200));
    const alert = screen.getByRole("alert");
    expect(document.activeElement).toBe(alert);
    const focus = vi.spyOn(alert, "focus");
    expect(name.value).toBe("Pessoa Fictícia");
    expect(email.value).toBe("pessoa@example.com");
    expect(message.value).toBe("Mensagem fictícia.");
    for (const field of [name, message]) {
      field.focus();
      for (const character of " abc") {
        fireEvent.change(field, { target: { value: field.value + character } });
        expect(document.activeElement).toBe(field);
      }
    }
    expect(name.value).toBe("Pessoa Fictícia abc");
    expect(message.value).toBe("Mensagem fictícia. abc");
    expect(screen.getByRole("alert")).toBe(alert);
    expect(focus).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true");
    act(() => vi.advanceTimersByTime(1200));
    expect(document.activeElement).toBe(screen.getByRole("heading"));
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(
      "nenhum dado foi enviado",
    );
  });
  it("does not expose local values to native form serialization", () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Demo" },
    });
    const form = screen.getByRole("form") as HTMLFormElement;
    expect([...new FormData(form).entries()]).toEqual([]);
  });
  it("associates errors and focuses the first invalid field after each invalid submit", () => {
    render(<ContactForm />);
    fireEvent.submit(screen.getByRole("form"));
    const name = screen.getByLabelText("Nome completo");
    expect(document.activeElement).toBe(name);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("placeholder")).toBe("");
    expect(
      document.getElementById(name.getAttribute("aria-describedby") || "")
        ?.textContent,
    ).toContain("Informe");
    fireEvent.change(name, { target: { value: "李" } });
    fireEvent.submit(screen.getByRole("form"));
    expect(document.activeElement).toBe(screen.getByLabelText("E-mail"));
    expect(screen.getByRole("alert").textContent).toContain("Revise os campos");
  });
  it("focuses simulated success and disables all fields while busy", () => {
    vi.useFakeTimers();
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Demo" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mensagem"), {
      target: { value: "Mensagem fictícia." },
    });
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("form").getAttribute("aria-busy")).toBe("true");
    act(() => vi.advanceTimersByTime(1200));
    expect(document.activeElement).toBe(screen.getByRole("heading"));
    expect(screen.getByRole("status").textContent).toContain(
      "nenhum dado foi enviado",
    );
  });
});

"use client";
import { useEffect, useRef, useState } from "react";
import type { ContactField, ContactState } from "@/types/contact";
import { emptyContactValues, validateContact } from "@/utils/contactValidation";

export function useLocalContactForm() {
  const [state, setState] = useState<ContactState>({
    values: { ...emptyContactValues },
    errors: {},
    status: "idle",
  });
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false);
  const attempts = useRef(0);
  useEffect(
    () => () => {
      if (pending.current !== null) clearTimeout(pending.current);
    },
    [],
  );

  const setField = (key: ContactField, value: string) => {
    if (locked.current) return;
    setState((previous) => {
      const values = { ...previous.values, [key]: value };
      const errors = { ...previous.errors };
      if (errors[key]) {
        const error = validateContact(values).errors[key];
        if (error) errors[key] = error;
        else delete errors[key];
      }
      return {
        ...previous,
        values,
        errors,
        status:
          previous.status === "invalid" && !Object.keys(errors).length
            ? "idle"
            : previous.status,
      };
    });
  };

  const submit = () => {
    if (locked.current || state.status === "success") return;
    const result = validateContact(state.values);
    if (Object.keys(result.errors).length) {
      setState({ ...result, status: "invalid" });
      return;
    }
    locked.current = true;
    attempts.current += 1;
    const fail =
      new URLSearchParams(window.location.search).get("demo") ===
        "error-once" && attempts.current === 1;
    setState({ ...result, status: "loading" });
    pending.current = setTimeout(() => {
      pending.current = null;
      locked.current = false;
      setState({
        values: fail ? result.values : { ...emptyContactValues },
        errors: {},
        status: fail ? "failed" : "success",
      });
    }, 1200);
  };
  return { ...state, setField, submit };
}

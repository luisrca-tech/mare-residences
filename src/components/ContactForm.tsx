"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { content } from "@/data/content";
import { useLocalContactForm } from "@/hooks/useLocalContactForm";
import type { ContactField } from "@/types/contact";

export function ContactForm() {
  const form = useLocalContactForm();
  const copy = content.contact.form;
  const busy = form.status === "loading";
  const invalid = Object.keys(form.errors).length > 0;
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const focusAfterSubmit = useRef(false);
  useEffect(() => {
    if (form.status === "success") successRef.current?.focus();
    if (form.status === "failed")
      formRef.current
        ?.querySelector<HTMLElement>("[data-simulation-error]")
        ?.focus();
  }, [form.status]);
  useEffect(() => {
    if (form.status === "invalid" && focusAfterSubmit.current) {
      const first = Object.keys(form.errors)[0];
      formRef.current?.querySelector<HTMLElement>("#contact-" + first)?.focus();
    }
    focusAfterSubmit.current = false;
  }, [form.errors, form.status]);
  if (form.status === "success")
    return (
      <div
        data-form-state="success"
        className="flex min-w-0 flex-col wrap-anywhere items-start gap-6"
      >
        <p className="type-label">{copy.success.label}</p>
        <h2
          ref={successRef}
          tabIndex={-1}
          data-success-title
          className="type-success"
        >
          {copy.success.title}
        </h2>
        <p className="type-body">{copy.success.body}</p>
        <p className="type-help text-muted" role="status">
          {copy.success.note}
        </p>
        <Link
          href={copy.success.button.href}
          prefetch={false}
          className="type-button flex min-h-[calc(52px*var(--layout-scale))] w-[calc(230px*var(--layout-scale))] max-w-full items-center bg-petrol px-5 py-4 text-ivory"
        >
          {copy.success.button.label}
        </Link>
      </div>
    );
  return (
    <form
      ref={formRef}
      data-form-state={form.status}
      noValidate
      aria-label="Formulário de contato"
      aria-busy={busy}
      aria-describedby="contact-form-note"
      className="flex min-w-0 flex-col wrap-anywhere gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        focusAfterSubmit.current = true;
        form.submit();
      }}
    >
      {invalid && (
        <div
          role="alert"
          tabIndex={-1}
          data-error-summary
          className="type-small text-error"
        >
          <p>{copy.summary}</p>
          <ul className="sr-only">
            {copy.fields
              .filter((field) => form.errors[field.key as ContactField])
              .map((field) => (
                <li key={field.key}>
                  {field.label}: {form.errors[field.key as ContactField]}
                </li>
              ))}
          </ul>
        </div>
      )}
      {form.status === "failed" && (
        <p
          role="alert"
          tabIndex={-1}
          data-simulation-error
          className="type-small text-error"
        >
          {copy.failure}
        </p>
      )}
      <fieldset disabled={busy} className="contents">
        <legend className="sr-only">Seus planos</legend>
        {copy.fields.map((field) => {
          const key = field.key as ContactField;
          const id = "contact-" + key;
          const required = key !== "phone";
          const attrs = {
            id,
            // Local values are never serialized as native transport fields.
            required,
            value: form.values[key],
            placeholder: form.errors[key] ? "" : field.placeholder,
            "aria-invalid": !!form.errors[key],
            "aria-describedby": form.errors[key] ? id + "-error" : undefined,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => form.setField(key, event.target.value),
            className:
              "type-field box-border w-full rounded-none border px-4 py-[14px] text-petrol placeholder:text-muted disabled:opacity-75 " +
              (form.errors[key]
                ? "border-error bg-error-surface"
                : "border-muted bg-paper"),
          };
          return (
            <div
              key={key}
              className="flex min-w-0 flex-col wrap-anywhere gap-2"
            >
              <label htmlFor={id} className="type-nav">
                {field.label}
              </label>
              {key === "message" ? (
                <textarea
                  {...attrs}
                  rows={3}
                  className={
                    attrs.className +
                    " min-h-[calc(102px*var(--layout-scale))] resize-y"
                  }
                />
              ) : (
                <input
                  {...attrs}
                  type={
                    key === "email" ? "email" : key === "phone" ? "tel" : "text"
                  }
                  autoComplete={key === "phone" ? "tel" : key}
                />
              )}
              {form.errors[key] && (
                <p id={id + "-error"} className="type-help text-error">
                  {form.errors[key]}
                </p>
              )}
            </div>
          );
        })}
        <p className="type-help text-muted">
          {copy.privacy.lead}
          <Link href={copy.privacy.link.href} prefetch={false}>
            {copy.privacy.link.label}
          </Link>
          {copy.privacy.end}
        </p>
        <button
          disabled={busy}
          type="submit"
          className="type-button flex min-h-[calc(52px*var(--layout-scale))] w-full cursor-pointer items-center bg-petrol px-5 py-4 text-left text-ivory disabled:cursor-wait disabled:opacity-75"
        >
          {busy ? copy.loading : copy.submit}
        </button>
      </fieldset>
      <p
        role="status"
        aria-live="polite"
        className={busy ? "type-help text-muted" : "sr-only"}
      >
        {busy ? copy.loadingStatus : ""}
      </p>
      <p id="contact-form-note" className="type-caption text-muted">
        {copy.note}
      </p>
    </form>
  );
}

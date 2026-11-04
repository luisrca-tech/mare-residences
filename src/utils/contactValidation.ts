import { content } from "@/data/content";
import type { ContactErrors, ContactValues } from "@/types/contact";

export const emptyContactValues: ContactValues = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function isEmail(value: string) {
  const parts = value.split("@");
  if (parts.length !== 2 || value.length > 254) return false;
  const [local, domain] = parts;
  if (
    !local ||
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_{}|~\x60-]+$/.test(local)
  )
    return false;
  const labels = domain.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length <= 63 &&
        /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label),
    )
  );
}

export function validateContact(input: ContactValues) {
  const values: ContactValues = {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    message: input.message.trim(),
  };
  const errors: ContactErrors = {};
  const copy = content.contact.form.errors;
  if (!values.name) errors.name = copy.name;
  else if ([...values.name].length > 120) errors.name = copy.nameLength;
  if (!isEmail(values.email)) errors.email = copy.email;
  const digits = values.phone.replace(/\D/g, "");
  if (
    values.phone &&
    (values.phone.length > 40 ||
      digits.length < 7 ||
      digits.length > 15 ||
      !/^\+?(?:[\d .-]|\(\d+\))+$/.test(values.phone))
  )
    errors.phone = copy.phone;
  if (!values.message) errors.message = copy.message;
  else if ([...values.message].length > 5000)
    errors.message = copy.messageLength;
  return { values, errors };
}

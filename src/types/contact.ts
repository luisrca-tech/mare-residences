export type ContactField = "name" | "email" | "phone" | "message";
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;
export type ContactStatus =
  | "idle"
  | "invalid"
  | "loading"
  | "failed"
  | "success";
export type ContactState = {
  values: ContactValues;
  errors: ContactErrors;
  status: ContactStatus;
};

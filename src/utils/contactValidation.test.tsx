import { describe, expect, it } from "vitest";
import { validateContact } from "./contactValidation";

const valid = {
  name: "Maria Exemplo",
  email: "maria@example.com",
  phone: "",
  message: "Um lar para ler e receber amigos.",
};
describe("local contact validation", () => {
  it("trims all values without changing internal content", () => {
    const result = validateContact({
      name: " 李 ",
      email: " maria+demo@example.com ",
      phone: " +55 (11) 99999-0000 ",
      message: " Olá\n mundo! ",
    });
    expect(result.values).toEqual({
      name: "李",
      email: "maria+demo@example.com",
      phone: "+55 (11) 99999-0000",
      message: "Olá\n mundo!",
    });
    expect(result.errors).toEqual({});
  });
  it.each([
    "Prince",
    "李",
    "Nguyễn Thị An",
    "O’Connor",
    "مريم",
  ])("accepts a nonempty name without a cultural word rule: %s", (name) => {
    expect(validateContact({ ...valid, name }).errors).toEqual({});
  });
  it.each(["", "  ", "\t\n"])("rejects blank required values: %s", (blank) => {
    expect(
      Object.keys(
        validateContact({
          name: blank,
          email: blank,
          phone: "",
          message: blank,
        }).errors,
      ),
    ).toEqual(["name", "email", "message"]);
  });
  it("accepts exact name/message boundaries and rejects values above them", () => {
    expect(
      validateContact({
        ...valid,
        name: "a".repeat(120),
        message: "a".repeat(5000),
      }).errors,
    ).toEqual({});
    expect(
      Object.keys(
        validateContact({
          ...valid,
          name: "a".repeat(121),
          message: "a".repeat(5001),
        }).errors,
      ),
    ).toEqual(["name", "message"]);
  });
  it.each([
    "maria@",
    "a b@example.com",
    ".a@example.com",
    "a..b@example.com",
    "a@-example.com",
    "a@example",
    "a@exam_ple.com",
    "a@a..com",
    "a".repeat(65) + "@example.com",
  ])("rejects malformed practical email: %s", (email) => {
    expect(validateContact({ ...valid, email }).errors).toHaveProperty("email");
  });
  it.each([
    "a+b@example.com",
    "first.last@sub.example.com",
    "x@xn--bcher-kva.example",
  ])("accepts common email syntax: %s", (email) => {
    expect(validateContact({ ...valid, email }).errors).toEqual({});
  });
  it.each([
    "",
    " +55 (11) 99999-0000 ",
    "202.555.0100",
    "1234567",
    "+123456789012345",
  ])("accepts optional/practical telephone: %s", (phone) => {
    expect(validateContact({ ...valid, phone }).errors).toEqual({});
  });
  it.each([
    "123",
    "abc1234567",
    "++5511999990000",
    "1234567890123456",
    "(123456789",
    "123)456789",
    "()123456789",
  ])("rejects invalid telephone input: %s", (phone) => {
    expect(validateContact({ ...valid, phone }).errors).toHaveProperty("phone");
  });
});

import { describe, expect, it } from "vitest";
import { cleanOtp, normalizeBdPhone, normalizeEmail } from "../src/contact";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => expect(normalizeEmail("  Rafi@Gmail.COM ")).toBe("rafi@gmail.com"));
  it("rejects junk", () => {
    expect(normalizeEmail("rafi")).toBeNull();
    expect(normalizeEmail("rafi@gmail")).toBeNull();
    expect(normalizeEmail("a b@c.com")).toBeNull();
  });
});

describe("normalizeBdPhone", () => {
  it("accepts local, 88 and +88 forms", () => {
    for (const p of ["01712345678", "8801712345678", "+8801712345678", "+880 1712-345678"]) expect(normalizeBdPhone(p)).toBe("+8801712345678");
  });
  it("rejects non-mobile and wrong length", () => {
    expect(normalizeBdPhone("01212345678")).toBeNull();
    expect(normalizeBdPhone("0171234567")).toBeNull();
    expect(normalizeBdPhone("+447911123456")).toBeNull();
  });
});

describe("cleanOtp", () => {
  it("keeps 6-10 digits", () => {
    expect(cleanOtp(" 123 456 ")).toBe("123456");
    expect(cleanOtp("12345")).toBeNull();
    expect(cleanOtp("12a456")).toBeNull();
  });
});

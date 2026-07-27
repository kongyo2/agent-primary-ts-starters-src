import { describe, it, expect } from "vitest";
import { toErrorMessage } from "./errors.ts";

describe("toErrorMessage", () => {
  it("returns the message of an Error", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the message of an Error subclass", () => {
    class Custom extends Error {}
    expect(toErrorMessage(new Custom("custom boom"))).toBe("custom boom");
  });

  it("stringifies a thrown non-Error instead of yielding undefined", () => {
    expect(toErrorMessage("plain string")).toBe("plain string");
    expect(toErrorMessage({ code: 1 })).toBe("[object Object]");
    expect(toErrorMessage(undefined)).toBe("undefined");
  });
});

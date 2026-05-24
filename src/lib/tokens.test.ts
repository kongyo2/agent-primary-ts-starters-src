import { describe, it, expect } from "vitest";
import { estimateTokenCount } from "./tokens.ts";

describe("estimateTokenCount", () => {
  it("returns 0 for an empty string", () => {
    expect(estimateTokenCount("")).toBe(0);
  });

  it("returns ceil(length/4) for short text", () => {
    expect(estimateTokenCount("abc")).toBe(1);
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(estimateTokenCount("abcde")).toBe(2);
  });

  it("scales linearly for longer text", () => {
    const text = "a".repeat(400);
    expect(estimateTokenCount(text)).toBe(100);
  });
});

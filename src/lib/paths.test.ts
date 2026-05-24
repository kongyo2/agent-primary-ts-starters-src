import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { PACKAGE_ROOT, SKILLS_DIR, DATA_DIR, INDEX_FILE, PACKAGE_JSON } from "./paths.ts";

describe("paths", () => {
  it("PACKAGE_ROOT contains package.json", () => {
    expect(existsSync(PACKAGE_JSON)).toBe(true);
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as { name: string };
    expect(pkg.name).toBe("@kongyo2/apts");
  });

  it("SKILLS_DIR resolves to <root>/skills", () => {
    expect(SKILLS_DIR.endsWith("skills")).toBe(true);
    expect(SKILLS_DIR.startsWith(PACKAGE_ROOT)).toBe(true);
  });

  it("DATA_DIR is under src", () => {
    expect(DATA_DIR.startsWith(PACKAGE_ROOT)).toBe(true);
    expect(DATA_DIR.includes("data")).toBe(true);
  });

  it("INDEX_FILE lives in DATA_DIR with the expected name", () => {
    expect(INDEX_FILE.startsWith(DATA_DIR)).toBe(true);
    expect(INDEX_FILE.endsWith("skills.index.json.gz")).toBe(true);
  });
});

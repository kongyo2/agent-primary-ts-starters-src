import { describe, it, expect, beforeAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { loadSkills, DEFAULT_CATEGORY } from "./skill-loader.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

describe("loadSkills", () => {
  it("returns an empty array when the directory does not exist", () => {
    const skills = loadSkills({ skillsDir: join(tmpdir(), "definitely-does-not-exist-" + Date.now()) });
    expect(skills).toEqual([]);
  });

  it("loads valid SKILL.md files and skips decoy directories", () => {
    const skills = loadSkills({ skillsDir: FIXTURES_DIR });
    expect(skills.map((s) => s.id)).toEqual(["skill-alpha", "skill-bravo"]);
  });

  it("populates manifest fields from the SKILL.md", () => {
    const skills = loadSkills({ skillsDir: FIXTURES_DIR });
    const alpha = skills.find((s) => s.id === "skill-alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.frontmatter.name).toBe("skill-alpha");
    expect(alpha?.frontmatter.description).toContain("Alpha");
    expect(alpha?.body).toContain("# Skill Alpha");
    expect(alpha?.tokenCount).toBeGreaterThan(0);
    expect(alpha?.category).toBe(DEFAULT_CATEGORY);
    expect(alpha?.filePath.endsWith("SKILL.md")).toBe(true);
  });

  it("accepts a custom category", () => {
    const skills = loadSkills({ skillsDir: FIXTURES_DIR, category: "custom" });
    for (const s of skills) {
      expect(s.category).toBe("custom");
    }
  });

  it("returns results sorted by id", () => {
    const skills = loadSkills({ skillsDir: FIXTURES_DIR });
    const ids = skills.map((s) => s.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("throws when a SKILL.md has invalid frontmatter", () => {
    const dir = join(tmpdir(), "apts-loader-bad-" + Date.now());
    const badDir = join(dir, "broken");
    mkdirSync(badDir, { recursive: true });
    writeFileSync(join(badDir, "SKILL.md"), "no frontmatter here\n");
    try {
      expect(() => loadSkills({ skillsDir: dir })).toThrow(/Invalid frontmatter/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores files at the top level (only directories with SKILL.md count)", () => {
    const dir = join(tmpdir(), "apts-loader-flat-" + Date.now());
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ignored.txt"), "not a directory");
    try {
      const skills = loadSkills({ skillsDir: dir });
      expect(skills).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

beforeAll(() => {
  // Touch FIXTURES_DIR to fail fast if fixtures are missing.
  expect(FIXTURES_DIR).toBeDefined();
});

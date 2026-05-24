import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncSkills, DEFAULT_SKILL_DIRS } from "./skill-syncer.ts";

function makeTempSource(skills: Array<{ name: string; body?: string }>): string {
  const root = join(tmpdir(), `apts-syncer-src-${Date.now()}-${Math.random()}`);
  for (const { name, body = "---\nname: x\ndescription: d\n---\nbody\n" } of skills) {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), body);
  }
  return root;
}

describe("syncSkills", () => {
  it("copies the listed SKILL.md files into the destination", () => {
    const source = makeTempSource([{ name: "a" }, { name: "b" }]);
    const dest = join(tmpdir(), `apts-syncer-dest-${Date.now()}-${Math.random()}`);
    try {
      const result = syncSkills({ sourceDir: source, destDir: dest, skillDirs: ["a", "b"] });
      expect(result.copied).toEqual(["a", "b"]);
      expect(existsSync(join(dest, "a", "SKILL.md"))).toBe(true);
      expect(existsSync(join(dest, "b", "SKILL.md"))).toBe(true);
      expect(readFileSync(join(dest, "a", "SKILL.md"), "utf8")).toContain("body");
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("clears the destination before copying so removed skills do not linger", () => {
    const source = makeTempSource([{ name: "a" }]);
    const dest = join(tmpdir(), `apts-syncer-clear-${Date.now()}-${Math.random()}`);
    mkdirSync(join(dest, "stale"), { recursive: true });
    writeFileSync(join(dest, "stale", "SKILL.md"), "old");
    try {
      syncSkills({ sourceDir: source, destDir: dest, skillDirs: ["a"] });
      expect(existsSync(join(dest, "stale"))).toBe(false);
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("throws if the source directory is missing", () => {
    const missing = join(tmpdir(), `apts-syncer-missing-${Date.now()}`);
    const dest = join(tmpdir(), `apts-syncer-dest-missing-${Date.now()}`);
    expect(() => syncSkills({ sourceDir: missing, destDir: dest })).toThrow(/not found/);
  });

  it("throws if an expected skill SKILL.md is missing", () => {
    const source = makeTempSource([{ name: "a" }]);
    const dest = join(tmpdir(), `apts-syncer-skill-missing-${Date.now()}-${Math.random()}`);
    try {
      expect(() => syncSkills({ sourceDir: source, destDir: dest, skillDirs: ["a", "b"] })).toThrow(/not found/);
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it("uses the DEFAULT_SKILL_DIRS when none provided", () => {
    const source = makeTempSource(DEFAULT_SKILL_DIRS.map((name) => ({ name })));
    const dest = join(tmpdir(), `apts-syncer-default-${Date.now()}-${Math.random()}`);
    try {
      const result = syncSkills({ sourceDir: source, destDir: dest });
      expect(result.copied).toEqual([...DEFAULT_SKILL_DIRS]);
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });
});

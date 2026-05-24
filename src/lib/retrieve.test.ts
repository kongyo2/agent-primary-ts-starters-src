import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { retrieveSkill } from "./retrieve.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

describe("retrieveSkill", () => {
  it("returns the manifest for a known id", () => {
    const skill = retrieveSkill({ skillsDir: FIXTURES_DIR, id: "skill-alpha" });
    expect(skill.id).toBe("skill-alpha");
    expect(skill.content).toContain("# Skill Alpha");
  });

  it("forwards the category to the loader when provided", () => {
    const skill = retrieveSkill({ skillsDir: FIXTURES_DIR, id: "skill-alpha", category: "x" });
    expect(skill.category).toBe("x");
  });

  it("throws a descriptive error for an unknown id", () => {
    expect(() => retrieveSkill({ skillsDir: FIXTURES_DIR, id: "nope" })).toThrow(/nope/);
  });
});

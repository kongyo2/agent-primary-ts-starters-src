import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listSkills } from "./list.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

describe("listSkills", () => {
  it("returns a summary for each skill", () => {
    const items = listSkills({ skillsDir: FIXTURES_DIR });
    expect(items.map((i) => i.id)).toEqual(["skill-alpha", "skill-bravo"]);
    for (const item of items) {
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.tokenCount).toBeGreaterThan(0);
    }
  });

  it("forwards the category to the loader", () => {
    const items = listSkills({ skillsDir: FIXTURES_DIR, category: "z" });
    for (const item of items) expect(item.category).toBe("z");
  });
});

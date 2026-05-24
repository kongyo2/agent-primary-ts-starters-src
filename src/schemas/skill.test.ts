import { describe, it, expect } from "vitest";
import {
  SkillFrontmatterSchema,
  SkillManifestSchema,
  SearchResultSchema,
  IndexedSkillSchema,
  SkillIndexSchema,
  SkillListItemSchema,
} from "./skill.ts";

describe("SkillFrontmatterSchema", () => {
  it("accepts valid frontmatter", () => {
    const parsed = SkillFrontmatterSchema.parse({ name: "x", description: "desc" });
    expect(parsed).toEqual({ name: "x", description: "desc" });
  });

  it("rejects empty strings", () => {
    expect(SkillFrontmatterSchema.safeParse({ name: "", description: "d" }).success).toBe(false);
    expect(SkillFrontmatterSchema.safeParse({ name: "n", description: "" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(SkillFrontmatterSchema.safeParse({ name: "n" }).success).toBe(false);
  });
});

describe("SkillManifestSchema", () => {
  it("accepts a complete manifest", () => {
    const ok = SkillManifestSchema.safeParse({
      id: "x",
      category: "c",
      frontmatter: { name: "x", description: "d" },
      body: "",
      content: "---",
      filePath: "/tmp/SKILL.md",
      tokenCount: 0,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects negative tokenCount", () => {
    const bad = SkillManifestSchema.safeParse({
      id: "x",
      category: "c",
      frontmatter: { name: "x", description: "d" },
      body: "",
      content: "",
      filePath: "/tmp/SKILL.md",
      tokenCount: -1,
    });
    expect(bad.success).toBe(false);
  });
});

describe("SearchResultSchema", () => {
  it("accepts a result", () => {
    const ok = SearchResultSchema.safeParse({
      id: "x",
      description: "d",
      category: "c",
      tokenCount: 5,
      similarity: 0.42,
    });
    expect(ok.success).toBe(true);
  });
});

describe("IndexedSkillSchema", () => {
  it("requires a vector array", () => {
    const ok = IndexedSkillSchema.safeParse({
      id: "x",
      description: "d",
      category: "c",
      tokenCount: 5,
      vector: [0.1, 0.2],
    });
    expect(ok.success).toBe(true);

    const bad = IndexedSkillSchema.safeParse({
      id: "x",
      description: "d",
      category: "c",
      tokenCount: 5,
      vector: "not-an-array",
    });
    expect(bad.success).toBe(false);
  });
});

describe("SkillIndexSchema", () => {
  it("accepts a valid index", () => {
    const ok = SkillIndexSchema.safeParse({
      modelId: "m",
      vectorDimension: 384,
      skills: [],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects zero or negative dimensions", () => {
    expect(SkillIndexSchema.safeParse({ modelId: "m", vectorDimension: 0, skills: [] }).success).toBe(false);
  });
});

describe("SkillListItemSchema", () => {
  it("accepts a list item", () => {
    const ok = SkillListItemSchema.safeParse({
      id: "x",
      category: "c",
      description: "d",
      tokenCount: 10,
    });
    expect(ok.success).toBe(true);
  });
});

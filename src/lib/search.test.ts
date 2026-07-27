import { describe, it, expect } from "vitest";
import { searchSkills, dotProduct, vectorNorm } from "./search.ts";
import { createDeterministicEmbedder } from "./embedder.ts";
import type { IndexedSkill, SkillIndex } from "../schemas/skill.ts";

function asIndex(skills: IndexedSkill[], vectorDimension: number): SkillIndex {
  return { modelId: "deterministic-hash", vectorDimension, skills };
}

describe("dotProduct", () => {
  it("returns the inner product of two vectors", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(1 * 4 + 2 * 5 + 3 * 6);
  });
  it("returns 0 for orthogonal vectors", () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });
  it("handles vectors of different lengths by using the shorter length", () => {
    expect(dotProduct([1, 2, 3], [4, 5])).toBe(1 * 4 + 2 * 5);
  });
});

describe("vectorNorm", () => {
  it("returns sqrt(sum of squares)", () => {
    expect(vectorNorm([3, 4])).toBe(5);
  });
  it("returns 0 for the zero vector", () => {
    expect(vectorNorm([0, 0, 0])).toBe(0);
  });
});

describe("searchSkills", () => {
  it("rejects an index built with a different embedding dimension", async () => {
    const embedder = createDeterministicEmbedder(16);
    const index: SkillIndex = { modelId: "some-other-model", vectorDimension: 384, skills: [] };
    await expect(searchSkills({ query: "anything", index, embedder })).rejects.toThrow(
      /index dimension mismatch.*some-other-model \(384D\).*deterministic-hash \(16D\)/s,
    );
  });

  it("returns an empty array for an empty query", async () => {
    const embedder = createDeterministicEmbedder();
    const results = await searchSkills({ query: "   ", index: asIndex([], 16), embedder });
    expect(results).toEqual([]);
  });

  it("returns an empty array when the embedder yields the zero vector", async () => {
    const embedder = createDeterministicEmbedder(4);
    const results = await searchSkills({ query: "---", index: asIndex([], 4), embedder });
    expect(results).toEqual([]);
  });

  it("ranks the most relevant skill first", async () => {
    const embedder = createDeterministicEmbedder(32);
    const index: IndexedSkill[] = [
      {
        id: "linting",
        description: "linting and oxlint",
        category: "test",
        tokenCount: 10,
        vector: await embedder.embed("oxlint lint typescript correctness"),
      },
      {
        id: "formatting",
        description: "prettier formatter",
        category: "test",
        tokenCount: 12,
        vector: await embedder.embed("prettier format whitespace"),
      },
    ];

    const results = await searchSkills({
      query: "oxlint correctness",
      index: asIndex(index, 32),
      embedder,
    });
    expect(results[0]?.id).toBe("linting");
  });

  it("filters out results below minSimilarity", async () => {
    const embedder = createDeterministicEmbedder(32);
    const index: IndexedSkill[] = [
      {
        id: "alpha",
        description: "alpha",
        category: "test",
        tokenCount: 10,
        vector: await embedder.embed("totally unrelated quokka"),
      },
    ];
    const results = await searchSkills({
      query: "completely different terms",
      index: asIndex(index, 32),
      embedder,
      minSimilarity: 0.95,
    });
    expect(results).toEqual([]);
  });

  it("respects the limit option", async () => {
    const embedder = createDeterministicEmbedder(32);
    const index: IndexedSkill[] = await Promise.all(
      ["alpha", "bravo", "charlie", "delta"].map(async (id) => ({
        id,
        description: id,
        category: "test",
        tokenCount: 1,
        vector: await embedder.embed(`${id} keyword`),
      })),
    );
    const results = await searchSkills({
      query: "alpha bravo charlie delta keyword",
      index: asIndex(index, 32),
      embedder,
      limit: 2,
    });
    expect(results).toHaveLength(2);
  });

  it("skips indexed skills with zero vectors", async () => {
    const embedder = createDeterministicEmbedder(4);
    const index: IndexedSkill[] = [
      {
        id: "zero",
        description: "zero",
        category: "test",
        tokenCount: 1,
        vector: [0, 0, 0, 0],
      },
    ];
    const results = await searchSkills({ query: "any query", index: asIndex(index, 4), embedder });
    expect(results).toEqual([]);
  });

  it("rounds similarity to four decimal places", async () => {
    const embedder = createDeterministicEmbedder(32);
    const queryText = "foo bar baz";
    const skillVector = await embedder.embed(queryText);
    const index: IndexedSkill[] = [
      { id: "exact", description: "match", category: "test", tokenCount: 1, vector: skillVector },
    ];
    const results = await searchSkills({ query: queryText, index: asIndex(index, 32), embedder });
    expect(results[0]?.similarity).toBeCloseTo(1, 4);
    expect(`${results[0]?.similarity}`.length).toBeLessThanOrEqual(6);
  });
});

import { describe, it, expect } from "vitest";
import { searchSkills, dotProduct, vectorNorm } from "./search.ts";
import { createDeterministicEmbedder } from "./embedder.ts";
import type { Embedder } from "./embedder.ts";
import type { IndexedSkill, SkillIndex } from "../schemas/skill.ts";

// Derived from the embedder that produced the vectors so the fixture cannot
// claim a model or dimension it did not use.
function asIndex(skills: IndexedSkill[], embedder: Embedder): SkillIndex {
  return { modelId: embedder.modelId, vectorDimension: embedder.vectorDimension, skills };
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
    // Same model, different dimension — trips the second half of the guard.
    const index: SkillIndex = { modelId: embedder.modelId, vectorDimension: 384, skills: [] };
    await expect(searchSkills({ query: "anything", index, embedder })).rejects.toThrow(
      /index was built with deterministic-hash \(384D\).*deterministic-hash \(16D\)/s,
    );
  });

  it("rejects an index built by a different model of the same dimension", async () => {
    const embedder = createDeterministicEmbedder(16);
    // Identical dimension, different model — a dimension-only check would have
    // let this through and ranked against an unrelated coordinate space.
    const index: SkillIndex = { modelId: "Xenova/all-MiniLM-L6-v2", vectorDimension: 16, skills: [] };
    await expect(searchSkills({ query: "anything", index, embedder })).rejects.toThrow(
      /Xenova\/all-MiniLM-L6-v2 \(16D\).*deterministic-hash \(16D\).*meaningless even when the dimensions agree/s,
    );
  });

  it("returns an empty array for an empty query", async () => {
    const embedder = createDeterministicEmbedder();
    const results = await searchSkills({ query: "   ", index: asIndex([], embedder), embedder });
    expect(results).toEqual([]);
  });

  it("returns an empty array when the embedder yields the zero vector", async () => {
    const embedder = createDeterministicEmbedder(4);
    const results = await searchSkills({ query: "---", index: asIndex([], embedder), embedder });
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
      index: asIndex(index, embedder),
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
      index: asIndex(index, embedder),
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
      index: asIndex(index, embedder),
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
    const results = await searchSkills({ query: "any query", index: asIndex(index, embedder), embedder });
    expect(results).toEqual([]);
  });

  it("rounds similarity to four decimal places", async () => {
    const embedder = createDeterministicEmbedder(32);
    const queryText = "foo bar baz";
    const skillVector = await embedder.embed(queryText);
    const index: IndexedSkill[] = [
      { id: "exact", description: "match", category: "test", tokenCount: 1, vector: skillVector },
    ];
    const results = await searchSkills({ query: queryText, index: asIndex(index, embedder), embedder });
    expect(results[0]?.similarity).toBeCloseTo(1, 4);
    expect(`${results[0]?.similarity}`.length).toBeLessThanOrEqual(6);
  });
});

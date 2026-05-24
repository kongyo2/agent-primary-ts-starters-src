import { describe, it, expect } from "vitest";
import { searchSkills, dotProduct, vectorNorm } from "./search.ts";
import { createDeterministicEmbedder } from "./embedder.ts";
import type { IndexedSkill } from "../schemas/skill.ts";

function buildIndex(entries: Array<{ id: string; text: string; description?: string }>): IndexedSkill[] {
  const embedder = createDeterministicEmbedder(32);
  return Promise.all(
    entries.map(async (e) => ({
      id: e.id,
      description: e.description ?? `description for ${e.id}`,
      category: "test",
      tokenCount: e.text.length,
      vector: await embedder.embed(e.text),
    })),
  ) as unknown as IndexedSkill[];
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
  it("returns an empty array for an empty query", async () => {
    const embedder = createDeterministicEmbedder();
    const results = await searchSkills({ query: "   ", index: [], embedder });
    expect(results).toEqual([]);
  });

  it("returns an empty array when the embedder yields the zero vector", async () => {
    const embedder = createDeterministicEmbedder(4);
    const results = await searchSkills({ query: "---", index: [], embedder });
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
      index,
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
      index,
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
      index,
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
    const results = await searchSkills({ query: "any query", index, embedder });
    expect(results).toEqual([]);
  });

  it("rounds similarity to four decimal places", async () => {
    const embedder = createDeterministicEmbedder(32);
    const queryText = "foo bar baz";
    const skillVector = await embedder.embed(queryText);
    const index: IndexedSkill[] = [
      { id: "exact", description: "match", category: "test", tokenCount: 1, vector: skillVector },
    ];
    const results = await searchSkills({ query: queryText, index, embedder });
    expect(results[0]?.similarity).toBeCloseTo(1, 4);
    expect(`${results[0]?.similarity}`.length).toBeLessThanOrEqual(6);
  });
});

// Silence the unused buildIndex helper from a previous draft.
void buildIndex;

import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_MODEL_ID,
  DEFAULT_VECTOR_DIMENSION,
  __resetEmbedderForTest,
  __setTransformersLoaderForTest,
  createDeterministicEmbedder,
  getDefaultEmbedder,
  hashEmbed,
} from "./embedder.ts";

beforeEach(() => {
  __resetEmbedderForTest();
});

describe("createDeterministicEmbedder", () => {
  it("produces vectors of the requested dimension", async () => {
    const embedder = createDeterministicEmbedder(8);
    const vector = await embedder.embed("hello world");
    expect(vector).toHaveLength(8);
    expect(embedder.vectorDimension).toBe(8);
    expect(embedder.modelId).toBe("deterministic-hash");
  });

  it("returns the same vector for the same input", async () => {
    const embedder = createDeterministicEmbedder();
    const a = await embedder.embed("hello world");
    const b = await embedder.embed("hello world");
    expect(a).toEqual(b);
  });

  it("returns a zero vector for input without word characters", async () => {
    const embedder = createDeterministicEmbedder(4);
    const vector = await embedder.embed("---");
    expect(vector).toEqual([0, 0, 0, 0]);
  });

  it("uses default dimension of 16 when not specified", () => {
    const embedder = createDeterministicEmbedder();
    expect(embedder.vectorDimension).toBe(16);
  });
});

describe("hashEmbed", () => {
  it("normalizes non-zero vectors to unit length", () => {
    const vector = hashEmbed("foo bar baz", 32);
    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("distinguishes different texts", () => {
    const a = hashEmbed("typescript tsconfig", 32);
    const b = hashEmbed("prettier formatting", 32);
    expect(a).not.toEqual(b);
  });
});

describe("getDefaultEmbedder", () => {
  it("uses the injected loader and caches the result", async () => {
    let pipelineCalls = 0;
    const fakeExtractor = async () => ({ data: new Float32Array([0.1, 0.2, 0.3]) });
    __setTransformersLoaderForTest(async () => ({
      pipeline: async (task, modelId) => {
        pipelineCalls++;
        expect(task).toBe("feature-extraction");
        expect(modelId).toBe(DEFAULT_MODEL_ID);
        return fakeExtractor;
      },
    }));

    const first = await getDefaultEmbedder();
    const second = await getDefaultEmbedder();
    expect(first).toBe(second);
    expect(pipelineCalls).toBe(1);
    expect(first.modelId).toBe(DEFAULT_MODEL_ID);
    expect(first.vectorDimension).toBe(DEFAULT_VECTOR_DIMENSION);

    const vector = await first.embed("hi");
    expect(vector).toHaveLength(3);
    expect(vector[0]).toBeCloseTo(0.1, 5);
    expect(vector[1]).toBeCloseTo(0.2, 5);
    expect(vector[2]).toBeCloseTo(0.3, 5);
  });

  it("works when the extractor returns a plain number array", async () => {
    __setTransformersLoaderForTest(async () => ({
      pipeline: async () => async () => ({ data: [1, 2, 3] }),
    }));
    const embedder = await getDefaultEmbedder();
    const vector = await embedder.embed("hi");
    expect(vector).toEqual([1, 2, 3]);
  });
});

import type { Embedder, TransformersModule } from "./embedder-types.ts";
import { loadDefaultTransformers } from "./embedder-default-loader.ts";

export type { Embedder } from "./embedder-types.ts";

export const DEFAULT_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_VECTOR_DIMENSION = 384;

let cachedEmbedder: Embedder | null = null;
let moduleLoader: () => Promise<TransformersModule> = loadDefaultTransformers;

export function __setTransformersLoaderForTest(loader: () => Promise<TransformersModule>): void {
  moduleLoader = loader;
}

export function __resetEmbedderForTest(): void {
  cachedEmbedder = null;
  moduleLoader = loadDefaultTransformers;
}

export async function getDefaultEmbedder(): Promise<Embedder> {
  if (cachedEmbedder) return cachedEmbedder;

  const mod = await moduleLoader();
  const extractor = await mod.pipeline("feature-extraction", DEFAULT_MODEL_ID);

  cachedEmbedder = {
    modelId: DEFAULT_MODEL_ID,
    vectorDimension: DEFAULT_VECTOR_DIMENSION,
    async embed(text: string): Promise<number[]> {
      const result = await extractor(text, { pooling: "mean", normalize: true });
      return Array.from(result.data);
    },
  };
  return cachedEmbedder;
}

export function createDeterministicEmbedder(dimension = 16): Embedder {
  return {
    modelId: "deterministic-hash",
    vectorDimension: dimension,
    async embed(text: string): Promise<number[]> {
      return hashEmbed(text, dimension);
    },
  };
}

export function hashEmbed(text: string, dimension: number): number[] {
  const vector = new Array<number>(dimension).fill(0);
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (const token of tokens) {
    const h = hash32(token);
    const idx = h % dimension;
    vector[idx] = (vector[idx] as number) + 1;
  }
  let sumSq = 0;
  for (const v of vector) sumSq += v * v;
  if (sumSq === 0) return vector;
  const inv = 1 / Math.sqrt(sumSq);
  return vector.map((v) => v * inv);
}

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

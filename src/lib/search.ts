import type { Embedder } from "./embedder.ts";
import type { IndexedSkill, SearchResult } from "../schemas/skill.ts";

export const DEFAULT_LIMIT = 5;
export const DEFAULT_MIN_SIMILARITY = 0.0;

export interface SearchOptions {
  query: string;
  index: readonly IndexedSkill[];
  embedder: Embedder;
  limit?: number;
  minSimilarity?: number;
}

export async function searchSkills(opts: SearchOptions): Promise<SearchResult[]> {
  const { query, index, embedder, limit = DEFAULT_LIMIT, minSimilarity = DEFAULT_MIN_SIMILARITY } = opts;
  if (query.trim() === "") return [];

  const queryVector = await embedder.embed(query);
  const queryNorm = vectorNorm(queryVector);
  if (queryNorm === 0) return [];

  type Scored = { skill: IndexedSkill; similarity: number };
  const scored: Scored[] = [];
  for (const skill of index) {
    const skillNorm = vectorNorm(skill.vector);
    if (skillNorm === 0) continue;
    const similarity = dotProduct(queryVector, skill.vector) / (queryNorm * skillNorm);
    if (similarity < minSimilarity) continue;
    scored.push({ skill, similarity });
  }

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, limit).map(({ skill, similarity }) => ({
    id: skill.id,
    description: skill.description,
    category: skill.category,
    tokenCount: skill.tokenCount,
    similarity: roundTo(similarity, 4),
  }));
}

export function dotProduct(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += (a[i] as number) * (b[i] as number);
  }
  return sum;
}

export function vectorNorm(v: readonly number[]): number {
  let sum = 0;
  for (const x of v) sum += x * x;
  return Math.sqrt(sum);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

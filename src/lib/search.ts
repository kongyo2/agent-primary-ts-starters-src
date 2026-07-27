import type { Embedder } from "./embedder.ts";
import type { IndexedSkill, SearchResult, SkillIndex } from "../schemas/skill.ts";

export const DEFAULT_LIMIT = 5;
export const DEFAULT_MIN_SIMILARITY = 0.0;

export interface SearchOptions {
  query: string;
  /**
   * The whole index, not just `index.skills` — cosine similarity against vectors
   * from a different model is silently meaningless rather than an error, so the
   * dimension recorded in the index has to reach this function to be checked.
   */
  index: SkillIndex;
  embedder: Embedder;
  limit?: number;
  minSimilarity?: number;
}

export async function searchSkills(opts: SearchOptions): Promise<SearchResult[]> {
  const { query, index, embedder, limit = DEFAULT_LIMIT, minSimilarity = DEFAULT_MIN_SIMILARITY } = opts;

  if (index.vectorDimension !== embedder.vectorDimension) {
    throw new Error(
      `Skill index dimension mismatch: index was built with ${index.modelId} (${index.vectorDimension}D) ` +
        `but the active embedder is ${embedder.modelId} (${embedder.vectorDimension}D). ` +
        `Rebuild the index with "npm run build:index".`,
    );
  }

  if (query.trim() === "") return [];

  const queryVector = await embedder.embed(query);
  const queryNorm = vectorNorm(queryVector);
  if (queryNorm === 0) return [];

  type Scored = { skill: IndexedSkill; similarity: number };
  const scored: Scored[] = [];
  for (const skill of index.skills) {
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
  // Walked as a pair of iterators rather than by index: `noUncheckedIndexedAccess`
  // types `b[i]` as `number | undefined`, and the `as number` that used to silence
  // it asserted an invariant nothing checked. Exhausting `b` is the same stopping
  // condition, expressed so the compiler can see it.
  let sum = 0;
  const rest = b[Symbol.iterator]();
  for (const av of a) {
    const next = rest.next();
    if (next.done === true) break;
    sum += av * next.value;
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

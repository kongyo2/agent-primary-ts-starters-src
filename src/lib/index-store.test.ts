import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";
import { readIndexFromFile, writeIndexToFile } from "./index-store.ts";
import type { SkillIndex } from "../schemas/skill.ts";

const sampleIndex: SkillIndex = {
  modelId: "test-model",
  vectorDimension: 4,
  skills: [{ id: "alpha", description: "alpha", category: "test", tokenCount: 10, vector: [0.1, 0.2, 0.3, 0.4] }],
};

describe("index-store", () => {
  it("round-trips through gzip", () => {
    const path = join(tmpdir(), `apts-index-${Date.now()}.json.gz`);
    try {
      writeIndexToFile(path, sampleIndex);
      const read = readIndexFromFile(path);
      expect(read).toEqual(sampleIndex);
    } finally {
      rmSync(path, { force: true });
    }
  });

  it("throws a useful error when the index file is missing", () => {
    const path = join(tmpdir(), `apts-missing-${Date.now()}.json.gz`);
    expect(() => readIndexFromFile(path)).toThrow(/index not found/i);
  });

  it("rejects invalid index data at write time", () => {
    const path = join(tmpdir(), `apts-bad-${Date.now()}.json.gz`);
    const bad = { modelId: "", vectorDimension: 0, skills: [] } as unknown as SkillIndex;
    expect(() => writeIndexToFile(path, bad)).toThrow();
  });
});

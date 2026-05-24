import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { rmSync, mkdirSync } from "node:fs";
import { buildIndex } from "./index-builder.ts";
import { createDeterministicEmbedder } from "./embedder.ts";
import { readIndexFromFile } from "./index-store.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

describe("buildIndex", () => {
  it("creates an index file with one entry per skill", async () => {
    const outDir = join(tmpdir(), `apts-builder-${Date.now()}-${Math.random()}`);
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, "index.json.gz");
    try {
      const embedder = createDeterministicEmbedder(16);
      const index = await buildIndex({
        skillsDir: FIXTURES_DIR,
        outputFile: outFile,
        embedder,
      });
      expect(index.skills).toHaveLength(2);
      expect(index.modelId).toBe("deterministic-hash");
      expect(index.vectorDimension).toBe(16);

      const onDisk = readIndexFromFile(outFile);
      expect(onDisk).toEqual(index);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("invokes the logger for each indexed skill", async () => {
    const outDir = join(tmpdir(), `apts-builder-log-${Date.now()}-${Math.random()}`);
    mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, "i.json.gz");
    const lines: string[] = [];
    try {
      await buildIndex({
        skillsDir: FIXTURES_DIR,
        outputFile: outFile,
        embedder: createDeterministicEmbedder(8),
        logger: (l) => lines.push(l),
      });
      expect(lines.length).toBe(2);
      expect(lines.join("\n")).toContain("skill-alpha");
      expect(lines.join("\n")).toContain("skill-bravo");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("throws when no skills are found", async () => {
    const empty = join(tmpdir(), `apts-builder-empty-${Date.now()}`);
    mkdirSync(empty, { recursive: true });
    try {
      await expect(
        buildIndex({
          skillsDir: empty,
          outputFile: join(empty, "out.json.gz"),
          embedder: createDeterministicEmbedder(4),
        }),
      ).rejects.toThrow(/No skills/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

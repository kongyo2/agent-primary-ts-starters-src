#!/usr/bin/env -S node --experimental-strip-types

import { SKILLS_DIR, INDEX_FILE } from "../src/lib/paths.ts";
import { getDefaultEmbedder, DEFAULT_MODEL_ID } from "../src/lib/embedder.ts";
import { buildIndex } from "../src/lib/index-builder.ts";
import { toErrorMessage } from "../src/lib/errors.ts";

async function main(): Promise<void> {
  process.stdout.write(`Building skill index (model=${DEFAULT_MODEL_ID})...\n`);
  const embedder = await getDefaultEmbedder();
  const index = await buildIndex({
    skillsDir: SKILLS_DIR,
    outputFile: INDEX_FILE,
    embedder,
    logger: (line) => process.stdout.write(`${line}\n`),
  });
  process.stdout.write(`Wrote ${INDEX_FILE} (${index.skills.length} skills, dim=${index.vectorDimension})\n`);
}

main().catch((err: unknown) => {
  const message = toErrorMessage(err);
  process.stderr.write(`build-index failed: ${message}\n`);
  process.exit(1);
});

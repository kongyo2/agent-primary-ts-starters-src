#!/usr/bin/env -S node --experimental-strip-types

import { join } from "node:path";
import { PACKAGE_ROOT, SKILLS_DIR } from "../src/lib/paths.ts";
import { syncSkills } from "../src/lib/skill-syncer.ts";
import { toErrorMessage } from "../src/lib/errors.ts";

const SOURCE_DIR = join(PACKAGE_ROOT, "refs", "agent-primary-ts-starters");

try {
  const result = syncSkills({ sourceDir: SOURCE_DIR, destDir: SKILLS_DIR });
  for (const name of result.copied) process.stdout.write(`  ✓ ${name}\n`);
  process.stdout.write(`Synced ${result.copied.length} skills to ${SKILLS_DIR}\n`);
} catch (err) {
  const message = toErrorMessage(err);
  process.stderr.write(`sync-skills failed: ${message}\n`);
  process.stderr.write(
    `Clone the source repo first: git clone https://github.com/kongyo2/agent-primary-ts-starters.git refs/agent-primary-ts-starters\n`,
  );
  process.exit(1);
}

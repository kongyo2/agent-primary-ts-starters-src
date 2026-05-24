#!/usr/bin/env -S node --experimental-strip-types

import { runCli } from "../src/lib/cli.ts";

runCli({
  argv: process.argv.slice(2),
  stdout: (s) => process.stdout.write(`${s}\n`),
  stderr: (s) => process.stderr.write(`${s}\n`),
  exit: (code) => process.exit(code),
}).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Execution failed: ${message}\n`);
  process.exit(1);
});

#!/usr/bin/env -S node --experimental-strip-types

import { runCli } from "../src/lib/cli.ts";
import { toErrorMessage } from "../src/lib/errors.ts";

runCli({
  argv: process.argv.slice(2),
  stdout: (s) => process.stdout.write(`${s}\n`),
  stderr: (s) => process.stderr.write(`${s}\n`),
  exit: (code) => process.exit(code),
}).catch((err: unknown) => {
  process.stderr.write(`Execution failed: ${toErrorMessage(err)}\n`);
  process.exit(1);
});

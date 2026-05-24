import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const file = "dist/bin/apts.js";
const desiredShebang = "#!/usr/bin/env node\n";

const original = readFileSync(file, "utf8");
const body = original.startsWith("#!") ? original.replace(/^#![^\n]*\n/, "") : original;

writeFileSync(file, desiredShebang + body);
chmodSync(file, 0o755);

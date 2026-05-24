import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function findPackageRoot(start: string): string {
  let dir = start;
  while (true) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    /* v8 ignore next */
    if (parent === dir) throw new Error(`package.json not found above ${start}`);
    dir = parent;
  }
}

export const PACKAGE_ROOT = findPackageRoot(here);
export const SKILLS_DIR = join(PACKAGE_ROOT, "skills");
export const DATA_DIR = join(PACKAGE_ROOT, "src", "data");
export const INDEX_FILE = join(DATA_DIR, "skills.index.json.gz");
export const PACKAGE_JSON = join(PACKAGE_ROOT, "package.json");

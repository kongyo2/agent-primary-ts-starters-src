import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = resolve(here, "..", "..");
export const SKILLS_DIR = join(PACKAGE_ROOT, "skills");
export const DATA_DIR = join(PACKAGE_ROOT, "src", "data");
export const INDEX_FILE = join(DATA_DIR, "skills.index.json.gz");
export const PACKAGE_JSON = join(PACKAGE_ROOT, "package.json");

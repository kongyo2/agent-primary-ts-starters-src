import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { PACKAGE_JSON, INDEX_FILE, SKILLS_DIR } from "./paths.ts";
import { listSkills } from "./list.ts";
import { retrieveSkill } from "./retrieve.ts";
import { searchSkills } from "./search.ts";
import { readIndexFromFile } from "./index-store.ts";
import { getDefaultEmbedder, type Embedder } from "./embedder.ts";
import type { SkillIndex } from "../schemas/skill.ts";

export interface CliDeps {
  argv: readonly string[];
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  exit: (code: number) => never;
  skillsDir?: string;
  indexFile?: string;
  packageJsonPath?: string;
  embedder?: Embedder;
  loadIndex?: (path: string) => SkillIndex;
}

const USAGE = `
Usage: apts <command> [args]

Commands:
  search <query>            Search skills by natural-language query
  list                      List all available skills (id, description, tokenCount)
  retrieve <ids>            Retrieve skill(s) by ID (comma-separated)

Options:
  -h, --help                Show this help
  -v, --version             Show version
`;

export async function runCli(deps: CliDeps): Promise<void> {
  const { values, positionals } = parseArgs({
    args: [...deps.argv],
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.version === true) {
    deps.stdout(readPackageVersion(deps.packageJsonPath ?? PACKAGE_JSON));
    return;
  }

  if (values.help === true || positionals.length === 0) {
    deps.stdout(USAGE.trimEnd());
    if (values.help !== true) {
      deps.exit(1);
    }
    return;
  }

  const command = positionals[0] as string;
  const rest = positionals.slice(1);
  const arg = rest.join(" ");
  const skillsDir = deps.skillsDir ?? SKILLS_DIR;
  const indexFile = deps.indexFile ?? INDEX_FILE;
  const loadIndex = deps.loadIndex ?? readIndexFromFile;

  if (command === "search") {
    if (!arg) {
      deps.stderr("No search query provided.");
      deps.exit(1);
    }
    const index = loadIndex(indexFile);
    const embedder = deps.embedder ?? (await getDefaultEmbedder());
    const results = await searchSkills({ query: arg, index: index.skills, embedder });
    deps.stdout(formatSearchOutput(results));
    return;
  }

  if (command === "list") {
    const items = listSkills({ skillsDir });
    deps.stdout(JSON.stringify(items, null, 2));
    return;
  }

  if (command === "retrieve") {
    if (!arg) {
      deps.stderr("No IDs provided for retrieve.");
      deps.exit(1);
    }
    const ids = arg
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (ids.length === 0) {
      deps.stderr("No IDs provided for retrieve.");
      deps.exit(1);
    }
    let hasError = false;
    for (const id of ids) {
      try {
        const skill = retrieveSkill({ skillsDir, id });
        deps.stdout(`\n--- Skill: ${id} ---`);
        deps.stdout(skill.content);
      } catch (err) {
        deps.stderr(`Retrieve failed for ${id}: ${(err as Error).message}`);
        hasError = true;
      }
    }
    if (hasError) {
      deps.exit(1);
    }
    return;
  }

  deps.stderr(`Unknown command: ${command}`);
  deps.stdout(USAGE.trimEnd());
  deps.exit(1);
}

function formatSearchOutput<T>(results: readonly T[]): string {
  if (results.length === 0) return "[]";
  const lines = results.map((r) => JSON.stringify(r));
  return "[" + lines.join(",\n") + "]";
}

function readPackageVersion(packageJsonPath: string): string {
  const raw: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (typeof raw === "object" && raw !== null && "version" in raw) {
    const version = (raw as { version: unknown }).version;
    if (typeof version === "string") return version;
  }
  throw new Error(`Cannot read version from ${packageJsonPath}`);
}

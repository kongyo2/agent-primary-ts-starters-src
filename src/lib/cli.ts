import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { PACKAGE_JSON, INDEX_FILE, SKILLS_DIR } from "./paths.ts";
import { listSkills } from "./list.ts";
import { retrieveSkill } from "./retrieve.ts";
import { searchSkills, DEFAULT_LIMIT, DEFAULT_MIN_SIMILARITY } from "./search.ts";
import { readIndexFromFile } from "./index-store.ts";
import { getDefaultEmbedder, type Embedder } from "./embedder.ts";
import type { SkillIndex, SearchResult } from "../schemas/skill.ts";

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
  startMcpServer?: () => Promise<void>;
}

const USAGE = `
Usage: apts <command> [args] [options]

Commands:
  search <query>            Search skills by natural-language query
  list                      List all available skills (id, description, tokenCount)
  retrieve <ids>            Retrieve skill(s) by ID (comma-separated)
  mcp                       Start the Model Context Protocol stdio server

Search options:
  --limit <N>               Maximum number of results (default: ${DEFAULT_LIMIT})
  --threshold <0.0-1.0>     Minimum cosine similarity to include (default: ${DEFAULT_MIN_SIMILARITY})
  --format <fmt>            Output format: json (default), text

Retrieve options:
  --format <fmt>            Output format: markdown (default), json

Global options:
  -h, --help                Show this help
  -v, --version             Show version
`;

const SEARCH_FORMATS = ["json", "text"] as const;
const RETRIEVE_FORMATS = ["markdown", "json"] as const;
type SearchFormat = (typeof SEARCH_FORMATS)[number];

export async function runCli(deps: CliDeps): Promise<void> {
  const { values, positionals } = parseArgs({
    args: [...deps.argv],
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      limit: { type: "string" },
      threshold: { type: "string" },
      format: { type: "string" },
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
    const limit = parsePositiveInt(asString(values.limit), "limit", deps);
    const threshold = parseUnitRange(asString(values.threshold), "threshold", deps);
    const format = parseFormat(asString(values.format), SEARCH_FORMATS, "json", "format", deps);

    const index = loadIndex(indexFile);
    const embedder = deps.embedder ?? (await getDefaultEmbedder());
    const searchOpts = {
      query: arg,
      index: index.skills,
      embedder,
      ...(limit !== null ? { limit } : {}),
      ...(threshold !== null ? { minSimilarity: threshold } : {}),
    };
    const results = await searchSkills(searchOpts);
    deps.stdout(formatSearchResults(results, format));
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
    const format = parseFormat(asString(values.format), RETRIEVE_FORMATS, "markdown", "format", deps);

    let hasError = false;
    const jsonOut: Array<Record<string, unknown>> = [];
    for (const id of ids) {
      try {
        const skill = retrieveSkill({ skillsDir, id });
        if (format === "json") {
          jsonOut.push({
            id: skill.id,
            category: skill.category,
            frontmatter: skill.frontmatter,
            tokenCount: skill.tokenCount,
            content: skill.content,
          });
        } else {
          deps.stdout(`\n--- Skill: ${id} ---`);
          deps.stdout(skill.content);
        }
      } catch (err) {
        deps.stderr(`Retrieve failed for ${id}: ${(err as Error).message}`);
        hasError = true;
      }
    }
    if (format === "json") {
      deps.stdout(JSON.stringify(jsonOut, null, 2));
    }
    if (hasError) {
      deps.exit(1);
    }
    return;
  }

  if (command === "mcp") {
    /* v8 ignore start */
    if (!deps.startMcpServer) {
      const { startMcpServer } = await import("./mcp-server.ts");
      await startMcpServer({ skillsDir, indexFile, loadIndex });
      return;
    }
    /* v8 ignore stop */
    await deps.startMcpServer();
    return;
  }

  deps.stderr(`Unknown command: ${command}`);
  deps.stdout(USAGE.trimEnd());
  deps.exit(1);
}

function formatSearchResults(results: readonly SearchResult[], format: SearchFormat): string {
  if (format === "text") {
    if (results.length === 0) return "(no matches)";
    return results.map((r) => `${r.similarity.toFixed(4)}  ${r.id}\n          ${r.description}`).join("\n");
  }
  if (results.length === 0) return "[]";
  const lines = results.map((r) => JSON.stringify(r));
  return "[" + lines.join(",\n") + "]";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parsePositiveInt(raw: string | undefined, flag: string, deps: CliDeps): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    deps.stderr(`--${flag} must be a positive integer (got "${raw}")`);
    deps.exit(1);
  }
  return n;
}

function parseUnitRange(raw: string | undefined, flag: string, deps: CliDeps): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0 || n > 1) {
    deps.stderr(`--${flag} must be in [0.0, 1.0] (got "${raw}")`);
    deps.exit(1);
  }
  return n;
}

function parseFormat<T extends readonly string[]>(
  raw: string | undefined,
  allowed: T,
  defaultValue: T[number],
  flag: string,
  deps: CliDeps,
): T[number] {
  if (raw === undefined) return defaultValue;
  if (!allowed.includes(raw as T[number])) {
    deps.stderr(`--${flag} must be one of: ${allowed.join(", ")} (got "${raw}")`);
    deps.exit(1);
  }
  return raw as T[number];
}

function readPackageVersion(packageJsonPath: string): string {
  const raw: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (typeof raw === "object" && raw !== null && "version" in raw) {
    const version = (raw as { version: unknown }).version;
    if (typeof version === "string") return version;
  }
  throw new Error(`Cannot read version from ${packageJsonPath}`);
}

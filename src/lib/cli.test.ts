import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { writeFileSync } from "node:fs";
import { runCli } from "./cli.ts";
import { __resetEmbedderForTest, __setTransformersLoaderForTest, createDeterministicEmbedder } from "./embedder.ts";
import type { CliDeps } from "./cli.ts";
import type { SkillIndex } from "../schemas/skill.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function makeDeps(
  argv: string[],
  overrides: Partial<CliDeps> = {},
): {
  deps: CliDeps;
  out: string[];
  err: string[];
  exitCodes: number[];
} {
  const out: string[] = [];
  const err: string[] = [];
  const exitCodes: number[] = [];
  const deps: CliDeps = {
    argv,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    exit: (code) => {
      exitCodes.push(code);
      throw new ExitError(code);
    },
    skillsDir: FIXTURES_DIR,
    packageJsonPath: writeFakePackageJson(),
    ...overrides,
  };
  return { deps, out, err, exitCodes };
}

let fakePackageJsonPath: string | null = null;
function writeFakePackageJson(): string {
  if (fakePackageJsonPath) return fakePackageJsonPath;
  const path = join(tmpdir(), `apts-cli-pkg-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ version: "9.9.9" }));
  fakePackageJsonPath = path;
  return path;
}

async function makeIndexAsync(): Promise<SkillIndex> {
  const embedder = createDeterministicEmbedder(16);
  return {
    modelId: "test",
    vectorDimension: 16,
    skills: [
      {
        id: "skill-alpha",
        description: "alpha skill",
        category: "test",
        tokenCount: 100,
        vector: await embedder.embed("alpha frontmatter parsing tokenization"),
      },
      {
        id: "skill-bravo",
        description: "bravo skill",
        category: "test",
        tokenCount: 80,
        vector: await embedder.embed("bravo linting prettier ranking"),
      },
    ],
  };
}

describe("runCli", () => {
  it("prints usage and exits 1 when no command is given", async () => {
    const { deps, out, exitCodes } = makeDeps([]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(out.join("\n")).toContain("Usage: apts");
    expect(exitCodes).toEqual([1]);
  });

  it("prints usage and exits 0 with --help", async () => {
    const { deps, out, exitCodes } = makeDeps(["--help"]);
    await runCli(deps);
    expect(out.join("\n")).toContain("Usage: apts");
    expect(exitCodes).toEqual([]);
  });

  it("prints the version with --version", async () => {
    const { deps, out } = makeDeps(["--version"]);
    await runCli(deps);
    expect(out.join("")).toBe("9.9.9");
  });

  it("list command outputs JSON of all skills", async () => {
    const { deps, out } = makeDeps(["list"]);
    await runCli(deps);
    const parsed = JSON.parse(out.join("\n")) as Array<{ id: string }>;
    expect(parsed.map((p) => p.id)).toEqual(["skill-alpha", "skill-bravo"]);
  });

  it("retrieve command prints content for the given ids", async () => {
    const { deps, out } = makeDeps(["retrieve", "skill-alpha"]);
    await runCli(deps);
    const joined = out.join("\n");
    expect(joined).toContain("--- Skill: skill-alpha ---");
    expect(joined).toContain("# Skill Alpha");
  });

  it("retrieve command accepts comma-separated ids and surfaces errors per id", async () => {
    const { deps, out, err, exitCodes } = makeDeps(["retrieve", "skill-alpha,nope"]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(out.join("\n")).toContain("Skill: skill-alpha");
    expect(err.join("\n")).toContain("Retrieve failed for nope");
    expect(exitCodes).toEqual([1]);
  });

  it("retrieve with no ids prints an error and exits 1", async () => {
    const { deps, err, exitCodes } = makeDeps(["retrieve"]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(err.join("\n")).toContain("No IDs provided");
    expect(exitCodes).toEqual([1]);
  });

  it("retrieve with only whitespace ids exits 1", async () => {
    const { deps, err, exitCodes } = makeDeps(["retrieve", ",,,"]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(err.join("\n")).toContain("No IDs provided");
    expect(exitCodes).toEqual([1]);
  });

  it("search with no query exits 1", async () => {
    const { deps, err, exitCodes } = makeDeps(["search"]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(err.join("\n")).toContain("No search query provided");
    expect(exitCodes).toEqual([1]);
  });

  it("search returns ranked results", async () => {
    const index = await makeIndexAsync();
    const embedder = createDeterministicEmbedder(16);
    const { deps, out } = makeDeps(["search", "alpha", "parsing"], {
      embedder,
      loadIndex: () => index,
      indexFile: "ignored",
    });
    await runCli(deps);
    const joined = out.join("\n");
    expect(joined).toContain("skill-alpha");
  });

  it("search prints [] for no matches above threshold", async () => {
    const embedder = createDeterministicEmbedder(16);
    const emptyIndex: SkillIndex = { modelId: "x", vectorDimension: 16, skills: [] };
    const { deps, out } = makeDeps(["search", "anything"], {
      embedder,
      loadIndex: () => emptyIndex,
      indexFile: "ignored",
    });
    await runCli(deps);
    expect(out.join("\n")).toBe("[]");
  });

  it("unknown command exits 1", async () => {
    const { deps, err, exitCodes } = makeDeps(["bogus"]);
    await expect(runCli(deps)).rejects.toThrow(ExitError);
    expect(err.join("\n")).toContain("Unknown command");
    expect(exitCodes).toEqual([1]);
  });

  it("search falls back to getDefaultEmbedder when no embedder is provided", async () => {
    __resetEmbedderForTest();
    const detEmbedder = createDeterministicEmbedder(16);
    const vector = await detEmbedder.embed("alpha skill");
    __setTransformersLoaderForTest(async () => ({
      pipeline: async () => async () => ({ data: new Float32Array(vector) }),
    }));

    const index: SkillIndex = {
      modelId: "x",
      vectorDimension: 16,
      skills: [{ id: "alpha", description: "alpha", category: "t", tokenCount: 1, vector }],
    };
    const { deps, out } = makeDeps(["search", "alpha"], {
      loadIndex: () => index,
      indexFile: "ignored",
    });
    delete (deps as { embedder?: unknown }).embedder;
    await runCli(deps);
    expect(out.join("\n")).toContain("alpha");
    __resetEmbedderForTest();
  });

  it("--version errors when package.json has no version string", async () => {
    const path = join(tmpdir(), `apts-cli-bad-pkg-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify({ not_version: true }));
    const { deps } = makeDeps(["--version"], { packageJsonPath: path });
    await expect(runCli(deps)).rejects.toThrow(/version/);
  });

  it("--version errors when version is present but not a string", async () => {
    const path = join(tmpdir(), `apts-cli-numver-pkg-${Date.now()}.json`);
    writeFileSync(path, JSON.stringify({ version: 123 }));
    const { deps } = makeDeps(["--version"], { packageJsonPath: path });
    await expect(runCli(deps)).rejects.toThrow(/version/);
  });

  it("falls back to default skillsDir/packageJsonPath when not provided", async () => {
    // Build a minimal deps object that uses package defaults — exercises the ?? fallbacks.
    const out: string[] = [];
    const err: string[] = [];
    const exitCodes: number[] = [];
    const deps = {
      argv: ["list"],
      stdout: (s: string) => out.push(s),
      stderr: (s: string) => err.push(s),
      exit: (code: number): never => {
        exitCodes.push(code);
        throw new ExitError(code);
      },
    } satisfies CliDeps;
    await runCli(deps);
    // The real skills/ directory has been synced — assert one of the known IDs is present.
    expect(out.join("\n")).toContain("ts-tsconfig-modern-strict-starter");
  });

  it("uses default packageJsonPath when --version is requested", async () => {
    const out: string[] = [];
    const deps = {
      argv: ["--version"],
      stdout: (s: string) => out.push(s),
      stderr: () => {},
      exit: (code: number): never => {
        throw new ExitError(code);
      },
    } satisfies CliDeps;
    await runCli(deps);
    expect(out.join("")).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("uses default indexFile and loadIndex when not provided", async () => {
    __resetEmbedderForTest();
    __setTransformersLoaderForTest(async () => ({
      pipeline: async () => async () => ({ data: new Float32Array(384) }),
    }));
    const out: string[] = [];
    const err: string[] = [];
    const deps = {
      argv: ["search", "anything"],
      stdout: (s: string) => out.push(s),
      stderr: (s: string) => err.push(s),
      exit: (code: number): never => {
        throw new ExitError(code);
      },
    } satisfies CliDeps;
    await runCli(deps);
    // With a zero-vector query, results should be [].
    expect(out.join("")).toBe("[]");
    __resetEmbedderForTest();
  });
});

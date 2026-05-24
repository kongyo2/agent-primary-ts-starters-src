import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMcpHandlers, createMcpServer, startMcpServer } from "./mcp-server.ts";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createDeterministicEmbedder } from "./embedder.ts";
import type { SkillIndex } from "../schemas/skill.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "__fixtures__", "sample-skills");

async function buildIndex(): Promise<SkillIndex> {
  const embedder = createDeterministicEmbedder(16);
  return {
    modelId: "test",
    vectorDimension: 16,
    skills: [
      {
        id: "skill-alpha",
        description: "alpha",
        category: "test",
        tokenCount: 1,
        vector: await embedder.embed("alpha frontmatter"),
      },
      {
        id: "skill-bravo",
        description: "bravo",
        category: "test",
        tokenCount: 1,
        vector: await embedder.embed("bravo prettier"),
      },
    ],
  };
}

function makeHandlers(index: SkillIndex) {
  const embedder = createDeterministicEmbedder(16);
  return buildMcpHandlers({
    skillsDir: FIXTURES_DIR,
    indexFile: "ignored",
    loadIndex: () => index,
    getEmbedder: async () => embedder,
  });
}

describe("buildMcpHandlers — searchSkills", () => {
  it("ranks the most relevant skill first", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.searchSkills({ query: "alpha frontmatter" });
    const parsed = JSON.parse(result.content[0]?.text ?? "[]") as Array<{ id: string }>;
    expect(parsed[0]?.id).toBe("skill-alpha");
  });

  it("respects optional limit", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.searchSkills({ query: "alpha bravo", limit: 1 });
    const parsed = JSON.parse(result.content[0]?.text ?? "[]") as Array<unknown>;
    expect(parsed).toHaveLength(1);
  });

  it("respects optional threshold", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.searchSkills({
      query: "completely unrelated wxyz",
      threshold: 0.99,
    });
    const parsed = JSON.parse(result.content[0]?.text ?? "[]") as Array<unknown>;
    expect(parsed).toEqual([]);
  });
});

describe("buildMcpHandlers — retrieveSkill", () => {
  it("returns SKILL.md content", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.retrieveSkill({ skill_id: "skill-alpha" });
    expect(result.content[0]?.text).toContain("# Skill Alpha");
    expect(result.isError).not.toBe(true);
  });

  it("returns an error result for unknown id", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.retrieveSkill({ skill_id: "nope" });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/nope/);
  });
});

describe("buildMcpHandlers — listSkills", () => {
  it("returns the catalog", async () => {
    const handlers = makeHandlers(await buildIndex());
    const result = await handlers.listSkills();
    const parsed = JSON.parse(result.content[0]?.text ?? "[]") as Array<{ id: string }>;
    expect(parsed.map((p) => p.id)).toEqual(["skill-alpha", "skill-bravo"]);
  });
});

describe("createMcpServer", () => {
  it("creates a server with the three apts tools registered", async () => {
    const embedder = createDeterministicEmbedder(16);
    const server = createMcpServer({
      skillsDir: FIXTURES_DIR,
      indexFile: "ignored",
      loadIndex: () => ({ modelId: "x", vectorDimension: 16, skills: [] }),
      getEmbedder: async () => embedder,
      name: "apts-test",
      version: "0.0.0-test",
    });
    const tools = (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools;
    expect(Object.keys(tools).sort()).toEqual(["list_skills", "retrieve_skill", "search_skills"]);
  });

  it("falls back to default name and version when not specified", () => {
    const embedder = createDeterministicEmbedder(16);
    const server = createMcpServer({
      skillsDir: FIXTURES_DIR,
      indexFile: "ignored",
      loadIndex: () => ({ modelId: "x", vectorDimension: 16, skills: [] }),
      getEmbedder: async () => embedder,
    });
    expect(server).toBeDefined();
  });

  it("uses default loadIndex and getEmbedder when not provided", () => {
    // Only sanity-check that the server constructs — the defaults read the real
    // package state at runtime, which we don't want to exercise here.
    const server = createMcpServer({
      skillsDir: FIXTURES_DIR,
      indexFile: "ignored",
    });
    expect(server).toBeDefined();
  });
});

describe("startMcpServer", () => {
  it("connects the server to the injected transport", async () => {
    let started = false;
    const fakeTransport = {
      start: async () => {
        started = true;
      },
      close: async () => {},
      send: async () => {},
    } as unknown as Transport;

    const embedder = createDeterministicEmbedder(16);
    await startMcpServer({
      skillsDir: FIXTURES_DIR,
      indexFile: "ignored",
      loadIndex: () => ({ modelId: "x", vectorDimension: 16, skills: [] }),
      getEmbedder: async () => embedder,
      transport: fakeTransport,
    });

    expect(started).toBe(true);
  });
});

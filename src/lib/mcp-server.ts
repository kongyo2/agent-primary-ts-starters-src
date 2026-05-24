import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { searchSkills } from "./search.ts";
import { retrieveSkill } from "./retrieve.ts";
import { listSkills } from "./list.ts";
import { getDefaultEmbedder, type Embedder } from "./embedder.ts";
import { readIndexFromFile } from "./index-store.ts";
import type { SkillIndex } from "../schemas/skill.ts";

export interface McpServerOptions {
  skillsDir: string;
  indexFile: string;
  loadIndex?: (path: string) => SkillIndex;
  getEmbedder?: () => Promise<Embedder>;
  name?: string;
  version?: string;
}

export interface McpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

const SEARCH_TOOL_DESCRIPTION =
  `Search the agent-primary-ts-starters skill catalog by natural-language query. ` +
  `Call this FIRST whenever you are about to bootstrap, edit, or review a TypeScript npm project ` +
  `(tsconfig, formatter, linter, runtime validation, etc.) — the catalog encodes agent-friendly ` +
  `defaults that diverge from the defaults you would otherwise pick from training data. ` +
  `Returns ranked skill IDs with descriptions and similarity scores. ` +
  `If the top result has low similarity, fall back to 'list_skills' to browse the full catalog.`;

const RETRIEVE_TOOL_DESCRIPTION =
  `Retrieve the full SKILL.md guide for a given skill ID returned by 'search_skills' or 'list_skills'. ` +
  `Always call this after identifying a relevant skill — the search result alone does not contain ` +
  `the actionable instructions. The body of the guide carries the standing policy you must follow ` +
  `for this project, including which config keys to set, which scripts to wire into package.json, ` +
  `and which trade-offs to surface to the user before deviating.`;

const LIST_TOOL_DESCRIPTION =
  `List every skill in the agent-primary-ts-starters catalog (id, category, description, tokenCount). ` +
  `Use when 'search_skills' returns nothing relevant, or when the user wants to browse what is available.`;

export const searchSkillsInputSchema = {
  query: z
    .string()
    .describe(
      "Action-oriented description of what you are about to set up or fix " +
        "(e.g. 'strict tsconfig for an LLM edit loop' or 'format TypeScript without reflowing surrounding lines'). " +
        "Capture the high-level intent, not specific config keys.",
    ),
  limit: z.number().int().positive().max(20).optional().describe("Maximum results to return. Defaults to 5."),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Minimum cosine similarity in [0,1] to include. Defaults to 0."),
};

export const retrieveSkillInputSchema = {
  skill_id: z.string().describe("Exact skill ID from a previous search_skills or list_skills response."),
};

export interface ResolvedHandlers {
  searchSkills: (args: {
    query: string;
    limit?: number | undefined;
    threshold?: number | undefined;
  }) => Promise<McpToolResult>;
  retrieveSkill: (args: { skill_id: string }) => Promise<McpToolResult>;
  listSkills: () => Promise<McpToolResult>;
}

export function buildMcpHandlers(opts: McpServerOptions): ResolvedHandlers {
  const { skillsDir, indexFile } = opts;
  const loadIndex = opts.loadIndex ?? readIndexFromFile;
  const getEmbedder = opts.getEmbedder ?? getDefaultEmbedder;

  return {
    async searchSkills({ query, limit, threshold }) {
      const index = loadIndex(indexFile);
      const embedder = await getEmbedder();
      const results = await searchSkills({
        query,
        index: index.skills,
        embedder,
        ...(limit !== undefined ? { limit } : {}),
        ...(threshold !== undefined ? { minSimilarity: threshold } : {}),
      });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    },

    async retrieveSkill({ skill_id }) {
      try {
        const skill = retrieveSkill({ skillsDir, id: skill_id });
        return { content: [{ type: "text", text: skill.content }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: (err as Error).message }],
          isError: true,
        };
      }
    },

    async listSkills() {
      const items = listSkills({ skillsDir });
      return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
    },
  };
}

export function createMcpServer(opts: McpServerOptions): McpServer {
  const handlers = buildMcpHandlers(opts);
  const server = new McpServer({
    name: opts.name ?? "apts",
    version: opts.version ?? "0.0.0",
  });

  server.registerTool(
    "search_skills",
    { description: SEARCH_TOOL_DESCRIPTION, inputSchema: searchSkillsInputSchema },
    handlers.searchSkills,
  );
  server.registerTool(
    "retrieve_skill",
    { description: RETRIEVE_TOOL_DESCRIPTION, inputSchema: retrieveSkillInputSchema },
    handlers.retrieveSkill,
  );
  server.registerTool("list_skills", { description: LIST_TOOL_DESCRIPTION, inputSchema: {} }, handlers.listSkills);

  return server;
}

export interface StartMcpServerOptions extends McpServerOptions {
  transport?: Transport;
}

export async function startMcpServer(opts: StartMcpServerOptions): Promise<void> {
  const server = createMcpServer(opts);
  /* v8 ignore next */
  const transport = opts.transport ?? new StdioServerTransport();
  await server.connect(transport);
}

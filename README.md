# @kongyo2/apts

> Agent-Primary TypeScript Starters — a CLI + MCP server that lets coding agents `search` and `retrieve` the [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters) skill guides on demand.

`apts` wraps four agent-friendly TypeScript starters (tsconfig, Prettier, Oxlint, Zod) behind a semantic-search interface. Use it as a one-shot CLI, or expose it to your coding agent as an MCP server so it pulls the right guidance into context automatically.

## Quickstart

```shell
# Search for relevant skills
npx @kongyo2/apts@latest search "set up strict tsconfig for an LLM agent loop"

# Retrieve a guide by ID
npx @kongyo2/apts@latest retrieve "ts-tsconfig-modern-strict-starter"

# List every available skill
npx @kongyo2/apts@latest list
```

## CLI reference

### `apts search <query> [flags]`

Semantic search over the skill catalog. Returns a JSON array sorted by cosine similarity.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--limit <N>` | int > 0 | `5` | Maximum number of results. |
| `--threshold <0.0-1.0>` | float | `0.0` | Minimum similarity to include. |
| `--format <fmt>` | `json` \| `text` | `json` | `text` emits one-line human-readable rows. |

```shell
# Take only the single best match
npx @kongyo2/apts@latest search "lint TypeScript without stylistic noise" --limit 1

# Drop weak matches
npx @kongyo2/apts@latest search "runtime validation" --threshold 0.4

# Human-readable output for eyeballing
npx @kongyo2/apts@latest search "format diff-friendly" --format text
```

### `apts retrieve <ids> [flags]`

Pull one or more SKILL.md files by ID. Comma-separated IDs are supported.

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--format <fmt>` | `markdown` \| `json` | `markdown` | `json` returns `[{ id, frontmatter, content, … }]`. |

```shell
# Default: raw markdown, ready to inline into agent context
npx @kongyo2/apts@latest retrieve ts-npm-prettier-starter

# Structured for programmatic consumers
npx @kongyo2/apts@latest retrieve ts-npm-prettier-starter,ts-npm-oxlint-starter --format json
```

### `apts list`

Print the full catalog as JSON: `{ id, category, description, tokenCount }`.

### `apts mcp`

Start an [MCP](https://modelcontextprotocol.io/) stdio server exposing the three tools `search_skills`, `retrieve_skill`, `list_skills`. See [Using `apts` as an MCP server](#using-apts-as-an-mcp-server) below.

## Using `apts` as an MCP server

The MCP server is the recommended integration path for coding agents — Claude Code, Cursor, Continue, Zed, and Codex CLI can all call `search_skills` and `retrieve_skill` directly without shelling out.

### Claude Code

Add to `~/.claude.json` (or `.mcp.json` in your project):

```jsonc
{
  "mcpServers": {
    "apts": {
      "command": "npx",
      "args": ["-y", "@kongyo2/apts@latest", "mcp"]
    }
  }
}
```

Or use the CLI: `claude mcp add apts -- npx -y @kongyo2/apts@latest mcp`.

### Cursor

Add to `~/.cursor/mcp.json`:

```jsonc
{
  "mcpServers": {
    "apts": {
      "command": "npx",
      "args": ["-y", "@kongyo2/apts@latest", "mcp"]
    }
  }
}
```

### Tools exposed over MCP

| Tool | Input | Returns |
| --- | --- | --- |
| `search_skills` | `{ query: string, limit?: number, threshold?: number }` | Ranked JSON of skill summaries. |
| `retrieve_skill` | `{ skill_id: string }` | Full SKILL.md body, or `isError: true` if unknown. |
| `list_skills` | _none_ | Full catalog as JSON. |

The tool descriptions instruct the agent to call `search_skills` **before** writing tsconfig / Prettier / Oxlint / Zod code, then `retrieve_skill` for the actionable guide.

## Why?

LLM-driven TypeScript work has predictable failure modes:

- **`tsc --noEmit` is the agent's inner loop.** A weak tsconfig leaks classes of silent bugs straight into the generated code.
- **Formatters and linters need agent-friendly defaults.** Prettier reflowing 30 surrounding lines invalidates an agent's pending `old_string` matches; pedantic lint warnings crowd out real errors.
- **Runtime validation belongs at the boundary.** Most LLM code re-validates inside every layer because no convention was stated.

`apts` packages four short, opinionated guides — each one tuned so that a coding agent picks up the right defaults on the first try.

## What's included

| ID                                       | Tokens | Purpose                                                                       |
| ---------------------------------------- | -----: | ----------------------------------------------------------------------------- |
| `ts-tsconfig-modern-strict-starter`      | ~2500  | Modern ESNext + strict tsconfig templates tuned for the `tsc --noEmit` loop.  |
| `ts-npm-prettier-starter`                | ~950   | Prettier defaults that minimize diff size and stabilize line numbers.         |
| `ts-npm-oxlint-starter`                  | ~920   | Oxlint defaults that focus on real bugs and emit the LLM-friendly format.     |
| `ts-npm-zod-starter`                     | ~440   | Boundary-only Zod parsing convention.                                         |

Run `npx @kongyo2/apts@latest list` for the canonical, up-to-date catalog.

## How it works

1. **Activation.** Your agent decides a TypeScript task is in scope (or you invoke `apts` from the shell).
2. **Local semantic search.** `apts search "<query>"` (or the MCP `search_skills` tool) runs an offline embedding model (`Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`) and returns the most similar guides by cosine similarity. The index is shipped pre-built inside the package; the only network call is the first-time model download cached by `transformers.js`.
3. **Guide fetch.** `apts retrieve <id>` reads the raw `SKILL.md` from disk and prints it. No further network access.

## Requirements

- Node.js **22.6+** (the CLI uses `node --experimental-strip-types`, so no build step is required when running from source).

## Authoring & development

Source repository: <https://github.com/kongyo2/agent-primary-ts-starters-src>

```shell
git clone https://github.com/kongyo2/agent-primary-ts-starters-src.git
cd agent-primary-ts-starters-src
git clone https://github.com/kongyo2/agent-primary-ts-starters.git refs/agent-primary-ts-starters

npm install
npm run sync-skills   # copies the four SKILL.md files into ./skills
npm run build:index   # computes embeddings, writes src/data/skills.index.json.gz
npm run preflight     # typecheck + lint:strict + format:check + test:coverage
```

The published npm package ships the SKILL.md files and a pre-built embedding index, so end users never run `build:index` themselves.

CI runs preflight on every PR against Node 22.x and 24.x, plus a CLI smoke test and `npm pack --dry-run` verification. A nightly workflow re-syncs `skills/`, rebuilds the index, and opens a PR if upstream changed. Publishing is gated behind a manual `workflow_dispatch` action.

## License

Apache-2.0. Skill content under `skills/` is mirrored from [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters).

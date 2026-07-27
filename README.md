# @kongyo2/apts

> Agent-Primary TypeScript Starters — a CLI that lets coding agents `search` and `retrieve` the [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters) skill guides on demand.

`apts` wraps four agent-friendly TypeScript starters (tsconfig, Prettier, Oxlint, Zod) behind a semantic-search interface. Use it as a one-shot CLI so coding agents pull the right guidance into context automatically.

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

## Development

This repo applies `ts-tsconfig-modern-strict-starter` — the skill it ships — to itself. TypeScript 7, the §2 Node ESM
route, and the two-tier loop/gate config split.

| Config | Role |
| --- | --- |
| `tsconfig.json` | Inner loop and the emitting build. Cached, `skipLibCheck` on. |
| `tsconfig.ci.json` | Gate. Cache-free, `noEmit`. |
| `tsconfig.test.json` | The files the base excludes: `*.test.ts`, `scripts/`, `vitest.config.ts`. |
| `tsconfig.declarations.json` | `isolatedDeclarations` gate. Emits to `node_modules/.cache/decl`. |

```shell
npm run typecheck        # inner loop — cached, one error per line, no ANSI
npm run preflight        # everything below, in order, as CI runs it

npm run typecheck:ci        # cache-free full check
npm run typecheck:test:ci   # tests + scripts + vitest config, cache-free
npm run check:decl          # every export declarable from its own file
npm run lint:strict         # oxlint
npm run lint:types          # oxlint type-aware (no-floating-promises, no-unsafe-*)
npm run format:check
npm run test:coverage       # 100% thresholds
npm run probe               # build dist/ and execute it
```

`probe` is not redundant with `typecheck`: `tsc` checks types, not whether the emitted JS resolves under Node. It is the
only step that catches a module-resolution gap between the compiler and the runtime.

`skipLibCheck` stays `true` in the gate — the one standing-policy exception, with the failing packages and error codes
recorded in `tsconfig.ci.json`. `npm run typecheck:libs` re-tests it after a dependency bump.

Skill content under `skills/` is generated. To pull in upstream edits:

```shell
git clone https://github.com/kongyo2/agent-primary-ts-starters.git refs/agent-primary-ts-starters
npm run sync-skills      # copy SKILL.md files into skills/
npm run build:index      # re-embed; skills/ and src/data/ must be committed together
```

## License

MIT. Skill content under `skills/` is mirrored from [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters).

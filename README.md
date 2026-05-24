# @kongyo2/apts

> Agent-Primary TypeScript Starters — a CLI that lets coding agents `search` and `retrieve` the [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters) skill guides on demand.

`apts` is a self-contained CLI that wraps four agent-friendly TypeScript starters (tsconfig, Prettier, Oxlint, Zod) behind two commands: semantic `search` to discover the right skill, and `retrieve` to pull the full guide into the agent's context window.

## Quickstart

```shell
# Search for relevant skills
npx @kongyo2/apts@latest search "set up strict tsconfig for an LLM agent loop"

# Retrieve a guide by ID
npx @kongyo2/apts@latest retrieve "ts-tsconfig-modern-strict-starter"
```

You can also list every available skill:

```shell
npx @kongyo2/apts@latest list
```

### Output format

`search` prints a JSON array of matches sorted by semantic similarity:

```json
[
  {"id":"ts-tsconfig-modern-strict-starter","description":"Set up a TypeScript tsconfig.json with modern (ESNext + bundler/nodenext) and maximally strict settings…","category":"ts-npm","tokenCount":2472,"similarity":0.81}
]
```

`retrieve` prints the raw `SKILL.md` body (frontmatter included) so the agent can drop it straight into its working context.

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

1. **Activation.** Your agent decides a TypeScript task is in scope.
2. **Local semantic search.** `apts search "<query>"` runs an offline embedding model (`Xenova/all-MiniLM-L6-v2` via `@huggingface/transformers`) and returns the most similar guides by cosine similarity. The index is shipped pre-built inside the package, so the only network call is the first-time model download cached by `transformers.js`.
3. **Guide fetch.** `apts retrieve <id>` reads the raw `SKILL.md` from disk and prints it. No further network access.

## Requirements

- Node.js **22.6+** (the CLI uses `node --experimental-strip-types`, so no build step is required when running from source).

## Authoring & development

Source repository: <https://github.com/kongyo2/agent-primary-ts-starters-src>

```shell
# Clone the source repo (this repo) and the skill repo as a sibling.
git clone https://github.com/kongyo2/agent-primary-ts-starters-src.git
cd agent-primary-ts-starters-src
git clone https://github.com/kongyo2/agent-primary-ts-starters.git refs/agent-primary-ts-starters

npm install
npm run sync-skills      # copies the four SKILL.md files into ./skills
npm run build:index      # computes embeddings, writes src/data/skills.index.json.gz
npm run preflight        # typecheck + lint + format:check + test
```

The published package contains the SKILL.md files and a pre-built embedding index, so end users never run `build:index` themselves.

## License

Apache-2.0. Skill content under `skills/` is mirrored from [agent-primary-ts-starters](https://github.com/kongyo2/agent-primary-ts-starters).

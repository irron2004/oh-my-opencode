> 공통 정책: 워크스페이스 루트 `../../AGENTS.md`. 이 저장소 안에서는 더 가까운
> `AGENTS.md`가 디렉터리별 규칙을 추가한다.

# oh-my-opencode agent guide

## Scope and sources of truth

- This file is the repository-wide contract. Read the closest nested `AGENTS.md`
  before changing files below `src/`.
- Conditional TypeScript rules also live in
  `.sisyphus/rules/modular-code-enforcement.md`; follow them when their glob matches.
- `CONTRIBUTING.md` is the human contribution guide. `package.json`, the current
  implementation, and `.github/workflows/ci.yml` are authoritative for executable
  commands and runtime wiring.
- Treat generated inventories, model lists, file counts, branch names, and dates in
  documentation as snapshots. Verify them in code instead of copying them forward.

## What this repository builds

`oh-my-opencode` is a Bun/TypeScript OpenCode plugin and CLI. The plugin composes
configuration, managers, tools, lifecycle hooks, agents, skills, commands, and MCP
servers. The CLI installs and diagnoses the plugin and can run non-interactive
OpenCode sessions.

The stable runtime seam is:

```text
src/index.ts
  -> loadPluginConfig
  -> createManagers
  -> createTools
  -> createHooks
  -> createPluginInterface
```

Configuration-time registration is assembled in `src/plugin-handlers/`. Runtime
hook handlers and the tool registry are assembled in `src/plugin/`. Keep business
logic in focused modules behind those composition boundaries.

## Repository routing

| Change | Start here | More specific guidance |
|---|---|---|
| Agent factories, prompts, modes, model fallback | `src/agents/` | `src/agents/AGENTS.md` |
| Config schema and public config types | `src/config/` | `src/config/AGENTS.md` |
| Reusable runtime capabilities | `src/features/` | `src/features/AGENTS.md` and nested guides |
| Lifecycle behavior | `src/hooks/` | `src/hooks/AGENTS.md` and nested guides |
| LLM-facing tools and delegation | `src/tools/` | `src/tools/AGENTS.md` and nested guides |
| OpenCode hook/tool composition | `src/plugin/` | `src/plugin/AGENTS.md` |
| Config-time component registration | `src/plugin-handlers/` | `src/plugin-handlers/AGENTS.md` |
| Installer, doctor, and run command | `src/cli/` | `src/cli/AGENTS.md` and nested guides |
| Built-in remote MCP definitions | `src/mcp/` | `src/mcp/AGENTS.md` |
| Cross-cutting primitives | `src/shared/` | `src/shared/AGENTS.md` |
| Schema/build/release utilities | `script/`, `assets/` | tests beside scripts; publishing stays in CI |
| Platform launcher packages | `packages/`, `bin/` | keep platform metadata and build script aligned |
| Repository-local commands, skills, rules | `.opencode/`, `.sisyphus/` | preserve frontmatter and scoped behavior |
| Reusable package contracts | `ASSETS.md` | plugin, CLI, schema, and binary adoption boundary |

## Cross-boundary change contracts

- Agent changes must keep routing descriptions, factory registration, model
  requirements, tool permissions, and config schemas aligned. Specialize by
  capability or permission boundary, not by hard-coded entity names.
- Tool and delegation changes must validate inputs before side effects, make child
  permissions explicit, and preserve terminal success, blocked, no-result, and
  failure states. A returned agent name is not a successful handoff.
- Hook changes belong in the correct composition tier and must be registered,
  disable-able through the schema, and isolated so one hook cannot break the chain.
- Config changes must update the root Zod schema and generated JSON schema. Add a
  migration when an existing user-facing key or value changes.
- CLI config edits must preserve JSONC comments. Non-interactive paths must not
  introduce hidden prompts or depend on a TTY.
- MCP, OAuth, and skill changes must keep credentials out of logs, fixtures, and
  tracked files. Verify effective runtime permissions, not only static declarations.
- Changes spanning agents, tools, or hooks should trace the complete path from user
  request through registration and permissions to the observable result.

## Implementation conventions

- Use Bun only: do not create npm, yarn, or pnpm lockfiles.
- Keep strict TypeScript. Do not suppress production type failures with `as any`,
  `@ts-ignore`, or `@ts-expect-error`, and do not weaken compiler settings to pass.
- Use kebab-case paths and focused modules. `index.ts` files are for exports and
  composition, not unrelated implementation.
- Do not introduce catch-all `utils.ts`, `helpers.ts`, `service.ts`, or `common.ts`
  modules. Existing files do not justify adding unrelated responsibilities to them.
- Follow existing factory and barrel patterns at the boundary being changed.
- Handle errors with useful context; empty catch blocks and silent permission
  fallbacks are not acceptable.
- Keep comments concise and explain decisions or invariants, not obvious syntax.
- Co-locate `*.test.ts` files and follow the repository's `#given` / `#when` /
  `#then` style where practical. Never delete or skip a failing gate to make it pass.
- The root `src/index.ts` may export plugin-facing types, but do not add runtime
  function exports: OpenCode can interpret exports as plugin instances.

## Safety and git discipline

- Never commit API keys, OAuth tokens, user config, environment files, or generated
  runtime state. Use explicit test fixtures with fake values.
- Do not modify package versions or publish locally. Releases and package publishing
  are GitHub Actions responsibilities.
- Destructive cleanup, history rewriting, force pushes, and broad generated-file
  replacement require explicit user approval.
- In this workspace, one agent uses one branch, one persistent worktree under
  `~/worktrees/`, and one PR. Check `git status` and `git log --oneline -5` before
  committing so another session's work is not absorbed.
- This repository is a submodule of the workspace. Commit here first; update the
  parent repository's submodule pointer only after the user confirms it.
- Do not commit by default. A commit is allowed when the user explicitly requests
  one; stage only the files belonging to that request.
- Do not push, rebase, or force-update a remote unless the user explicitly requests it.

## Validation

CI installs dependencies with Bun:

```bash
bun install
```

Review any `bun.lock` diff and do not commit an incidental dependency resolution
change. Run the smallest relevant test during development, then typecheck and build:

```bash
bun test path/to/changed.test.ts
bun run check
bun run typecheck
bun run build
```

`bun run check` is the canonical local gate: it uses the same process-isolated test
runner as CI, then typechecks and builds. `bun test` is a useful broad sweep, but it
is not CI parity because some mock-heavy suites must run in separate Bun processes.
If a combined local run fails only through module-cache contamination, run the
failing file in isolation and report both results; do not hide a product failure
behind that distinction.

`bun run build` writes ignored `dist/` output and regenerates
`assets/oh-my-opencode.schema.json`. Schema changes must include the intentional
generated diff. Finish by reviewing `git diff --check`, `git diff`, and `git status`.

## Definition of done

- The nearest rules were followed and affected registration/schema boundaries agree.
- Focused tests and the applicable repository gates were run.
- Generated changes are intentional; credentials and local runtime state are absent.
- Existing failures are reported separately with reproducible evidence.
- Documentation describes stable contracts rather than a transient repository snapshot.
- When a commit was requested, it contains only the reviewed files for this task.

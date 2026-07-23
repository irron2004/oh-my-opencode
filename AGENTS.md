# Repository Agent Guide

> Workspace policy: when this checkout lives under ruahverce, read
> `../../../AGENTS.md` first. A standalone clone may not have that file, so the
> safety and isolation rules below remain self-contained.

This file is the canonical repository guide for Codex, Claude, OpenCode, and
other coding agents. More specific `AGENTS.md` files under `src/` override only
their local implementation details; they cannot weaken the safety rules here.

## Safety and isolation

- Use one branch and one worktree per agent. Never let two agents commit to the
  same branch or edit the same checkout concurrently.
- Before editing, committing, rebasing, or pushing, inspect
  `git status --short --branch` and `git log --oneline -5`. Preserve unfamiliar
  work and report it instead of stashing, resetting, or overwriting it.
- Never commit credentials, tokens, `.env` files, private configuration, or
  captured user data. Commit only documented example files.
- Deletion, `reset --hard`, force push, history rewrite, mass regeneration, and
  broad file moves require explicit user approval and an exact target check.
- Never bypass a failing gate with `--no-verify`, test deletion, `.skip`, or
  weakened assertions. A failure is evidence to diagnose and report.
- Pushes, releases, global installs, and pull requests are external changes.
  Perform them only when the user explicitly requests them.
- All repository communication is English: commits, pull requests, issues,
  documentation, code comments, and agent rules.

## Git and pull requests

The repository flow is:

```text
feature branch -> dev -> master
```

- All pull requests target `dev`; CI rejects pull requests to `master`.
- `master` is the deployed/published branch.
- Use merge commits. Do not squash or rebase published branches.
- Publishing is performed by GitHub Actions. Never run `bun publish` or change
  versions locally unless a release task explicitly requires it.

## Repository map and architecture

This fork of `oh-my-opencode` is an OpenCode plugin that provides agent
orchestration, lifecycle hooks, tools, skills, MCP integration, background
tasks, and Claude Code compatibility.

| Area | Purpose | Local guide |
|---|---|---|
| `src/agents/` | Built-in agent definitions and prompts | `src/agents/AGENTS.md` |
| `src/hooks/` | Lifecycle and tool interception hooks | `src/hooks/AGENTS.md` |
| `src/tools/` | LSP, search, delegation, and task tools | `src/tools/AGENTS.md` |
| `src/features/` | Skills, commands, sessions, and background agents | `src/features/AGENTS.md` |
| `src/cli/` | Installer and doctor commands | `src/cli/AGENTS.md` |
| `src/config/` | Zod configuration schema | `src/config/AGENTS.md` |
| `src/plugin-handlers/` | Configuration loading and plugin handlers | `src/plugin-handlers/AGENTS.md` |
| `src/shared/` | Cross-cutting utilities | `src/shared/AGENTS.md` |
| `src/mcp/` | Built-in MCP definitions | `src/mcp/AGENTS.md` |
| `script/` | Schema, release, binary, and test automation | this file |
| `packages/` | Platform-specific binary packages | this file |

Plugin initialization is composed through `src/index.ts`,
`src/create-managers.ts`, `src/create-tools.ts`, `src/create-hooks.ts`, and
`src/plugin-interface.ts`. Configuration is loaded in
`src/plugin-config.ts` and `src/plugin-handlers/config-handler.ts`.

## Reproducible setup and gates

Required runtime: Bun. Do not substitute npm, pnpm, or yarn for repository
development.

```bash
bun install --frozen-lockfile
bun run check
```

`bun run check` is the canonical local gate. It runs every discovered test file
with the same process isolation used by CI, then typechecks and builds.

Focused development commands:

```bash
bun test path/to/changed.test.ts
bun run test:ci
bun run typecheck
bun run build
bun run build:schema
```

- `bun test` without the CI runner can suffer from `mock.module()` cache
  contamination. Do not interpret a combined-process failure as a product
  failure until the isolated target is reproduced.
- `script/test-ci.ts` discovers test files rather than relying on a stale
  hand-maintained remainder list. Its own tests prove every file is assigned
  exactly once and every isolation target still exists.
- `bun run build` writes ignored `dist/` output and regenerates
  `assets/oh-my-opencode.schema.json`. Commit schema changes only when the
  source schema change intentionally produced them.
- CI uses the checked-in `bun.lock`; dependency updates must include a reviewed
  lockfile diff.

## Development workflow

Use RED-GREEN-REFACTOR for behavior changes:

1. Add or update a focused `*.test.ts` file and demonstrate the failure.
2. Implement the smallest complete behavior.
3. Refactor while the focused test remains green.
4. Run `bun run check` before committing.

Tests live beside source. Use `//#given`, `//#when`, and `//#then` comments when
they materially clarify the scenario. Do not separate a test from the behavior
it protects.

## Code conventions

- TypeScript strict mode; use `bun-types`, not `@types/node`.
- Avoid `as any`, `@ts-ignore`, `@ts-expect-error`, empty catch blocks, and
  silent fallback behavior.
- Prefer explicit factories such as `createXHook` and `createXTool`.
- Use kebab-case directory names and small, cohesive modules. Prompt strings
  are the main exception to the roughly 200-line module target.
- Add agents through the built-in agent registry, hooks through the hook
  composition modules, tools through the tool registry, commands through
  `src/features/builtin-commands/`, and schema fields through
  `src/config/schema/`.
- Preserve graceful degradation around optional providers and host features,
  but surface actionable errors instead of swallowing them.
- Verify OpenCode SDK and hook behavior from the current upstream source or
  official documentation. Do not guess from memory.

When upstream source inspection is needed, use a newly created temporary
directory and retain its resolved path. Never clone into this repository and
never remove an unresolved, user-supplied, or broad path.

## Generated and external effects

- `dist/` is generated and ignored.
- `assets/oh-my-opencode.schema.json` is generated but tracked.
- `bun run build:binaries`, release workflows, global installation, and the
  `opencode-build` Make target have external or expensive effects; run them
  only for an explicit matching request.
- Keep machine-local `.opencode/`, `.sisyphus/`, logs, sessions, and temporary
  build outputs out of commits unless they are deliberate tracked fixtures.

## Definition of done

A change is complete only when:

1. the focused behavior is covered,
2. `bun run check` passes,
3. generated tracked output is reviewed,
4. `git diff --check` passes,
5. `git status --short --branch` contains only the intended files, and
6. the commit is made on this agent's isolated branch with an English message.

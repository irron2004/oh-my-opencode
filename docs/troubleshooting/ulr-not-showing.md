# Troubleshooting: /ulr not showing

## Problem
When using the built-in /ulr command, the slash command may not appear in the UI or help listings.

## Failure modes
- historical: `/ulr` missing when not implemented as built-in
- `disabled_commands` includes `ulr`
- `disabled_hooks` includes `auto-slash-command`
- keyword boundary mismatch for `ulr`

## Quick verification
- List slash commands and confirm `/ulr`
- Run `bun test src/hooks/auto-slash-command/index.test.ts`

## Notes
- `/ulr` is built-in in current versions.

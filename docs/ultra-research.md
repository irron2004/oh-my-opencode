# Ultra Research (ULR)

ULR is a round-based, document-first research workflow.

It is designed for problems where you want research to converge into a reproducible experiment plan (not just chat logs).

## When to Use ULR

Use ULR when:
- you need multi-angle exploration (ideas + feasibility + evidence)
- you want the result captured in files that improve each round
- you need a concrete experiment plan with pass/fail criteria

Do not use ULR for:
- trivial fixes (use normal prompting)
- straightforward implementation (use `ulw` / ultrawork)
- precise multi-step projects with strict acceptance criteria (use `@plan` -> `/start-work`)

## How to Activate

Two ways:

1) Keyword activation
- Include `ulr` or `ultra-research` in your prompt.

2) Slash command activation
- Use `/ulr` with an optional topic/problem argument.
  - Example: `/ulr login refresh token drift investigation`

## Outputs (Artifacts)

ULR requires file updates at the end of every round.

Default paths:
- `.sisyphus/ulr/<topic>/brief.md`
- `.sisyphus/ulr/<topic>/research_log.md`
- `.sisyphus/ulr/<topic>/hypotheses.md`
- `.sisyphus/ulr/<topic>/experiment_plan.md`
- `.sisyphus/ulr/<topic>/decision_log.md`

## Evidence Tags

Every claim must be tagged:
- `[evidence: experiment]`
- `[evidence: literature]`
- `[evidence: codebase]`
- `[evidence: reasoning]`

## Round Protocol (0-3)

Round 0: Brief lock
- define the problem, constraints, success metrics, and available assets
- create the research document skeleton

Round 1: Diverge (parallel)
- Explorer generates 8-15 hypotheses
- each hypothesis includes a minimal falsifiable experiment

Round 2: Critique
- Reality Checker: KEEP/HOLD/KILL by feasibility
- Evidence Auditor: support/refute/missing evidence

Round 3: Converge
- Chair selects top 1-2 directions
- finalize `experiment_plan.md` with:
  - inputs, metrics, baseline, procedure, pass/fail

Optional Round 4+: Handoff
- generate prioritized TODOs for implementation mode (ULW)

## Spec Reference

The canonical spec lives at `docs/ulr-ultra-research-plan.md`.

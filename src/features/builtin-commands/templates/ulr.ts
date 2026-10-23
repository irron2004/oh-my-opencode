export const ULR_TEMPLATE = `Activate the Ultra Research (ULR) process.

## Objective

Run a round-based, document-first research workflow that converges to a reproducible experiment plan.

## Instructions

1. Pick a topic slug:
   - If user arguments include an explicit topic, use it.
   - Otherwise derive a short slug from the problem.

2. Create/update required artifacts:
   - .sisyphus/ulr/<topic>/brief.md
   - .sisyphus/ulr/<topic>/research_log.md
   - .sisyphus/ulr/<topic>/hypotheses.md
   - .sisyphus/ulr/<topic>/experiment_plan.md
   - .sisyphus/ulr/<topic>/decision_log.md
   - (optional) .sisyphus/ulr/<topic>/ulr.state.json

3. Follow the ULR spec:
   - Read docs/ulr-ultra-research-plan.md
   - Enforce evidence tags: [evidence: experiment|literature|codebase|reasoning]
   - Enforce KEEP/HOLD/KILL decisions each round
   - Round 3 MUST produce an executable experiment plan (inputs, metrics, procedure, pass/fail)

4. Orchestrate in waves (parallel):
   - Wave 1: Explorer (+ optional librarian/asset scout)
   - Wave 2: Reality Checker + Evidence Auditor
   - Wave 3: Chair synthesis + document updates

5. Stop conditions:
   - End after Round 3 unless confidence is still low; if so run ONE additional focused wave.
   - If implementation is needed, generate ULW handoff TODOs.
`

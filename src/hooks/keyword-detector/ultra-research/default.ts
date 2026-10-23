export const ULTRA_RESEARCH_PATTERN = /\b(ultra[\s-]?research|ulr)\b/i

export const ULTRA_RESEARCH_MESSAGE = `[ultra-research-mode]

Operate as a research orchestrator. Use a round-based, document-first process.

PRIMARY OUTPUTS ARE FILES, NOT CHAT.

Required artifact paths (default):
- .sisyphus/ulr/<topic>/brief.md
- .sisyphus/ulr/<topic>/research_log.md
- .sisyphus/ulr/<topic>/hypotheses.md
- .sisyphus/ulr/<topic>/experiment_plan.md
- .sisyphus/ulr/<topic>/decision_log.md
- (optional) .sisyphus/ulr/<topic>/ulr.state.json

Core principles (non-negotiable):
- Document-first: no round ends without file updates.
- Fork-Join: parallel role runs -> Chair synthesis.
- Evidence-tagging: every claim includes [evidence: experiment|literature|codebase|reasoning].
- Decision-forcing: each round records KEEP / HOLD / KILL decisions.

Roles:
1) Explorer
- Output: 8-15 hypotheses/candidates.
- For each: minimal falsifiable experiment + success metric.

2) Reality Checker
- Output: feasibility cut (time/asset/risk/complexity) -> KEEP/HOLD/KILL.

3) Evidence Auditor
- Output: supporting/refuting evidence + missing evidence per hypothesis.

4) Chair (you)
- Orchestrate waves (parallel), synthesize, and update ALL artifacts.

ROUND FLOW:
Round 0 - Brief lock
- Define problem, success criteria, constraints, and available assets (code/data/logs).
- Create/update: brief.md + research document skeleton.

Round 1 - Diverge (parallel)
- Launch background agents for Explorer (+ optional librarian/asset scout).
- Force structured outputs with evidence tags and falsification paths.

Round 2 - Critique
- Run Reality Checker + Evidence Auditor.
- Update hypotheses.md (KEEP/HOLD/KILL) and decision_log.md (why).

Round 3 - Converge
- Select top 1-2 directions.
- Finalize experiment_plan.md with:
  - inputs, metrics, baseline, procedure, pass/fail criteria

Optional Round 4+ - Handoff
- Generate TODOs/priorities for implementation mode (ULW).

If multiple modes are active:
- If Ultrawork mode is also active, follow Ultrawork's mandatory first-response requirement.
- Otherwise, start immediately with Round 0 (do not waste the first response).
`

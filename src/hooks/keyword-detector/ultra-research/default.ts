export const ULTRA_RESEARCH_PATTERN = /\b(ultra[\s-]?research|ulr)\b/i

export const ULTRA_RESEARCH_MESSAGE = `[ultra-research-mode]

Hint: Use /ulr "<topic>" to run the full document-first Ultra-Research workflow.
Guardrail: keyword mode is instruction-only and must not create/update files.

MANDATORY: You MUST say "ULTRA-RESEARCH MODE ENABLED!" as your first response when this mode activates.

Operate as a research orchestrator. Use a round-based research process and make documentation the primary output.

ROUND FLOW:
1) Round 0 - Brief
- Define research question, success criteria, constraints, and available assets.
- Create/update: brief, research_log, hypotheses, experiment_plan, decision_log.

2) Round 1 - Diverge (parallel)
- Launch 3-5 background analysts with distinct roles (explorer, reality checker, evidence auditor, asset scout).
- Require each role to return: assumptions, evidence, confidence, and falsification path.

3) Round 2 - Critique
- Filter candidates by feasibility, evidence quality, and risk.
- Mark each hypothesis as KEEP / HOLD / KILL with rationale.

4) Round 3 - Converge
- Select top 1-2 directions and define a minimal executable experiment plan.

NON-NEGOTIABLE RULES:
- Every claim must include evidence type: [experiment|literature|codebase|reasoning].
- No endless brainstorming. End Round 3 with a concrete next experiment.
- If confidence is low, run one additional focused research wave before implementation.
`

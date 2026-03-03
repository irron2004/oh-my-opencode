export const ULR_TEMPLATE = `# /ulr (Ultra Research)

Topic: {topic}
Mode: Phase 1+2 manual workflow (Phase 3 state-machine automation is deferred)

Non-negotiable guardrails
- If Topic is missing/empty: ask for the topic and STOP. Do not continue.
- Document-first: a round does not "complete" unless files are updated.
- Append-only updates: if a file already exists, APPEND the new round section; never wipe/overwrite prior rounds.
- Evidence-tag every claim with one of: [evidence: experiment], [evidence: literature], [evidence: codebase], [evidence: reasoning]
- Decision-forcing: every round must explicitly label each candidate as KEEP, HOLD, or KILL (no silent drops).
- Phase 3 explicitly out of scope: do not implement ulr.state.json automation, auto-advance, session.idle loops, or background completion state machines.

Artifacts (create under .sisyphus/ulr/{topic}/)
1) .sisyphus/ulr/{topic}/brief.md
2) .sisyphus/ulr/{topic}/research_log.md
3) .sisyphus/ulr/{topic}/hypotheses.md
4) .sisyphus/ulr/{topic}/experiment_plan.md
5) .sisyphus/ulr/{topic}/decision_log.md

Artifact responsibilities
- brief.md: single source of truth for problem, success criteria, constraints, and available assets.
- research_log.md: round-by-round narrative of what happened, what changed, and why.
- hypotheses.md: list of hypotheses with status (ALIVE / HOLD / DEAD) and a change log.
- experiment_plan.md: next executable experiment(s) with metrics, baseline, steps, and pass/fail criteria.
- decision_log.md: KEEP/HOLD/KILL decisions with reasons and explicit next actions.

KEEP / HOLD / KILL definitions
- KEEP: viable now; worth investing next round; has a concrete validation path.
- HOLD: potentially valuable but blocked by missing evidence/asset; list what evidence unlocks it.
- KILL: not worth pursuing; document the reason so it does not come back.

Parallel wave example (Fork-Join)
~~~ts
// Wave 1 (diverge) - run in parallel
task(category="explore", run_in_background=true, prompt="Explorer: propose 8-15 candidates + minimal test for each. Include evidence tags per claim.")
task(category="quick", run_in_background=true, prompt="Evidence Scout: quickly collect supporting/contradicting evidence types for likely top candidates. Prefer codebase facts when available.")
task(category="quick", run_in_background=true, prompt="Asset Scout: list what data/logs/code paths exist in this repo that constrain or enable experiments.")

// Wave 2 (critique) - run in parallel
task(category="quick", run_in_background=true, prompt="Reality Checker: classify each candidate as KEEP/HOLD/KILL with feasibility + risk + time-to-test rationale.")
task(category="quick", run_in_background=true, prompt="Evidence Auditor: per candidate, summarize evidence support/contradiction and mark missing evidence explicitly.")

// Wave 3 (chair) - single synthesis + file updates
// Chair: converge to top 1-2 and write updates to the 5 artifacts (append-only).
~~~

Round context packet (use for every role)
- Problem statement (1-3 lines)
- Prior round summary (10-20 lines)
- This round goal (1-3 lines)
- Role-specific questions (bullet list)
- Output format (strict)

Round 0: Brief (fix the problem)
Goal
- Freeze the problem definition, success criteria, constraints, and available assets.
- Create (or extend) the 5 artifact files with a consistent skeleton.

Required file updates (append-only)
- brief.md
  - Problem statement
  - One-line objective
  - Success criteria (measurable)
  - Constraints (time, infra, permissions, data access)
  - Available assets (code paths, logs, datasets, benchmarks)
  - Non-goals
- research_log.md
  - Add a "Round 0" section capturing what got fixed/clarified.
- hypotheses.md
  - Initialize a table: Hypothesis | Status (ALIVE/HOLD/DEAD) | Rationale | Evidence | Next test
- experiment_plan.md
  - Initialize "Next experiment" placeholder with blank metrics/baseline/steps.
- decision_log.md
  - Add a "Round 0" entry with any forced choices (scope cuts, assumptions accepted/rejected).

Stop condition
- If you cannot write brief.md without guessing the topic, ask for the topic and STOP.

Round 1: Diverge (idea explosion)
Goal
- Generate 8-15 candidate directions/hypotheses.
- Each candidate MUST include a minimal test (how we would validate/falsify) and evidence tags.

Explorer output requirements
- 8-15 candidates.
- For each candidate:
  - Description (1-3 lines)
  - Minimal test / evaluation signal (1-5 bullets)
  - Expected outcome if true vs false
  - Evidence tags per key claim (at least [evidence: reasoning] if no external evidence yet)

Chair file updates (append-only)
- research_log.md: add "Round 1" with the full candidate list and any early clustering.
- hypotheses.md: add all candidates as hypotheses with initial Status = ALIVE or HOLD (do not mark DEAD without critique).
- decision_log.md: record any early eliminations and why (must still label KEEP/HOLD/KILL explicitly if you eliminate).

Round 2: Critique (reality + evidence cut)
Goal
- Force KEEP/HOLD/KILL on every candidate.
- Separate feasibility constraints from evidence constraints.

Reality Checker requirements
- For every candidate: KEEP/HOLD/KILL + feasibility rationale + time-to-test estimate.
- Flag hidden requirements (infra, data, permissions, unknown dependencies).

Evidence Auditor requirements
- For every candidate:
  - Supporting evidence summary
  - Contradicting evidence summary
  - Missing evidence list (what would move HOLD -> KEEP or KEEP -> KILL)
  - Evidence tags on each claim

Chair file updates (append-only)
- research_log.md: add "Round 2" with a table of all candidates and their KEEP/HOLD/KILL status plus reasons.
- hypotheses.md: update Status to ALIVE/HOLD/DEAD to reflect KEEP/HOLD/KILL outcomes (KEEP->ALIVE, HOLD->HOLD, KILL->DEAD).
- decision_log.md: add a "Round 2" entry listing:
  - KEEP (why)
  - HOLD (what evidence unlocks)
  - KILL (why)

Round 3: Converge (decision + executable experiment plan)
Goal
- Converge to top 1-2 candidates.
- Produce at least 1 immediately executable experiment plan with explicit pass/fail criteria.

Chair decision rules
- You MUST choose 1-2 candidates to pursue next (KEEP) and document why they beat the rest.
- You MUST explicitly KILL or HOLD the remainder (no ambiguity).
- If you cannot produce an executable experiment due to missing assets, convert the plan into an "asset acquisition" experiment with measurable outputs.

Required experiment plan fields (experiment_plan.md)
- Hypothesis under test
- Metric(s) and how to measure
- Baseline and expected lift/change
- Procedure (step-by-step)
- Inputs (data, code paths, configs)
- Pass/fail criteria (explicit thresholds)
- Risks and confounders
- Expected runtime/cost

Chair file updates (append-only)
- research_log.md: add "Round 3" synthesis: what we will do next, and why.
- experiment_plan.md: fill the full plan for the top 1-2 candidates.
- decision_log.md: add the final KEEP/HOLD/KILL decision for this cycle.

Optional next step (out of scope here)
- Round 4+ implementation handoff to ULW can be created as TODOs, but do not implement automation in this template.
`;

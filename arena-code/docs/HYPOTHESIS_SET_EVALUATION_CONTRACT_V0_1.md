# REA BrainCore: Finite Hypothesis-Set Evaluation Contract v0.1

**Contract ID:** `REA-BRAINCORE-HSET-0.1`

**Status:** Additive contract built on `REA-BRAINCORE-IC-0.1`.

## Purpose

Compare a finite, caller-supplied set of structured candidate claims against the same closed evidence set. This is REA-owned alternative assessment, not hypothesis generation or truth selection.

## Inputs

- The same tool-free `PreparationPlan`, local-only `ToolExecutionPolicy`, and closed `ClaimEvidence[]` required by the internal cognition-cycle contract.
- At least two candidate hypotheses. Each has a non-empty `id` and one structured `AtomicClaim`; IDs are NFC-normalized, trimmed, and unique after normalization.
- All candidates share the same plan, policy, and evidence set in one invocation.

## Behavior

1. Validate candidate-list shape and unique IDs before evaluating.
2. Evaluate each candidate through the existing `judgeAtomicClaimAfterPreparation` gate and comparator. Do not introduce another evidence comparator.
3. Return per-candidate `JudgmentResult` only when **every** candidate passes readiness and provenance checks. If any candidate is not ready, return the highest-priority stop status and candidate-scoped findings; expose no partial candidate judgments.
4. For a fully evaluated set, report candidate IDs partitioned by `supported`, `refuted`, `contested`, and `insufficient` status.
5. Preserve candidate input order and each judgment's evidence assessments.

## Non-goals and truth boundary

- Do not generate, revise, rank, score, or select hypotheses. There is no `winner`, confidence, probability, majority, or truth claim.
- A candidate's existing status has exactly the v0.1 meaning: an exact structured comparison against caller-supplied evidence. `supported` is not real-world verification.
- No evidence retrieval, web search, Provider, paid model, tool call, delegation, persistence, or memory write.
- A new invocation with a changed candidate set is caller-mediated; the function does not replan.

## Stop precedence

If any candidate cannot be judged, stop the whole set and expose no judgments. Select a top-level status in this order: `invalid` > `blocked` > `needs-information` > `needs-tool-selection`. Include a finding for each affected candidate and retain its underlying stop status.

## Acceptance criteria

1. Two or more distinct candidate IDs are required; duplicate IDs or malformed sets return `invalid`.
2. A missing/one-item candidate list returns `needs-information`.
3. A fully ready set returns one judgment per candidate and a complete, non-overlapping status partition whose IDs preserve input order.
4. Mixed candidate outcomes remain mixed; no winner is selected or ranked.
5. If one candidate fails readiness or provenance, the result contains no candidate judgments, even if another candidate was ready.
6. Identical input is deterministic and unmodified; the path stays local and side-effect free.
7. Tests use synthetic evidence and do not claim semantic or source-truth verification.

## Executable contract tests

`tests/brainCoreHypotheses.test.ts` covers supported/refuted alternatives, multiple supported candidates, all-or-none readiness failure, minimum set size, duplicate IDs, deterministic output, and input immutability. Run with:

```sh
npx vitest run tests/brainCoreHypotheses.test.ts
```

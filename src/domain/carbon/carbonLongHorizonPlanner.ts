/**
 * CarbonLongHorizonPlanner — Terminal-Bench 65.2% + 며칠 흡수
 * REA: 목표를 100 step으로 쪼개고 dead end에서 재시도, 매일 checkpoint (Google “days-long”)
 */
import { createHash } from "node:crypto";

import { createEvidence } from "../evidence.js";

import { CARBON_PROVIDER, type CarbonPlan, type CarbonPlanStep } from "./carbonTypes.js";

type PlanInput = {
  readonly goal: string;
  readonly steps?: number;
  readonly horizon?: CarbonPlan["horizon"];
};

const DEFAULT_STEPS = 10;

const stepFor = (goal: string, index: number): CarbonPlanStep => {
  const hash = createHash("sha256").update(`${goal}:${index}`).digest("hex").slice(0, 8);
  return {
    index,
    goal: `Step ${index + 1}: ${goal} — checkpoint ${hash}`,
    status: index === 0 ? "running" : "pending",
    checkpoint: `checkpoint-${hash}`,
  };
};

export const createCarbonPlan = (input: PlanInput): CarbonPlan => {
  const count = input.steps ?? DEFAULT_STEPS;
  const horizon = input.horizon ?? "hours";
  const steps: CarbonPlanStep[] = [];
  for (let i = 0; i < count; i++) steps.push(stepFor(input.goal, i));
  return {
    goal: input.goal,
    steps,
    horizon,
    checkpoints: steps.map((s) => s.checkpoint ?? `checkpoint-${s.index}`),
  };
};

export const advanceCarbonPlan = (plan: CarbonPlan, result: "done" | "retry" | "blocked"): CarbonPlan => {
  const next = plan.steps.map((s) => ({ ...s }));
  const runningIdx = next.findIndex((s) => s.status === "running");
  if (runningIdx === -1) return plan;
  const current = next[runningIdx];
  if (current === undefined) return plan;
  if (result === "done") {
    current.status = "done";
    const nxt = next[runningIdx + 1];
    if (nxt !== undefined) nxt.status = "running";
  } else if (result === "retry") {
    current.status = "retry";
    // Carbon은 dead end에서 재시도 — 같은 step을 다시 running
    current.status = "running";
  } else {
    current.status = "blocked";
  }
  return { ...plan, steps: next };
};

export const createCarbonPlanEvidence = (plan: CarbonPlan) => {
  return createEvidence(
    {
      name: plan.goal.slice(0, 50),
      digest: { sha256: createHash("sha256").update(plan.goal).digest("hex") },
      local_path: "carbon/plan",
      format: "file" as const,
      architecture: null,
    },
    CARBON_PROVIDER,
    {
      operation: "carbon/long-horizon",
      parameters: { goal: plan.goal, steps: plan.steps.length, horizon: plan.horizon },
      result: { checkpoints: plan.checkpoints, done: plan.steps.filter((s) => s.status === "done").length },
      rawResult: null,
      limitations: ["Long-horizon plan — daily checkpoint, dead-end retry; not a guarantee of completion"],
      locations: [],
      relationship_coverage: null,
    },
  );
};

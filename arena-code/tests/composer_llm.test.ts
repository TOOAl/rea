import { describe, it, expect } from "vitest";
import { selectAnonymous, selectAnonymousWithLLM } from "../src/harness2/composer.js";

describe("Selection heuristic", () => {
  it("picks longest deliverable", () => {
    const res = selectAnonymous({
      candidates: [
        { label: "a", deliverable: "short", rollout: { label: "a", runId: "1", ok: true, delivered: true, trajectory: "x" } as never },
        { label: "b", deliverable: "much longer deliverable text here", rollout: { label: "b", runId: "2", ok: true, delivered: true, trajectory: "y" } as never },
      ],
    });
    expect(res.chosenLabel).toBe("b");
  });
});

describe("Selection LLM fallback", () => {
  it("falls back to heuristic when LLM fails", async () => {
    const failingProvider = {
      name: "mock",
      model: "test",
      streamChat: async function* () {
        throw new Error("llm down");
      },
    } as never;
    const res = await selectAnonymousWithLLM(
      {
        candidates: [
          { label: "a", deliverable: "short", rollout: { label: "a", runId: "1", ok: true, delivered: true, trajectory: "x" } as never },
          { label: "b", deliverable: "much longer deliverable text here", rollout: { label: "b", runId: "2", ok: true, delivered: true, trajectory: "y" } as never },
        ],
      },
      failingProvider,
    );
    expect(res.chosenLabel).toBe("b");
    expect(res.reason).toContain("fallback");
  });

  it("parses LLM JSON choice", async () => {
    const mockProvider = {
      name: "mock",
      model: "test",
      streamChat: async function* () {
        yield { type: "text_delta", text: '{"choice":"B","reason":"better completeness"}' } as never;
      },
    } as never;
    const res = await selectAnonymousWithLLM(
      {
        candidates: [
          { label: "alpha", deliverable: "a".repeat(10), rollout: { label: "alpha", runId: "1", ok: true, delivered: true, trajectory: "x" } as never },
          { label: "beta", deliverable: "b".repeat(20), rollout: { label: "beta", runId: "2", ok: true, delivered: true, trajectory: "y" } as never },
        ],
        taskPrompt: "do stuff",
      },
      mockProvider,
    );
    expect(res.chosenLabel).toBe("beta");
  });
});

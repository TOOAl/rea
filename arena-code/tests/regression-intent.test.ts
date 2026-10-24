import { describe, expect, it } from "vitest";
import { classifyIntent } from "../src/loop/intent.js";
import fixtures from "./fixtures/exam/fixtures.json";

describe("Regression: 10개 픽스처 의도 분류", () => {
  for (const fx of fixtures as Array<{ id: string; prompt: string; expectedIntent: string; expectLowConfidence?: boolean }>) {
    it(`fixture ${fx.id} → ${fx.expectedIntent}`, () => {
      const intent = classifyIntent([{ role: "user", content: fx.prompt }]);
      expect(intent.kind).toBe(fx.expectedIntent);
      if (fx.expectLowConfidence) {
        expect(intent.confidence).toBeLessThan(0.5);
      } else {
        expect(intent.confidence).toBeGreaterThanOrEqual(0.4);
      }
    });
  }
});

describe("Regression: EvidenceLedger truncated 인지", () => {
  it("truncated=true인 픽스처는 ledger에 잘림 표시 필요", async () => {
    const { EvidenceLedger } = await import("../src/loop/evidenceLedger.js");
    const l = new EvidenceLedger();
    for (const fx of fixtures as Array<{ truncated?: boolean }>) {
      if (fx.truncated) {
        l.fromUserAttach("image-1.png", fx.prompt?.slice(0, 200) ?? "", true);
      }
    }
    const summary = l.summarizeForPrompt();
    expect(summary).toContain("TRUNCATED");
  });
});

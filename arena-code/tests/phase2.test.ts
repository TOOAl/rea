import { describe, expect, it } from "vitest";
import { EvidenceLedger } from "../src/loop/evidenceLedger.js";
import { persistLedgerToTree, buildEvidencePointer } from "../src/loop/evidenceTreeBridge.js";
import { classifyIntent, proposeIntentVariants } from "../src/loop/intent.js";
import { scoreCandidate, selectBestCandidate } from "../src/loop/outputQuality.js";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Phase 2 — EvidenceTree Bridge", () => {
  it("ledger를 EvidenceTree로 영속화", () => {
    const ledger = new EvidenceLedger();
    ledger.fromUserAttach("image-1.png", "what leaders pay attention to [TRUNCATED]", true);
    ledger.add({ kind: "observation", source: "Read(a.txt)", content: "full content here", confidence: 1 });
    const tmp = mkdtempSync(join(tmpdir(), "rea-evidence-"));
    const tree = persistLedgerToTree(ledger, "test-task-29", { evidenceRoot: tmp, taskPrompt: "29번 어법 문항" });
    expect(tree).not.toBeNull();
    expect(tree!.rollouts).toContain("ledger-main");
    expect(existsSync(tree!.root)).toBe(true);
    const pointer = buildEvidencePointer(tree);
    expect(pointer).toContain("EvidenceTree root:");
  });

  it("빈 ledger는 null 반환 (fail-closed)", () => {
    const ledger = new EvidenceLedger();
    const tmp = mkdtempSync(join(tmpdir(), "rea-evidence-"));
    const tree = persistLedgerToTree(ledger, "empty-task", { evidenceRoot: tmp });
    expect(tree).toBeNull();
  });
});

describe("Phase 2 — Intent Proposer invariant/domain", () => {
  it("DaVinci 요청은 invariant/domain 두 힌트 생성", () => {
    const intent = classifyIntent([{ role: "user", content: "DaVinci Resolve 21.3.7로 편집 가이드 1920x1080 만들어줘" }]);
    const variants = proposeIntentVariants("DaVinci Resolve 21.3.7로 편집 가이드 1920x1080 만들어줘", intent);
    expect(variants.invariant.dim).toBe("invariant");
    expect(variants.domain.dim).toBe("domain");
    expect(variants.domain.hint).toContain("DaVinci");
    expect(variants.invariant.hint).toContain("공통 절차");
  });

  it("어법 문항은 exam 도메인 힌트", () => {
    const intent = classifyIntent([{ role: "user", content: "29 다음 글의 밑줄 친 부분 중 어법상 틀린 것은?" }]);
    const variants = proposeIntentVariants("29 다음 글의 밑줄 친 부분 중 어법상 틀린 것은?", intent);
    expect(variants.domain.hint).toContain("수능 어법");
    expect(variants.domain.hint).toContain("밑줄");
  });
});

describe("Phase 2 — OutputQuality Composer (behavioral contrast)", () => {
  it("2후보 중 품질 높은 쪽 선택", () => {
    const bad = [{ type: "text" as const, text: "정답: ③ 입니다." }]; // leak + underline 부족
    const good = [{ type: "text" as const, text: `<span class="ul">a</span><span class="ul">b</span><span class="ul">c</span><span class="ul">d</span><span class="ul">e</span><p>본문</p>` + "x".repeat(900) + "정답: ③" }];
    const s1 = scoreCandidate("bad", bad, { expectedUnderlineCount: 5 });
    const s2 = scoreCandidate("good", good, { expectedUnderlineCount: 5 });
    expect(s1.score).toBeLessThan(s2.score);
    const best = selectBestCandidate([s1, s2]);
    expect(best?.label).toBe("good");
  });

  it("동점 시 fail 적은 쪽 우선", () => {
    const a = scoreCandidate("a", [{ type: "text" as const, text: "hello TODO" }], {});
    const b = scoreCandidate("b", [{ type: "text" as const, text: "hello world" }], {});
    const best = selectBestCandidate([a, b]);
    expect(best?.label).toBe("b");
  });
});

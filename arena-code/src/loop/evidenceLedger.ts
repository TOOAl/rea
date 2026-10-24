/**
 * Evidence Ledger — Pillar 1: 문맥 파악 강화
 * AGENTS.md가 요구하는 "observations / derivations / inferences / unknowns 구분 + 출처 보존"을 코드로 강제
 *
 * 기존 문제: tool_result가 500자 잘림에도 잘림 여부를 모름 → 모델이 잘린 내용을 전체로 착각 (29번 이미지 하단 잘림이 대표)
 * 해법: 각 증거에 provenance + truncated + confidence를 구조로 보관, 프롬프트에는 포인터로만 노출
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §5 (Evidence Tree), AGENTS.md Product and Authority
 */

export type EvidenceKind = "observation" | "derivation" | "inference" | "unknown";

export interface EvidenceEntry {
  id: string; // e.g. "tool:Bash:3", "user:attach:image-1.png"
  kind: EvidenceKind;
  source: string; // e.g. "Read(src/loop/context.ts:12)", "WebFetch(https://...)", "UserAttach(image-1.png)"
  content: string; // 원문 (잘림 전)
  truncated: boolean; // 5000자 cắt 등 잘림 발생 시 true
  capturedAt: string; // ISO
  confidence: number; // 0..1 — observation=1, derivation 0.8, inference 0.6, unknown 0.2
  meta?: Record<string, string>; // e.g. {bytes: "49012", lines: "12/45"}
}

export class EvidenceLedger {
  private entries: EvidenceEntry[] = [];
  private counter = 0;

  add(entry: Omit<EvidenceEntry, "id" | "capturedAt"> & { id?: string; capturedAt?: string }): EvidenceEntry {
    const e: EvidenceEntry = {
      id: entry.id ?? `ev-${++this.counter}`,
      kind: entry.kind,
      source: entry.source,
      content: entry.content,
      truncated: entry.truncated ?? false,
      capturedAt: entry.capturedAt ?? new Date().toISOString(),
      confidence: entry.confidence,
      meta: entry.meta,
    };
    this.entries.push(e);
    return e;
  }

  /** tool_result에서 자동 생성 — 잘림 감지 포함 */
  fromToolResult(toolName: string, input: Record<string, unknown>, result: string, opts?: { maxLen?: number }): EvidenceEntry {
    const maxLen = opts?.maxLen ?? 5000;
    const truncated = result.length >= maxLen;
    const inputStr = JSON.stringify(input).slice(0, 300);
    return this.add({
      kind: "observation",
      source: `${toolName}(${inputStr})`,
      content: result,
      truncated,
      confidence: truncated ? 0.8 : 1.0, // 잘림이면 신뢰도 하락
      meta: { chars: String(result.length), truncated: String(truncated) },
    });
  }

  fromUserAttach(filename: string, contentHint: string, truncated = false): EvidenceEntry {
    return this.add({
      kind: "observation",
      source: `UserAttach(${filename})`,
      content: contentHint,
      truncated,
      confidence: truncated ? 0.7 : 0.9,
    });
  }

  /** 프롬프트에 넣을 요약 포인터 — 긴 내용은 파일로, 짧은 포인터만 프롬프트에 */
  summarizeForPrompt(maxChars = 3000): string {
    if (this.entries.length === 0) return "(no evidence yet)";
    const lines = this.entries.slice(-8).map(e => {
      const flag = e.truncated ? " [TRUNCATED — 원문 일부 유실, 추측 금지]" : "";
      const preview = e.content.replace(/\s+/g, " ").slice(0, 200);
      return `- [${e.kind}/${e.confidence}] ${e.source}${flag}: ${preview}${e.content.length > 200 ? "…" : ""}`;
    });
    const summary = lines.join("\n");
    return summary.length > maxChars ? summary.slice(0, maxChars) + "\n… (more evidence truncated)" : summary;
  }

  list(): EvidenceEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.counter = 0;
  }
}

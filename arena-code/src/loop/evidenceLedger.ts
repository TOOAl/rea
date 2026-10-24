/**
 * Evidence Ledger — Pillar 1: 문맥 파악 강화
 * AGENTS.md가 요구하는 "observations / derivations / inferences / unknowns 구분 + 출처 보존"을 코드로 강제
 *
 * 기존 문제: tool_result가 500자 잘림에도 잘림 여부를 모름 → 모델이 잘린 내용을 전체로 착각 (29번 이미지 하단 잘림이 대표)
 * 해법: 각 증거에 provenance + truncated + confidence를 구조로 보관, 프롬프트에는 포인터로만 노출
 *
 * 참조: docs/HARNESS2_REA_ANALYSIS.md §5 (Evidence Tree), AGENTS.md Product and Authority
 */

export type EvidenceKind =
  | "observation"
  | "derivation"
  | "inference"
  | "unknown";

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

  add(
    entry: Omit<EvidenceEntry, "id" | "capturedAt"> & {
      id?: string;
      capturedAt?: string;
    },
  ): EvidenceEntry {
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
  fromToolResult(
    toolName: string,
    input: Record<string, unknown>,
    result: string,
    opts?: { maxLen?: number },
  ): EvidenceEntry {
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

  fromUserAttach(
    filename: string,
    contentHint: string,
    truncated = false,
  ): EvidenceEntry {
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
    const lines = this.entries.slice(-8).map((e) => {
      const flag = e.truncated
        ? " [TRUNCATED — 원문 일부 유실, 추측 금지]"
        : "";
      const preview = e.content.replace(/\s+/g, " ").slice(0, 200);
      return `- [${e.kind}/${e.confidence}] ${e.source}${flag}: ${preview}${e.content.length > 200 ? "…" : ""}`;
    });
    const summary = lines.join("\n");
    return summary.length > maxChars
      ? summary.slice(0, maxChars) + "\n… (more evidence truncated)"
      : summary;
  }

  list(): EvidenceEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.counter = 0;
  }

  /**
   * 증거 도장 — 정확한 것 Pillar: 최종 출력에 붙일 출처 블록 생성
   * 1층 전제 3천재가 만든 fact/claim 분류를 포함, 누락 시 Gate에서 FAIL
   */
  renderStamp(opts?: {
    title?: string;
    includeFacts?: Array<{ claim: string; source: string; date?: string }>;
  }): string {
    const title = opts?.title ?? "📎 증거 도장 (출처 블록)";
    const lines: string[] = [
      `\n---\n### ${title}\n> 이 답변은 아래 관찰(observation)에만 근거합니다. 추측은 [추정]으로 표시.\n`,
    ];
    if (opts?.includeFacts && opts.includeFacts.length) {
      lines.push("| 구분 | 주장 | 출처 | 날짜 |");
      lines.push("|---|---|---|---|");
      for (const f of opts.includeFacts) {
        lines.push(
          `| 사실 | ${f.claim.slice(0, 40)} | ${f.source} | ${f.date ?? "-"} |`,
        );
      }
    }
    if (this.entries.length) {
      lines.push("\n**근거 목록:**");
      for (const e of this.entries.slice(-6)) {
        const flag = e.truncated ? " [일부 잘림]" : "";
        lines.push(
          `- \`${e.source}\` (${e.kind}/${e.confidence})${flag}: ${e.content.replace(/\s+/g, " ").slice(0, 120)}…`,
        );
      }
    } else {
      lines.push(
        "\n- (근거: 사용자의 직접 입력 — 별도 외부 출처 없음, 재확인 권장)",
      );
    }
    lines.push(
      "\n> ⚠️ [추정] 표시 없는 수치는 모두 위 출처에서 확인됨. 출처 없으면 답에 포함하지 않음.\n",
    );
    return lines.join("\n");
  }

  /**
   * 사실/주장 분리표 — 1층 ArticleInputBrain이 생성한 factRatio를 구조화
   * 2층 설계실에서 바로 쓰도록 markdown 표 반환
   */
  static buildFactClaimTable(article: string): {
    table: string;
    factRatio: number;
    facts: string[];
    claims: string[];
  } {
    const lines = article
      .split("\n")
      .filter((l) => l.trim().length > 10)
      .slice(0, 12);
    const facts: string[] = [];
    const claims: string[] = [];
    const factMarkers =
      /(따르면|발표|기록|통계|종가|마감|발생|확인|공개|보도|에 따르면|자료에 따르면)/;
    const claimMarkers =
      /(전망|예상|것으로 보인다|것으로 예상|할 것이다|것이다\.?$|추측|관측)/;
    for (const l of lines) {
      if (factMarkers.test(l)) facts.push(l.trim().slice(0, 80));
      else if (claimMarkers.test(l)) claims.push(l.trim().slice(0, 80));
      else if (/\d/.test(l)) facts.push(l.trim().slice(0, 80)); // 숫자 있으면 일단 사실 후보
    }
    const factRatio =
      facts.length + claims.length
        ? Math.round((facts.length / (facts.length + claims.length)) * 100)
        : 50;
    const table = [
      "| 구분 | 내용 | 출처 필요 |",
      "|---|---|---|",
      ...facts.slice(0, 5).map((f) => `| ✅ 사실 | ${f} | 예 |`),
      ...claims.slice(0, 5).map((c) => `| 🔮 추정 | ${c} | 예 — [추정] 표기 |`),
      ...(facts.length === 0 && claims.length === 0
        ? ["| - | (분류할 문장 없음 — 원문 짧음) | - |"]
        : []),
    ].join("\n");
    return { table, factRatio, facts, claims };
  }
}

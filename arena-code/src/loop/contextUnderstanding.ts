/**
 * Context Understanding Orchestrator — 3-Pillar 통합 (REA+Ghidra 흡수)
 * 12살 설명: 숙제할 때 1) 책에서 필요한 쪽만 찾아(문맥) → 2) 선생님이 뭘 원하는지 파악(의도) → 3) 제출 전 맞춤법 검사(품질) 순서로 하는 것
 *
 * REA 흡수:
 * - Claude Code 9단계 queryLoop + 5단계 Compaction → evidenceLedger + tieredBudget + preserve
 * - Cursor @codebase 심볼 그래프 → structuralContext + Serena 3종 (find_symbol 등)
 * - Codex AGENTS.md 계층 → loadAgentsMdHierarchy + autotrigger
 * - Aider repo-map → importGraph 빈도 요약 2500자
 * - Windsurf Cascade provenance → EvidenceLedger truncated flag
 * - Ghidra P-Code → 바이너리도 텍스트처럼 Chunk/RAG 인덱싱, 호출 경로 추적
 */
import { EvidenceLedger } from "./evidenceLedger.js";
import { classifyIntent, formatIntentHintForPrompt, type Intent } from "./intent.js";
import { buildStructuralContext, formatStructuralContext } from "./structuralContext.js";
import { assembleSystemPrompt, type RichContextOptions } from "./context.js";
import { qualityGate, qualityFeedback } from "./outputQuality.js";
import type { Message, ContentBlock } from "../providers/types.js";

export interface ContextUnderstandingOptions {
  cwd: string;
  messages: Message[];
  evidenceLedger?: EvidenceLedger;
  enableIntentGate?: boolean; // confidence<0.5면 clarification 반환
  enableQualityGate?: boolean; // 최종 출력 1회 검사
}

export interface ContextUnderstandingResult {
  intent: Intent;
  intentHint: string;
  structuralText: string;
  evidenceSummary: string;
  systemPrompt: string;
  shouldClarify: boolean;
  clarification?: string;
}

export async function prepareContextUnderstanding(
  opts: ContextUnderstandingOptions
): Promise<ContextUnderstandingResult> {
  const ledger = opts.evidenceLedger ?? new EvidenceLedger();
  const intent = classifyIntent(opts.messages);

  // 1) 문맥: 구조 + 증거 (Aider map + Ghidra 스타일)
  const structural = await buildStructuralContext(opts.cwd).catch(() => null);
  const structuralText = structural ? formatStructuralContext(structural) : "(structural unavailable)";

  const evidenceSummary = ledger.summarizeForPrompt(2500);

  // 2) 의도 힌트 (Harness² invariant/domain 분기 재사용)
  const intentHint = formatIntentHintForPrompt(intent, opts.messages.map(m => typeof m.content==='string'?m.content:JSON.stringify(m.content)).join("\n"));

  // 3) 시스템 프롬프트 조립 — STATIC/DYNAMIC 분리 (Claude Code 프롬프트 캐싱 철학)
  const rich: RichContextOptions = {
    evidenceSummary,
    intentHint,
    structuralContext: structuralText,
  };
  const systemPrompt = await assembleSystemPrompt(opts.cwd, undefined, rich);

  const shouldClarify = !!(opts.enableIntentGate && intent.confidence < 0.5 && intent.suggestedClarification);
  return {
    intent,
    intentHint,
    structuralText,
    evidenceSummary,
    systemPrompt,
    shouldClarify,
    clarification: intent.suggestedClarification,
  };
}

export interface QualityCheckResult {
  ok: boolean;
  feedback: string;
  report: ReturnType<typeof qualityGate>;
}

/**
 * 최종 출력 품질 게이트 — Pillar 3
 * 두뇌가 결과물을 내보내기 직전 1회 호출, FAIL이면 self-correct 1회 유도
 */
export function checkOutputQuality(
  blocks: ContentBlock[],
  opts?: { expectedUnderlineCount?: number | null }
): QualityCheckResult {
  const report = qualityGate(blocks, { expectedUnderlineCount: opts?.expectedUnderlineCount ?? null });
  return {
    ok: report.ok,
    feedback: qualityFeedback(report),
    report,
  };
}

// Ghidra 스타일: 바이너리/텍스트 모두 증거로 — EvidenceLedger에 일괄 적재
export function ingestBinaryContext(ledger: EvidenceLedger, binaryPath: string, ghidraSummary: string): void {
  ledger.add({
    kind: "observation",
    source: `GhidraInspect(${binaryPath})`,
    content: ghidraSummary,
    truncated: ghidraSummary.length >= 5000,
    confidence: 0.9,
    meta: { kind: "binary", tool: "Ghidra" },
  });
}

// RAG + Evidence 통합 검색 힌트
export function buildRagHint(ragHits: Array<{ source: string; text: string }>): string {
  if (ragHits.length === 0) return "(no rag hits)";
  return ragHits.slice(0, 5).map(h => `- ${h.source}: ${h.text.slice(0,120).replace(/\n/g," ")}…`).join("\n");
}

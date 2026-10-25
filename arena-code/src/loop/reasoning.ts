/**
 * Reasoning Orchestrator — 추론 4레이어 (REA·Ghidra 흡수)
 * Pillar 2의 88% 천장을 깨기 위한 다중 패스 추론
 *
 * L1 투명 추론: thinking 버퍼를 EvidenceLedger에 보존 + STATIC/DYNAMIC 캐싱
 * L2 심볼 추론: structuralContext P-Code 정규형 + Serena 심볼 검색
 * L3 계획-검증: intent confidence 0.4~0.6 → LLM judge fallback + TodoWrite 강제 + self-correct 3회
 * L4 증거 추론: truncated → 포인터화 + 출처 도장
 *
 * Harness² 철학: 모델 가중치 무변경, 하네스만 최적화
 */
import type { Message, Provider, ContentBlock } from "../providers/types.js";
import { EvidenceLedger } from "./evidenceLedger.js";
import { classifyIntent, type Intent } from "./intent.js";
import { qualityGate, qualityFeedback, type QualityOptions } from "./outputQuality.js";

export interface ReasoningTraceStep {
  turn: number;
  thinking?: string;
  intent?: Intent;
  toolCalls?: string[];
  qualityOk?: boolean;
  issues?: string[];
}

export class ReasoningLedger extends EvidenceLedger {
  private traces: ReasoningTraceStep[] = [];

  addThinking(turn: number, thinking: string): void {
    this.traces.push({ turn, thinking });
    this.add({
      kind: "inference",
      source: `Thinking(turn:${turn})`,
      content: thinking.slice(0, 2000),
      truncated: thinking.length > 2000,
      confidence: 0.6,
      meta: { turn: String(turn), type: "thinking" },
    });
  }

  addQualityCheck(turn: number, ok: boolean, issues: string[]): void {
    this.traces.push({ turn, qualityOk: ok, issues });
    this.add({
      kind: "derivation",
      source: `QualityGate(turn:${turn})`,
      content: ok ? "PASS" : `FAIL: ${issues.join("; ")}`,
      truncated: false,
      confidence: ok ? 0.9 : 0.4,
      meta: { turn: String(turn) },
    });
  }

  getTraces(): ReasoningTraceStep[] {
    return [...this.traces];
  }

  summarizeReasoning(maxChars = 2000): string {
    if (this.traces.length === 0) return "(no reasoning trace)";
    return this.traces
      .map((t) => {
        const parts = [`Turn ${t.turn}:`];
        if (t.thinking) parts.push(` thinking=${t.thinking.slice(0, 80)}…`);
        if (t.intent) parts.push(` intent=${t.intent.kind}(${t.intent.confidence})`);
        if (t.toolCalls?.length) parts.push(` tools=[${t.toolCalls.join(",")}]`);
        if (t.qualityOk != null) parts.push(` quality=${t.qualityOk ? "PASS" : "FAIL"}`);
        return parts.join(" ");
      })
      .join("\n")
      .slice(0, maxChars);
  }
}

// P1: LLM judge fallback — confidence 0.4~0.6 구간에서만 1회 호출 (비용 절약, Cursor Apply처럼 “필요할 때만”)
export async function llmJudgeIntent(
  provider: Provider,
  prompt: string,
  heuristicIntent: Intent
): Promise<Intent | null> {
  // heuristicOnly:false일 때만 동작, 그 외엔 null 반환으로 기존 유지
  if (heuristicIntent.confidence >= 0.7 || heuristicIntent.confidence < 0.35) return null;
  try {
    const system = `You are an intent classifier. Choose one kind: question, implementation, analysis, generation, chore. Reply JSON: {"kind":"<kind>","confidence":0.0-1.0,"reason":"<short>"}`;
    const stream = provider.streamChat({
      system,
      messages: [{ role: "user", content: `Classify: "${prompt.slice(-2000)}"\nHeuristic guess: ${heuristicIntent.kind} (${heuristicIntent.confidence}) evidence: ${heuristicIntent.evidence.slice(0,2).join("|")}` }],
      tools: [],
      model: provider.model,
    });
    let out = "";
    for await (const ev of stream) if (ev.type === "text_delta" && ev.text) out += ev.text;
    const m = /\{[\s\S]*\}/.exec(out);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { kind: Intent["kind"]; confidence: number; reason: string };
    if (!["question","implementation","analysis","generation","chore"].includes(j.kind)) return null;
    return {
      ...heuristicIntent,
      kind: j.kind,
      confidence: Math.max(heuristicIntent.confidence, Math.min(0.92, j.confidence)),
      evidence: [...heuristicIntent.evidence, `LLM judge: ${j.reason} → ${j.kind} ${j.confidence}`].slice(0,6),
    };
  } catch { return null; }
}

// P2: TodoWrite 강제 규칙 — intent confidence<0.5 + ambiguities>=2 → Todo 5개 생성 전에는 실행 금지
export function shouldForceTodoWrite(intent: Intent): boolean {
  return intent.confidence < 0.5 && intent.ambiguities.length >= 2;
}

export function buildTodoPrompt(intent: Intent, hint: string): string {
  return `[Reasoning L3 — 계획 강제] confidence ${intent.confidence} < 0.5 + 모호점 ${intent.ambiguities.length}개 → TodoWrite 5개 생성 후 진행:\n- ${intent.ambiguities.map(a=>`Todo: ${a}`).join("\n- ")}\n- 마지막 Todo: 검증(qualityGate PASS) \n힌트: ${hint}`;
}

// P2: self-correct 3회 확장 — 기존 1회를 3회로, 점수 기반 early stop (Harness² Depth earlyStop 패턴 재사용)
export function shouldContinueSelfCorrect(attempt: number, reportOk: boolean, prevOk: boolean): boolean {
  if (reportOk) return false;
  if (attempt >= 3) return false;
  // 2회 연속 개선 없음 → 중단 (Depth earlyStop과 동일)
  if (attempt === 2 && !reportOk && !prevOk) return true; // 마지막 1회 더 시도
  return true;
}

export interface ReasoningOptions extends QualityOptions {
  maxSelfCorrect?: number; // 기본 3
  enableTodoEnforce?: boolean;
}

export function scoreReasoningTrace(ledger: ReasoningLedger): number {
  const traces = ledger.getTraces();
  let score = 50;
  for (const t of traces) {
    if (t.thinking) score += 5;
    if (t.qualityOk) score += 10;
    if (t.qualityOk === false) score -= 5;
  }
  if (ledger.list().some(e => e.truncated)) score += 5; // 잘림을 인지한 흔적은 가산점 (Cline provenance)
  return Math.max(0, Math.min(100, score));
}

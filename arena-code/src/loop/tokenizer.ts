/**
 * Tokenizer — context.ts의 estimateTokens(4-char≈1-token) 고도화
 * tiktoken이 설치되어 있으면 정확한 카운트, 없으면 fallback 유지
 * tiered budget 계산에도 사용 (ALWAYS_ON 6k 권고 검증)
 */

import type { Message } from "../providers/types.js";

// js-tiktoken 동적 로드 시도 — 없으면 fallback
let enc: { encode: (s: string) => number[] } | null = null;
let encReady: Promise<void> | null = null;

async function ensureEncoder(): Promise<void> {
  if (enc || encReady) return encReady ?? Promise.resolve();
  encReady = (async () => {
    try {
      // js-tiktoken 0.8+ — 이제 설치됨 (npm install js-tiktoken)
      const mod = await import("js-tiktoken") as unknown as { encodingForModel?: (m:string)=>{encode:(s:string)=>number[]}; getEncoding?: (e:string)=>{encode:(s:string)=>number[]}; Tiktoken?: new (b:unknown)=>{encode:(s:string)=>number[]}; cl100k_base?: unknown };
      // API 호환: getEncoding / encodingForModel 둘 다 시도
      if (mod.encodingForModel) enc = mod.encodingForModel("gpt-4o") ?? mod.getEncoding("cl100k_base");
      else if (mod.getEncoding) enc = mod.getEncoding("cl100k_base");
      else if (mod.Tiktoken) { const { Tiktoken } = mod; enc = new Tiktoken(mod.cl100k_base); }
    } catch {
      enc = null;
    }
  })();
  await encReady;
}

// 동기 fallback (기존 로직 보존, but 더 정확: CJK는 2~3 char/token)
export function estimateTokensFallback(messages: Message[]): number {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else for (const b of m.content) chars += (b.text?.length ?? 0) + (b.content?.length ?? 0) + JSON.stringify(b.input ?? "").length;
  }
  // CJK 보정: 한글/한자 비중이 높으면 토큰 밀도 높음
  // 간단 휴리스틱: ASCII 외 문자 수에 0.5 가산
  let nonAscii = 0;
  for (const m of messages) {
    const s = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    for (const ch of s) if (ch.charCodeAt(0) > 127) nonAscii++;
  }
  const adjustedChars = chars + nonAscii * 0.5;
  return Math.ceil(adjustedChars / 4);
}

export function estimateTokens(messages: Message[]): number {
  // 동기 경로에서는 fallback 사용 (루프에서 await 불가한 곳)
  // 비동기로 정확한 값이 필요하면 estimateTokensAccurate 사용
  if (enc) {
    try {
      let tokens = 0;
      for (const m of messages) {
        const s = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
        tokens += enc.encode(s).length;
      }
      // 메시지 오버헤드: role + 구조 마커 약 4토큰/메시지
      tokens += messages.length * 4;
      return tokens;
    } catch { /* fallback */ }
  }
  return estimateTokensFallback(messages);
}

export async function estimateTokensAccurate(messages: Message[]): Promise<number> {
  await ensureEncoder();
  return estimateTokens(messages);
}

export interface BudgetReport {
  tokens: number;
  budget: number;
  ratio: number;
  ok: boolean;
  message: string;
}

export function checkBudget(messages: Message[], budget = 6000): BudgetReport {
  const tokens = estimateTokens(messages);
  const ratio = budget ? tokens / budget : 0;
  const ok = ratio <= 0.8; // ALWAYS_ON_BUDGET_RATIO 0.8
  return {
    tokens, budget, ratio,
    ok,
    message: ok ? `OK ${tokens}/${budget} (${(ratio * 100).toFixed(1)}%)` : `OVER ${tokens}/${budget} (${(ratio * 100).toFixed(1)}%) — compact or drop structural context`,
  };
}

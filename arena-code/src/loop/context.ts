/**
 * Context Assembly — System Prompt 조립 + AGENT.md 로드 + Compaction
 * Claude Code의 context assembly + Codex/Muse의 AGENTS.md 계층 표준 통합
 */
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { Message } from "../providers/types.js";
import type { Provider } from "../providers/types.js";
import {
  loadAgentsMdHierarchy,
  formatAgentsMdForPrompt,
} from "../config/agentsMd.js";

const BASE_SYSTEM_PROMPT = `You are Arena Code, an agentic coding assistant fusing Claude Code + Codex + Muse.
You help users with coding tasks by using tools to read, write, edit, execute code, and analyze binaries with Ghidra.

## Core Principles
- Be concise but thorough. Explain your reasoning briefly before acting.
- Use tools proactively: Read before Edit, Grep/Glob to explore, TodoWrite to plan.
- Always verify your work: run tests, check types, read back edited files.
- Prefer editing existing files over creating new ones.
- Do not make assumptions — read files to confirm.
- When a task is complex, break it into steps with TodoWrite.
- Use Ghidra tools for binary analysis when relevant.

## Tool Usage (37 tools)
- Read: Read files before modifying them. Limit 2000 lines per call.
- Edit: Use exact old_string matching. For multiple occurrences, set replace_all=true.
- Write: Create new files. Prefer Edit for existing files.
- Bash: Run shell commands (git, npm, tests, etc.). Respects sandbox policy.
- Glob/Grep: Explore codebase efficiently.
- TodoWrite: Track multi-step tasks.
- Ghidra*: Binary analysis — Inspect, Decompile, Search, Xrefs, Compare etc. (29 tools)
- Skills: /plan, /grill, /goal, /loop, /ghidra

## Safety
- Respect sandbox policy (read-only / workspace-write / danger-full-access).
- Do not run destructive commands (rm -rf /, sudo rm, etc.).
- Ask before making large changes.
- Respect .gitignore and AGENTS.md project conventions.

## Output Style
- Use markdown for clarity.
- Show file paths and key decisions.
- Summarize what you changed at the end.
`;

async function loadAgentMd(cwd: string): Promise<string> {
  // Codex/Muse 표준: AGENTS.md 계층 로더 사용 (git 경계까지 walk up)
  try {
    const entries = loadAgentsMdHierarchy(cwd);
    return formatAgentsMdForPrompt(entries);
  } catch {
    return "";
  }
}

/**
 * Pillar 1 enhancement — Evidence Ledger integration
 * 기존 assembleSystemPrompt는 증거 출처/잘림을 보존하지 못했음 → EvidenceLedger 요약 주입으로 보완
 * 사용: queryLoop가 ledger.summarizeForPrompt()를 systemExtra에 추가
 */
export interface RichContextOptions {
  evidenceSummary?: string; // EvidenceLedger.summarizeForPrompt() 결과
  intentHint?: string; // IntentAnalyzer 결과 요약 (kind/confidence)
  structuralContext?: string; // StructuralContext 포맷 문자열 (Pillar 1.1)
  ragContext?: string; // RagIndex 검색 결과 요약
}

export interface TieredBudget {
  alwaysOn: number; // 6k 권고
  structural: number; // 2.5k
  rag: number; // 2k
}
export const DEFAULT_TIERED_BUDGET: TieredBudget = {
  alwaysOn: 6000,
  structural: 2500,
  rag: 2000,
};
export const TOTAL_BUDGET =
  DEFAULT_TIERED_BUDGET.alwaysOn +
  DEFAULT_TIERED_BUDGET.structural +
  DEFAULT_TIERED_BUDGET.rag; // 10500

function truncateTextToTokens(text: string, maxTokens: number): string {
  if (!text) return text;
  const est = estimateTokens([{ role: "user", content: text } as any]);
  if (est <= maxTokens) return text;
  // 근사: 토큰당 ~4자, CJK 보정 1.5배 — 보수적으로 자르기
  const approxChars = maxTokens * 4;
  // CJK 비중 반영: nonAscii가 많으면 더 짧게
  let nonAscii = 0;
  for (const ch of text) if (ch.charCodeAt(0) > 127) nonAscii++;
  const ratio = nonAscii / Math.max(text.length, 1);
  const adjusted = Math.floor(approxChars * (1 - ratio * 0.3));
  const truncated = text.slice(0, adjusted);
  return (
    truncated +
    `\n[... truncated for budget: ${est}→${maxTokens} tokens, ${text.length - truncated.length} chars omitted]`
  );
}

async function getGitStatus(cwd: string): Promise<string> {
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync(
      "git status --short --branch 2>&1 | head -n 50",
      { cwd, timeout: 5000 },
    );
    return stdout.trim() || "(clean or not a git repo)";
  } catch {
    return "(git not available)";
  }
}

export async function assembleSystemPrompt(
  cwd: string,
  extra?: string,
  rich?: RichContextOptions,
  budget: TieredBudget = DEFAULT_TIERED_BUDGET,
): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT;

  // AGENT.md hierarchy — ALWAYS_ON 예산 내
  const agentMd = await loadAgentMd(cwd);
  if (agentMd) {
    const capped = truncateTextToTokens(agentMd, budget.alwaysOn - 1500); // BASE + env 제외 여유
    prompt += `\n${capped}`;
  }

  // Environment info (DYNAMIC zone)
  const gitStatus = await getGitStatus(cwd);
  prompt += `\n\n## Environment\n- Working directory: ${cwd}\n- Git status:\n${gitStatus}\n- Date: ${new Date().toISOString().slice(0, 10)}\n- Platform: ${process.platform} ${process.arch} | Node ${process.version}`;

  // Pillar 1: Evidence Ledger summary (well-grounded context) — ALWAYS_ON 일부
  if (rich?.evidenceSummary) {
    prompt += `\n\n## Evidence Ledger (provenance-preserved, do not hallucinate beyond this)\n${rich.evidenceSummary}\n- Rule: Distinguish observations (direct tool output) vs derivations vs inferences. If truncated flag is present, acknowledge uncertainty and do not invent missing parts.`;
  }
  if (rich?.intentHint) {
    prompt += `\n\n## Intent Hint (from Intent Analyzer)\n${rich.intentHint}\n- If confidence < 0.5, prefer asking one clarifying question over guessing.`;
  }
  // Scaffolding Phase 4: Structural + RAG tiered context — 각 예산 강제
  if (rich?.structuralContext) {
    const capped = truncateTextToTokens(
      rich.structuralContext,
      budget.structural,
    );
    prompt += `\n\n${capped}`;
  }
  if (rich?.ragContext) {
    const capped = truncateTextToTokens(rich.ragContext, budget.rag);
    prompt += `\n\n## Retrieved Context (RAG — verify provenance before citing)\n${capped}\n- Rule: Cite source path + date when using retrieved text; do not present unverified retrieval as fact.`;
  }

  if (extra) {
    const capped = truncateTextToTokens(extra, 2000);
    prompt += `\n\n## Additional Instructions\n${capped}`;
  }

  // --- TieredBudget 강제: 총합 10500 초과 시 하위 티어부터 추가 절단 (fail-closed) ---
  const totalBudget = budget.alwaysOn + budget.structural + budget.rag;
  let est = estimateTokens([{ role: "system", content: prompt } as any]);
  if (est > totalBudget) {
    // 초과분을 rag → structural → evidence 순으로 추가 절단
    const excess = est - totalBudget;
    // 간단: 프롬프트 뒤에서부터 excess*4 문자 제거 (rag/extra 부분 먼저)
    const cutChars = excess * 4 + 500;
    prompt =
      prompt.slice(0, Math.max(prompt.length - cutChars, 4000)) +
      `\n[... budget-enforced truncation: ${est}→${totalBudget} tokens, excess ${excess} trimmed]`;
    // 재검증 로그
    if (process.env.DEBUG)
      console.warn(
        `[TieredBudget] ${est}→${totalBudget} exceeded, trimmed ${cutChars} chars`,
      );
  }

  return prompt;
}

// --- Token estimation — re-export from tokenizer.ts (scaffolding Phase 4)
// Fallback inline 유지 (순환 참조 방지): tokenizer가 js-tiktoken 없으면 이 로직과 동일
export function estimateTokens(messages: Message[]): number {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else
      for (const b of m.content)
        chars +=
          (b.text?.length ?? 0) +
          (b.content?.length ?? 0) +
          JSON.stringify(b.input ?? "").length;
  }
  // CJK 보정: 한글 비중
  let nonAscii = 0;
  for (const m of messages) {
    const s =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    for (const ch of s) if (ch.charCodeAt(0) > 127) nonAscii++;
  }
  return Math.ceil((chars + nonAscii * 0.5) / 4);
}
export { estimateTokensAccurate, checkBudget } from "./tokenizer.js";

// --- Compaction ---

export async function compactMessages(
  messages: Message[],
  provider: Provider,
  system: string,
): Promise<Message[]> {
  // Budget reduction: 오래된 tool_result 요약
  if (messages.length <= 6) {
    // 메시지가 적으면 AutoCompact (모델에게 요약 요청)
    return autoCompact(messages, provider, system);
  }

  // Keep first 2 and last 4, summarize middle
  const keepHead = 2;
  const keepTail = 4;
  const head = messages.slice(0, keepHead);
  const middle = messages.slice(keepHead, -keepTail);
  const tail = messages.slice(-keepTail);

  // Middle을 간단히 요약하되, 파일경로/결정/미결은 보존 (Pillar 1)
  const keepPatterns = [
    /[a-zA-Z0-9_-]+\.[a-z]+:\d+/,
    /decision|pending|TODO|EvidenceLedger/i,
  ];
  const middleText = middle
    .map((m) => {
      const raw =
        typeof m.content === "string"
          ? m.content
          : m.content
              .map((b) => b.text ?? b.content ?? JSON.stringify(b.input ?? ""))
              .join(" ");
      const keepLines = raw
        .split("\n")
        .filter((l) => keepPatterns.some((re) => re.test(l)));
      const base = raw.slice(0, 500);
      return `${m.role}: ${base}${keepLines.length ? `\n[keep] ${keepLines.slice(0, 3).join(" | ")}` : ""}`;
    })
    .join("\n");

  const summaryMsg: Message = {
    role: "user",
    content: `[Context compacted: ${middle.length} messages summarized — filePaths/decisions/pendingTasks preserved]\n${middleText.slice(0, 3000)}`,
  };

  return [...head, summaryMsg, ...tail];
}

async function autoCompact(
  messages: Message[],
  provider: Provider,
  _system: string,
): Promise<Message[]> {
  try {
    const summaryReq = {
      system:
        "You are a conversation summarizer. Summarize the conversation concisely, preserving file paths, decisions, and pending tasks. Keep it under 1000 tokens.",
      messages: [
        ...messages,
        {
          role: "user" as const,
          content: "Summarize this conversation for context compaction.",
        },
      ],
      tools: [],
      model: provider.model,
      maxTokens: 1024,
    };
    let summary = "";
    for await (const evt of provider.streamChat(summaryReq)) {
      if (evt.type === "text_delta" && evt.text) summary += evt.text;
      if (evt.type === "error") throw new Error(evt.error);
    }
    return [
      {
        role: "user",
        content: `[Previous conversation summary (auto-compacted from ${messages.length} messages)]:\n${summary}`,
      },
    ];
  } catch {
    // Fallback: 단순 절단
    const text = messages
      .map((m) =>
        (typeof m.content === "string"
          ? m.content
          : JSON.stringify(m.content)
        ).slice(0, 500),
      )
      .join("\n")
      .slice(0, 3000);
    return [
      {
        role: "user",
        content: `[Compacted ${messages.length} messages]: ${text}`,
      },
    ];
  }
}

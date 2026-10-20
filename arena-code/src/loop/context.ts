/**
 * Context Assembly — System Prompt 조립 + AGENT.md 로드 + Compaction
 * Claude Code의 context assembly + Codex/Muse의 AGENTS.md 계층 표준 통합
 */
import { readFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { Message } from "../providers/types.js";
import type { Provider } from "../providers/types.js";
import { loadAgentsMdHierarchy, formatAgentsMdForPrompt } from "../config/agentsMd.js";

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

async function getGitStatus(cwd: string): Promise<string> {
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("git status --short --branch 2>&1 | head -n 50", { cwd, timeout: 5000 });
    return stdout.trim() || "(clean or not a git repo)";
  } catch {
    return "(git not available)";
  }
}

export async function assembleSystemPrompt(cwd: string, extra?: string): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT;

  // AGENT.md hierarchy
  const agentMd = await loadAgentMd(cwd);
  if (agentMd) prompt += `\n${agentMd}`;

  // Environment info (DYNAMIC zone)
  const gitStatus = await getGitStatus(cwd);
  prompt += `\n\n## Environment\n- Working directory: ${cwd}\n- Git status:\n${gitStatus}\n- Date: ${new Date().toISOString().slice(0, 10)}\n- Platform: ${process.platform} ${process.arch} | Node ${process.version}`;

  if (extra) prompt += `\n\n## Additional Instructions\n${extra}`;

  return prompt;
}

// --- Compaction ---

export function estimateTokens(messages: Message[]): number {
  // Rough: 1 token ≈ 4 chars (Claude Code도 근사치 사용)
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else for (const b of m.content) chars += (b.text?.length ?? 0) + (b.content?.length ?? 0) + JSON.stringify(b.input ?? "").length;
  }
  return Math.ceil(chars / 4);
}

export async function compactMessages(
  messages: Message[],
  provider: Provider,
  system: string
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

  // Middle을 간단히 요약 (문자 잘라내기)
  const middleText = middle
    .map((m) => {
      if (typeof m.content === "string") return `${m.role}: ${m.content.slice(0, 500)}`;
      return `${m.role}: ${m.content.map((b) => b.text ?? b.content ?? JSON.stringify(b.input ?? "")).join(" ").slice(0, 500)}`;
    })
    .join("\n");

  const summaryMsg: Message = {
    role: "user",
    content: `[Context compacted: ${middle.length} messages summarized]\n${middleText.slice(0, 3000)}`,
  };

  return [...head, summaryMsg, ...tail];
}

async function autoCompact(messages: Message[], provider: Provider, _system: string): Promise<Message[]> {
  try {
    const summaryReq = {
      system: "You are a conversation summarizer. Summarize the conversation concisely, preserving file paths, decisions, and pending tasks. Keep it under 1000 tokens.",
      messages: [...messages, { role: "user" as const, content: "Summarize this conversation for context compaction." }],
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
      { role: "user", content: `[Previous conversation summary (auto-compacted from ${messages.length} messages)]:\n${summary}` },
    ];
  } catch {
    // Fallback: 단순 절단
    const text = messages
      .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)).slice(0, 500))
      .join("\n")
      .slice(0, 3000);
    return [{ role: "user", content: `[Compacted ${messages.length} messages]: ${text}` }];
  }
}

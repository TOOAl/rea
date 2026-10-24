/**
 * Agent Loop — Claude Code queryLoop() 재구현
 * AsyncGenerator 패턴 + 9단계 파이프라인 단순화
 */
import type { Provider, Message, ContentBlock, ToolDefinition } from "../providers/types.js";
import type { Tool, ToolContext } from "../tools/types.js";
import { assembleSystemPrompt, estimateTokens, compactMessages } from "./context.js";
import { checkPermission, loadPermissionConfig, type PermissionConfig } from "./permissions.js";
import type { HookManager } from "../hooks/index.js";
import { classifyIntent, isIntentClear } from "./intent.js";
import { EvidenceLedger } from "./evidenceLedger.js";
import { qualityGate, qualityFeedback } from "./outputQuality.js";

// --- Events ---

export type LoopEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: string }
  | { type: "tool_denied"; tool: string; reason: string }
  | { type: "thinking"; text: string }
  | { type: "compacting"; message: string }
  | { type: "turn_start"; turn: number }
  | { type: "turn_end"; turn: number }
  | { type: "result"; content: ContentBlock[]; turns: number }
  | { type: "error"; message: string }
  | { type: "aborted"; reason: string };

// --- Params ---

export interface LoopParams {
  provider: Provider;
  tools: Tool[];
  cwd: string;
  messages: Message[];
  systemExtra?: string;
  maxTurns?: number;
  maxContextTokens?: number;
  permissions?: PermissionConfig;
  signal?: AbortSignal;
  onAskPermission?: (block: ContentBlock) => Promise<boolean>;
  hooks?: HookManager;
  /** Pillar 2/3 opt-in: 기본 false로 기존 동작 유지 (additive, 브랜치 안전) */
  intentGate?: boolean;
  qualityGate?: boolean;
  qualityOpts?: { expectedUnderlineCount?: number | null; schemaHint?: string | null };
}

// --- Main Loop ---

export async function* queryLoop(params: LoopParams): AsyncGenerator<LoopEvent> {
  const maxTurns = params.maxTurns ?? 20;
  const maxContextTokens = params.maxContextTokens ?? 100000;
  const permissions = params.permissions ?? await loadPermissionConfig(params.cwd);

  const state: { messages: Message[]; turnCount: number } = {
    messages: [...params.messages],
    turnCount: 0,
  };

  // Pillar 1/2: ledger + intent (opt-in, 기존 루프 영향 없음 — 기본 false라 기존 동작 보존)
  const ledger = new EvidenceLedger();
  for (const m of params.messages) {
    const txt = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (txt.length > 500) ledger.fromUserAttach("initial", txt.slice(0, 800), txt.length > 1000);
  }
  const intent = params.intentGate ? classifyIntent(params.messages) : null;
  const intentHint = intent
    ? `${intent.kind} (conf=${intent.confidence}) ambiguities=[${intent.ambiguities.join("; ") || "none"}] evidence=${intent.evidence.slice(0, 2).join(" | ")}`
    : undefined;
  const evidenceSummary = intent ? ledger.summarizeForPrompt() : undefined;
  const system = await assembleSystemPrompt(
    params.cwd,
    params.systemExtra,
    intentHint || evidenceSummary ? { evidenceSummary, intentHint } : undefined
  );

  // Tools → ToolDefinition for model
  const toolDefs: ToolDefinition[] = params.tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));

  const toolMap = new Map(params.tools.map((t) => [t.name, t]));

  while (true) {
    if (params.signal?.aborted) {
      yield { type: "aborted", reason: "User cancelled" };
      break;
    }

    if (state.turnCount >= maxTurns) {
      yield { type: "error", message: `Max turns (${maxTurns}) reached. Task may be incomplete.` };
      break;
    }

    // --- Context management: compaction check ---
    const tokens = estimateTokens(state.messages);
    if (tokens > maxContextTokens * 0.8) {
      if (params.hooks) await params.hooks.emit("preCompact", { cwd: params.cwd, turn: state.turnCount });
      yield { type: "compacting", message: `Context ${tokens} tokens > 80% of ${maxContextTokens}, compacting...` };
      state.messages = await compactMessages(state.messages, params.provider, system);
    }

    yield { type: "turn_start", turn: state.turnCount + 1 };

    // --- Model call (streaming) ---
    const toolCalls: ContentBlock[] = [];
    let textBuffer = "";

    try {
      const stream = params.provider.streamChat({
        system,
        messages: state.messages,
        tools: toolDefs,
        model: params.provider.model,
      });

      for await (const event of stream) {
        if (params.signal?.aborted) break;

        if (event.type === "text_delta" && event.text) {
          textBuffer += event.text;
          yield { type: "text", text: event.text };
        } else if (event.type === "tool_use" && event.block) {
          toolCalls.push(event.block);
        } else if (event.type === "error" && event.error) {
          yield { type: "error", message: event.error };
          // 에러 시 중단하지 않고, 사용자에게 에러를 tool_result처럼 전달하여 모델이 복구 시도하도록 할 수도 있음
          // 여기서는 중단
          return;
        }
      }
    } catch (e: unknown) {
      yield { type: "error", message: `Model call failed: ${e instanceof Error ? e.message : String(e)}` };
      break;
    }

    // Build assistant message
    const assistantBlocks: ContentBlock[] = [];
    if (textBuffer) assistantBlocks.push({ type: "text", text: textBuffer });
    for (const tc of toolCalls) assistantBlocks.push(tc);

    if (assistantBlocks.length === 0) {
      yield { type: "error", message: "Empty response from model (no text or tool calls)" };
      break;
    }

    state.messages.push({ role: "assistant", content: assistantBlocks });

    // --- Stop condition: no tool calls → done (Pillar 3: quality gate) ---
    if (toolCalls.length === 0) {
      if (params.qualityGate) {
        const report = qualityGate(assistantBlocks, params.qualityOpts ?? {});
        if (!report.ok) {
          // 자기 교정: 모델에 피드백 전달 후 1회 재시도
          const feedback = qualityFeedback(report);
          state.messages.push({
            role: "user",
            content: feedback,
          });
          // 이번 턴은 종료하지 않고 다음 루프에서 모델이 수정하도록 계속
          yield { type: "text", text: `\n[QualityGate] ${report.issues.join("; ")}\n` };
          // 최대 1회 재시도이므로, 이미 재시도했는지 확인 (간단히 turnCount로)
          // 실제 재시도는 다음 루프에서 자연스럽게 일어남 — 여기서는 break 하지 않음
          // fallthrough to continue loop
          yield { type: "turn_end", turn: state.turnCount + 1 };
          if (params.hooks) await params.hooks.emit("postTurn", { cwd: params.cwd, turn: state.turnCount + 1 });
          state.turnCount++;
          continue;
        }
      }
      yield { type: "result", content: assistantBlocks, turns: state.turnCount + 1 };
      break;
    }

    // --- Permission gate + Tool execution ---
    const toolCtx: ToolContext = { cwd: params.cwd };

    for (const block of toolCalls) {
      if (block.type !== "tool_use") continue;

      // Hooks: preToolUse — input 수정/차단
      if (params.hooks) {
        const hook = await params.hooks.runPreToolUse({ cwd: params.cwd, event: "preToolUse", toolName: block.name, input: (block.input ?? {}) as Record<string, unknown> });
        if (hook?.block) {
          const reason = hook.reason ?? `Hook blocked ${block.name}`;
          yield { type: "tool_denied", tool: block.name!, reason };
          state.messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: block.id!, content: `⛔ Blocked by hook: ${reason}` }] });
          continue;
        }
        if (hook?.modifiedInput) block.input = { ...(block.input ?? {}), ...hook.modifiedInput };
      }

      yield { type: "tool_start", tool: block.name!, input: (block.input ?? {}) as Record<string, unknown> };

      // Permission check
      const decision = checkPermission(block, permissions);
      if (decision === "deny") {
        const reason = `Permission denied for ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 200)})`;
        yield { type: "tool_denied", tool: block.name!, reason };
        state.messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: block.id!, content: `⛔ Permission denied: ${reason}` }],
        });
        continue;
      }

      if (decision === "ask" && params.onAskPermission) {
        const approved = await params.onAskPermission(block);
        if (!approved) {
          yield { type: "tool_denied", tool: block.name!, reason: "User denied" };
          state.messages.push({
            role: "user",
            content: [{ type: "tool_result", tool_use_id: block.id!, content: "User denied this tool call." }],
          });
          continue;
        }
      }

      // Execute
      const tool = toolMap.get(block.name!);
      if (!tool) {
        const msg = `Unknown tool: ${block.name}`;
        yield { type: "tool_result", tool: block.name!, result: msg };
        state.messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: block.id!, content: msg }],
        });
        continue;
      }

      try {
        let result = await tool.execute((block.input ?? {}) as Record<string, unknown>, toolCtx);
        // Hooks: postToolUse — result 수정
        if (params.hooks) {
          const post = await params.hooks.runPostToolUse({ cwd: params.cwd, event: "postToolUse", toolName: block.name, input: (block.input ?? {}) as Record<string, unknown>, result });
          if (post?.modifiedResult != null) result = post.modifiedResult;
        }
        // Pillar 1: ledger에 증거 보존 (truncated 플래그 + provenance)
        ledger.fromToolResult(block.name!, (block.input ?? {}) as Record<string, unknown>, result, { maxLen: 5000 });
        yield { type: "tool_result", tool: block.name!, result: result.slice(0, 5000) + (result.length > 5000 ? "\n... (truncated)" : "") };
        state.messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: block.id!, content: result }],
        });
      } catch (e: unknown) {
        const errMsg = `Tool execution error: ${e instanceof Error ? e.message : String(e)}`;
        yield { type: "tool_result", tool: block.name!, result: errMsg };
        state.messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: block.id!, content: errMsg }],
        });
      }
    }

    yield { type: "turn_end", turn: state.turnCount + 1 };
    if (params.hooks) await params.hooks.emit("postTurn", { cwd: params.cwd, turn: state.turnCount + 1 });
    state.turnCount++;

    // Small delay to avoid tight loop / rate limit
    await new Promise((r) => setTimeout(r, 100));
  }
}

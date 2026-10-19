/**
 * Agent Loop — Claude Code queryLoop() 재구현
 * AsyncGenerator 패턴 + 9단계 파이프라인 단순화
 */
import type { Provider, Message, ContentBlock, ToolDefinition } from "../providers/types.js";
import type { Tool, ToolContext } from "../tools/types.js";
import { assembleSystemPrompt, estimateTokens, compactMessages } from "./context.js";
import { checkPermission, loadPermissionConfig, type PermissionConfig } from "./permissions.js";

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
}

// --- Main Loop ---

export async function* queryLoop(params: LoopParams): AsyncGenerator<LoopEvent> {
  const maxTurns = params.maxTurns ?? 20;
  const maxContextTokens = params.maxContextTokens ?? 100000;
  const permissions = params.permissions ?? await loadPermissionConfig(params.cwd);
  const system = await assembleSystemPrompt(params.cwd, params.systemExtra);

  const state: { messages: Message[]; turnCount: number } = {
    messages: [...params.messages],
    turnCount: 0,
  };

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

    // --- Stop condition: no tool calls → done ---
    if (toolCalls.length === 0) {
      yield { type: "result", content: assistantBlocks, turns: state.turnCount + 1 };
      break;
    }

    // --- Permission gate + Tool execution ---
    const toolCtx: ToolContext = { cwd: params.cwd };

    for (const block of toolCalls) {
      if (block.type !== "tool_use") continue;

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
        const result = await tool.execute((block.input ?? {}) as Record<string, unknown>, toolCtx);
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
    state.turnCount++;

    // Small delay to avoid tight loop / rate limit
    await new Promise((r) => setTimeout(r, 100));
  }
}

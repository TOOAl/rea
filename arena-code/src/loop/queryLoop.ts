/**
 * Agent Loop — Claude Code queryLoop() 재구현
 * AsyncGenerator 패턴 + 9단계 파이프라인 단순화
 */
import type {
  Provider,
  Message,
  ContentBlock,
  ToolDefinition,
} from "../providers/types.js";
import type { Tool, ToolContext } from "../tools/types.js";
import {
  assembleSystemPrompt,
  estimateTokens,
  compactMessages,
} from "./context.js";
import {
  checkPermission,
  loadPermissionConfig,
  type PermissionConfig,
} from "./permissions.js";
import type { HookManager } from "../hooks/index.js";
import {
  classifyIntent,
  isIntentClear,
  formatIntentHintForPrompt,
} from "./intent.js";
import { EvidenceLedger } from "./evidenceLedger.js";
import { qualityGate, qualityFeedback } from "./outputQuality.js";
import {
  persistLedgerToTree,
  buildEvidencePointer,
} from "./evidenceTreeBridge.js";
import {
  deriveDomain,
  retrieveLessons,
  formatLessonsForPrompt,
  recordLesson,
} from "./learningBridge.js";

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
  /** Pillar 2/3: 기본 true로 기본 체력 상시 동작 — 명시적 false로만 비활성 (env REA_INTENT_GATE=0 으로도 off) */
  intentGate?: boolean;
  qualityGate?: boolean;
  qualityOpts?: {
    expectedUnderlineCount?: number | null;
    schemaHint?: string | null;
  };
}

// --- Main Loop ---

export async function* queryLoop(
  params: LoopParams,
): AsyncGenerator<LoopEvent> {
  const maxTurns = params.maxTurns ?? 20;
  const maxContextTokens = params.maxContextTokens ?? 100000;
  const permissions =
    params.permissions ?? (await loadPermissionConfig(params.cwd));

  const state: { messages: Message[]; turnCount: number } = {
    messages: [...params.messages],
    turnCount: 0,
  };

  // Pillar 1/2: ledger + intent (opt-in, 기존 루프 영향 없음 — 기본 false라 기존 동작 보존)
  const ledger = new EvidenceLedger();
  for (const m of params.messages) {
    const txt =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (txt.length > 500)
      ledger.fromUserAttach("initial", txt.slice(0, 800), txt.length > 1000);
  }
  // 기본 활성화: env나 파라미터로 명시적 false가 아니면 동작 (기존 opt-in에서 default-on으로 승격)
  const intentGateOn =
    params.intentGate !== false && process.env.REA_INTENT_GATE !== "0";
  const qualityGateOn =
    params.qualityGate !== false && process.env.REA_QUALITY_GATE !== "0";
  const intent = intentGateOn ? classifyIntent(params.messages) : null;
  const intentHint = intent
    ? formatIntentHintForPrompt(
        intent,
        params.messages
          .map((m) =>
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
          )
          .join("\n")
          .slice(-2000),
      )
    : undefined;
  let evidenceSummary =
    ledger.list().length > 0 ? ledger.summarizeForPrompt() : undefined;
  // Phase 2: EvidenceTree 영속화 — 잘림이 있거나 REA_EVIDENCE_TREE=1 이면 디스크 트리 구축, 포인터 주입
  let evidenceTree: ReturnType<typeof persistLedgerToTree> = null;
  if (process.env.REA_EVIDENCE_TREE === "1" && ledger.list().length > 0) {
    const hasTruncated = ledger.list().some((e) => e.truncated);
    if (hasTruncated || ledger.list().length > 3) {
      evidenceTree = persistLedgerToTree(ledger, `task-${Date.now()}`, {
        cwd: params.cwd,
        taskPrompt:
          typeof params.messages[0]?.content === "string"
            ? (params.messages[0].content as string)
            : undefined,
      });
      const pointer = evidenceTree ? buildEvidencePointer(evidenceTree) : null;
      if (pointer)
        evidenceSummary = `${evidenceSummary}\n\n[EvidenceTree persisted] ${pointer}`;
    }
  }
  // Phase 3: Library/Memory Lessons 자동 주입 — 같은 도메인 반복 시 점점 똑똑해짐
  const learningOn = process.env.REA_LEARNING !== "0";
  const promptTextForDomain = params.messages
    .map((m) =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    )
    .join("\n");
  const domain = learningOn
    ? deriveDomain(intent, promptTextForDomain)
    : "general";
  let lessonsPrompt: string | null = null;
  if (learningOn) {
    try {
      const lessons = retrieveLessons({
        query: promptTextForDomain.slice(-1000) || promptTextForDomain,
        domain,
        topK: 3,
      });
      lessonsPrompt = formatLessonsForPrompt(lessons);
    } catch {}
  }
  // Scaffolding Phase 4: Structural + RAG (opt-in via env, 기본 OFF로 기존 테스트 보존)
  let structuralContext: string | undefined;
  if (process.env.REA_STRUCTURAL === "1") {
    try {
      const { buildStructuralContext, formatStructuralContext } =
        await import("./structuralContext.js");
      const sc = await buildStructuralContext(params.cwd, {
        budgetChars: 2000,
      });
      structuralContext = formatStructuralContext(sc);
    } catch {}
  }
  let ragContext: string | undefined;
  if (process.env.REA_RAG === "1") {
    try {
      const { RagIndex } = await import("../rag/index.js");
      // 최소 스캐폴딩: persist된 인덱스가 있으면 검색, 없으면 빈 상태로 패스 (fail-open)
      const idx = new RagIndex({
        domain,
        persistDir: `${params.cwd}/.arena/rag-index`,
      });
      if (idx.load()) {
        const hits = idx.search(
          promptTextForDomain.slice(-1000) || promptTextForDomain,
          3,
        );
        if (hits.length)
          ragContext = hits
            .map(
              (h) =>
                `[${h.chunk.source}] ${h.chunk.text.slice(0, 400)} (score=${h.score.toFixed(3)})`,
            )
            .join("\n\n");
      }
    } catch {}
  }
  const system = await assembleSystemPrompt(
    params.cwd,
    params.systemExtra,
    intentHint ||
      evidenceSummary ||
      lessonsPrompt ||
      structuralContext ||
      ragContext
      ? {
          evidenceSummary: lessonsPrompt
            ? `${evidenceSummary ?? ""}\n\n${lessonsPrompt}`
            : evidenceSummary,
          intentHint,
          structuralContext,
          ragContext,
        }
      : undefined,
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
      yield {
        type: "error",
        message: `Max turns (${maxTurns}) reached. Task may be incomplete.`,
      };
      break;
    }

    // --- Context management: compaction check ---
    const tokens = estimateTokens(state.messages);
    if (tokens > maxContextTokens * 0.8) {
      if (params.hooks)
        await params.hooks.emit("preCompact", {
          cwd: params.cwd,
          turn: state.turnCount,
        });
      yield {
        type: "compacting",
        message: `Context ${tokens} tokens > 80% of ${maxContextTokens}, compacting...`,
      };
      state.messages = await compactMessages(
        state.messages,
        params.provider,
        system,
      );
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
      yield {
        type: "error",
        message: `Model call failed: ${e instanceof Error ? e.message : String(e)}`,
      };
      break;
    }

    // Build assistant message
    const assistantBlocks: ContentBlock[] = [];
    if (textBuffer) assistantBlocks.push({ type: "text", text: textBuffer });
    for (const tc of toolCalls) assistantBlocks.push(tc);

    if (assistantBlocks.length === 0) {
      yield {
        type: "error",
        message: "Empty response from model (no text or tool calls)",
      };
      break;
    }

    state.messages.push({ role: "assistant", content: assistantBlocks });

    // --- Stop condition: no tool calls → done (Pillar 3: quality gate — 기본 활성) ---
    if (toolCalls.length === 0) {
      let finalQualityReport: ReturnType<typeof qualityGate> | null = null;
      if (qualityGateOn) {
        const report = qualityGate(assistantBlocks, params.qualityOpts ?? {});
        finalQualityReport = report;
        if (!report.ok) {
          const feedback = qualityFeedback(report);
          state.messages.push({ role: "user", content: feedback });
          yield {
            type: "text",
            text: `\n[QualityGate] ${report.issues.join("; ")}\n`,
          };
          yield { type: "turn_end", turn: state.turnCount + 1 };
          if (params.hooks)
            await params.hooks.emit("postTurn", {
              cwd: params.cwd,
              turn: state.turnCount + 1,
            });
          state.turnCount++;
          // 1회 자기교정 후에도 실패하면 그대로 반환하되, issues를 결과에 첨부해 투명성 확보
          if (state.turnCount > 1) {
            // 이미 한 번 재시도했으면 더 이상 루프하지 않고 결과 반환 (fail-open, 무한루프 방지)
            // 하지만 qualityReport를 함께 반환해 호출자가 알 수 있게 함
          } else {
            continue;
          }
        }
      }
      // Phase 3: 결과 직전 Lesson 기록 — 다음 동일 도메인 작업에 자동 주입 (학습 축적)
      if (learningOn) {
        try {
          const taskIdForLearning = `task-${Date.now()}-${domain}`;
          recordLesson({
            taskId: taskIdForLearning,
            domain,
            intent,
            qualityReport: finalQualityReport,
            ledger,
          });
        } catch {}
      }
      yield {
        type: "result",
        content: assistantBlocks,
        turns: state.turnCount + 1,
      };
      break;
    }

    // --- Permission gate + Tool execution ---
    const toolCtx: ToolContext = { cwd: params.cwd };

    for (const block of toolCalls) {
      if (block.type !== "tool_use") continue;

      // Hooks: preToolUse — input 수정/차단
      if (params.hooks) {
        const hook = await params.hooks.runPreToolUse({
          cwd: params.cwd,
          event: "preToolUse",
          toolName: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
        if (hook?.block) {
          const reason = hook.reason ?? `Hook blocked ${block.name}`;
          yield { type: "tool_denied", tool: block.name!, reason };
          state.messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id!,
                content: `⛔ Blocked by hook: ${reason}`,
              },
            ],
          });
          continue;
        }
        if (hook?.modifiedInput)
          block.input = { ...block.input, ...hook.modifiedInput };
      }

      yield {
        type: "tool_start",
        tool: block.name!,
        input: (block.input ?? {}) as Record<string, unknown>,
      };

      // Permission check
      const decision = checkPermission(block, permissions);
      if (decision === "deny") {
        const reason = `Permission denied for ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 200)})`;
        yield { type: "tool_denied", tool: block.name!, reason };
        state.messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id!,
              content: `⛔ Permission denied: ${reason}`,
            },
          ],
        });
        continue;
      }

      if (decision === "ask" && params.onAskPermission) {
        const approved = await params.onAskPermission(block);
        if (!approved) {
          yield {
            type: "tool_denied",
            tool: block.name!,
            reason: "User denied",
          };
          state.messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id!,
                content: "User denied this tool call.",
              },
            ],
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
          content: [
            { type: "tool_result", tool_use_id: block.id!, content: msg },
          ],
        });
        continue;
      }

      try {
        let result = await tool.execute(
          (block.input ?? {}) as Record<string, unknown>,
          toolCtx,
        );
        // Hooks: postToolUse — result 수정
        if (params.hooks) {
          const post = await params.hooks.runPostToolUse({
            cwd: params.cwd,
            event: "postToolUse",
            toolName: block.name,
            input: (block.input ?? {}) as Record<string, unknown>,
            result,
          });
          if (post?.modifiedResult != null) result = post.modifiedResult;
        }
        // Pillar 1: ledger에 증거 보존 (truncated 플래그 + provenance)
        ledger.fromToolResult(
          block.name!,
          (block.input ?? {}) as Record<string, unknown>,
          result,
          { maxLen: 5000 },
        );
        yield {
          type: "tool_result",
          tool: block.name!,
          result:
            result.slice(0, 5000) +
            (result.length > 5000 ? "\n... (truncated)" : ""),
        };
        state.messages.push({
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: block.id!, content: result },
          ],
        });
      } catch (e: unknown) {
        const errMsg = `Tool execution error: ${e instanceof Error ? e.message : String(e)}`;
        yield { type: "tool_result", tool: block.name!, result: errMsg };
        state.messages.push({
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: block.id!, content: errMsg },
          ],
        });
      }
    }

    yield { type: "turn_end", turn: state.turnCount + 1 };
    if (params.hooks)
      await params.hooks.emit("postTurn", {
        cwd: params.cwd,
        turn: state.turnCount + 1,
      });
    state.turnCount++;

    // Small delay to avoid tight loop / rate limit
    await new Promise((r) => setTimeout(r, 100));
  }
}

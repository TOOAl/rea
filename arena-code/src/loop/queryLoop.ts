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
  classifyIntentSync,
  classifyIntentWithJudge,
  formatIntentHintForPrompt,
} from "./intent.js";
import { EvidenceLedger } from "./evidenceLedger.js";
import {
  qualityGate,
  qualityFeedback,
  type QualityReport,
} from "./outputQuality.js";
import {
  ReasoningLedger,
  shouldForceTodoWrite,
  buildTodoPrompt,
  scoreReasoningTrace,
} from "./reasoning.js";
import {
  COVID_CUTOFF,
  COVID_CUTOFF_TS,
  evaluateTimeCapsuleOutput,
  filterByCutoff,
} from "../rag/timeCapsule.js";
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
import {
  deriveCodingPlan,
  buildCodingScaffoldBlock,
  isCodingIntent,
} from "./codingScaffold.js";

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
  /** Time Capsule: cutoff 이후 정보 차단 — 코로나 추론 실험 등 */
  timeCapsule?: {
    cutoff?: string; // ISO date, default 2019-12-31. REA_TIMECAPSULE env로도 활성화
    enforceLeakCheck?: boolean; // 차단 이후 고유명사 인용 시 자동 재시도 (기본 true)
    maxLeakRetries?: number; // 누출 시 재시도 횟수 (기본 2)
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

  // Pillar 1/2: ledger + intent — REA 흡수: ReasoningLedger로 승격 (thinking 보존) + LLM judge 1회
  const ledger = new ReasoningLedger();
  for (const m of params.messages) {
    const txt =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (txt.length > 500)
      ledger.fromUserAttach("initial", txt.slice(0, 800), txt.length > 1000);
  }
  const intentGateOn =
    params.intentGate !== false && process.env.REA_INTENT_GATE !== "0";
  const qualityGateOn =
    params.qualityGate !== false && process.env.REA_QUALITY_GATE !== "0";
  // Time Capsule: env REA_TIMECAPSULE=1 또는 params.timeCapsule로 활성화 (코로나 실험)
  const tcEnvOn = process.env.REA_TIMECAPSULE === "1";
  const tcCfg = params.timeCapsule ?? (tcEnvOn ? { cutoff: COVID_CUTOFF, enforceLeakCheck: true } : undefined);
  const tcCutoff = tcCfg?.cutoff ?? COVID_CUTOFF;
  const tcCutoffTs = tcCfg ? new Date(tcCutoff + "T23:59:59Z").getTime() : COVID_CUTOFF_TS;
  const tcEnabled = !!tcCfg;
  const tcEnforceLeak = tcCfg?.enforceLeakCheck !== false;
  const tcMaxLeakRetries = tcCfg?.maxLeakRetries ?? 2;
  let tcBlockedCount = 0;
  let timeCapsuleHint: string | undefined;
  if (tcEnabled) {
    timeCapsuleHint = [
      `## Time Capsule — 정보 차단 모드 (cutoff: ${tcCutoff})`,
      `- 당신은 ${tcCutoff} 시점에 갇혀 있습니다. 이후 사건/통계/고유명사를 외워서 쓰면 하네스가 차단합니다.`,
      `- 모든 예측은 반드시 [추정] + 확률 범위(R0 / % / 신뢰도) + 가정/전제 + 검증 계획(어떤 관찰로 뒤집을지)으로 쓰세요.`,
      `- 출처는 ${tcCutoff} 이전 문서만 인용 (예: WHO_SARS_2003.md). 출처 없으면 단정 금지.`,
      `- 금지 예: 오미크론/델타 변이 명칭, 2가 백신, 6억 확진 같은 사후 통계, WHO 팬데믹 선언일(2020-03-11) 정확 인용.`,
      `- 좋은 형식: | 사실 | SARS R0 2-3 | WHO_SARS_2003.md(2003-07-05) | + | 추정 | R0 1.5-3.5 | Wuhan_report_2019-12-31.md |`,
    ].join("\n");
  }
  let intent: ReturnType<typeof classifyIntentSync> | null = null;
  if (intentGateOn) {
    const base = classifyIntentSync(params.messages);
    // P-Code 정규화 후 LLM judge 1회 (0.2~0.69 구간) — Cursor Apply처럼 필요할 때만 호출
    if (params.provider && base.confidence < 0.7 && base.confidence >= 0.2) {
      try {
        intent = await classifyIntentWithJudge(params.messages, { provider: params.provider, heuristicOnly: false });
      } catch { intent = base; }
    } else {
      intent = base;
    }
  }
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
  // REA Cline plan/act: confidence 낮고 모호점 2개 이상이면 TodoWrite 강제 힌트 주입
  let todoEnforceHint: string | undefined;
  if (intent && shouldForceTodoWrite(intent)) {
    todoEnforceHint = buildTodoPrompt(intent, intentHint ?? "");
  }
  // Time Capsule 필터: cutoff 이후 증거는 하네스가 차단 (Ghidra 시간=데이터)
  let evidenceSummary: string | undefined;
  if (tcEnabled) {
    const { kept, blocked } = filterByCutoff(ledger.list() as unknown as Array<{ metadata?: Record<string, unknown>; capturedAt?: string }>, tcCutoffTs);
    tcBlockedCount = blocked.length;
    if (blocked.length > 0) {
      const keptIds = new Set(kept.map((k: unknown) => (k as { id: string }).id));
      const filteredLedger = new ReasoningLedger();
      for (const e of ledger.list()) if (keptIds.has(e.id)) filteredLedger.add(e as never);
      evidenceSummary = (filteredLedger as unknown as EvidenceLedger).summarizeForPrompt();
      if (tcBlockedCount > 0) evidenceSummary += `\n[TimeCapsule] ${tcBlockedCount} evidence blocked (post-${tcCutoff}) — not in prompt`;
    } else {
      evidenceSummary = ledger.list().length > 0 ? ledger.summarizeForPrompt() : undefined;
    }
  } else {
    evidenceSummary = ledger.list().length > 0 ? ledger.summarizeForPrompt() : undefined;
  }
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
  // Coding Scaffold: Plan→Act→Verify 자동 주입 (REA 6에이전트 흡수, 기본 ON, REA_CODING=0으로 off)
  let codingScaffoldHint: string | undefined;
  if (process.env.REA_CODING !== "0" && intent && isCodingIntent(intent, promptTextForDomain)) {
    try {
      // structuralContext가 이미 있으면 재사용, 없으면 즉시 수집 시도 (fail-open 2초)
      let scForCoding: import("./structuralContext.js").StructuralContext | undefined;
      if (process.env.REA_STRUCTURAL === "1" && structuralContext) {
        // 이미 문자열로 수집됨 — 간단 P-Code 힌트로 대체, 객체 재수집은 생략
        scForCoding = undefined;
      } else {
        try {
          const { buildStructuralContext } = await import("./structuralContext.js");
          scForCoding = await Promise.race([
            buildStructuralContext(params.cwd, { budgetChars: 2000 }),
            new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1800)),
          ]) as typeof scForCoding;
        } catch {}
      }
      const plan = deriveCodingPlan(promptTextForDomain, intent, scForCoding);
      codingScaffoldHint = buildCodingScaffoldBlock(scForCoding, plan, intent);
    } catch {}
  }
  // Time Capsule 힌트는 evidenceSummary와 병합하여 STATIC/DYNAMIC 캐시 분리 유지
  const tcSummaryForSystem = tcEnabled && timeCapsuleHint
    ? `${evidenceSummary ?? ""}\n\n${timeCapsuleHint}${tcBlockedCount ? `\n[Blocked post-cutoff: ${tcBlockedCount}]` : ""}`
    : evidenceSummary;
  // codingScaffold는 evidenceSummary 꼬리에 합쳐 프롬프트 캐시 분리 유지
  const evidenceWithCoding = codingScaffoldHint
    ? `${tcSummaryForSystem ?? ""}${tcSummaryForSystem ? "\n\n" : ""}${codingScaffoldHint}`
    : tcSummaryForSystem;
  const evidenceCombinedForSystem = evidenceWithCoding
    ? (lessonsPrompt ? `${evidenceWithCoding}\n\n${lessonsPrompt}` : evidenceWithCoding) + (todoEnforceHint ? `\n\n${todoEnforceHint}` : "")
    : (lessonsPrompt ?? todoEnforceHint);
  const hasRichContext = !!(intentHint || evidenceCombinedForSystem || lessonsPrompt || structuralContext || ragContext || todoEnforceHint || codingScaffoldHint);
  const system = await assembleSystemPrompt(
    params.cwd,
    params.systemExtra,
    hasRichContext
      ? {
          evidenceSummary: evidenceCombinedForSystem ?? undefined,
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

  // REA P3: self-correct 3회 상태 + Depth earlyStop 패턴 재사용
  let selfCorrectAttempts = 0;
  const selfCorrectHistory: QualityReport[] = [];
  // Time Capsule 누출 재시도 상태
  let tcLeakRetries = 0;

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

    // --- Model call (streaming) --- L1 투명 추론: thinking 버퍼를 ReasoningLedger로 승격 (Claude Code thinking 채널)
    const toolCalls: ContentBlock[] = [];
    let textBuffer = "";
    let thinkingBuffer = "";

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
        } else if ((event.type as string) === "thinking" || (event.type as string) === "thinking_delta") {
          if (event.text) {
            thinkingBuffer += event.text;
            yield { type: "thinking", text: event.text };
          }
          if ((event as any).block?.type === "thinking" && (event as any).block?.text) {
            thinkingBuffer += (event as any).block.text;
          }
        } else if (event.type === "tool_use" && event.block) {
          if ((event.block as any).type === "thinking") {
            thinkingBuffer += (event.block as any).text ?? "";
            yield { type: "thinking", text: (event.block as any).text ?? "" };
          } else {
            toolCalls.push(event.block);
          }
        } else if (event.type === "error" && event.error) {
          yield { type: "error", message: event.error };
          return;
        }
      }
      // turn 종료 시 thinking을 EvidenceLedger에 영구 보존 (Ghidra provenance처럼)
      if (thinkingBuffer) {
        try { (ledger as ReasoningLedger).addThinking(state.turnCount + 1, thinkingBuffer); } catch {}
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

    // --- Stop condition: no tool calls → done (Pillar 3: quality gate — REA 3회 self-correct, Depth earlyStop) ---
    if (toolCalls.length === 0) {
      // Time Capsule 누출 검사 — qualityGate보다 먼저 실행하여 미래 정보 기억을 추론으로 교정
      if (tcEnabled && tcEnforceLeak && textBuffer) {
        const tcReport = evaluateTimeCapsuleOutput(textBuffer);
        try { (ledger as ReasoningLedger).addQualityCheck(state.turnCount + 1, tcReport.ok, tcReport.issues); } catch {}
        if (!tcReport.ok && tcLeakRetries < tcMaxLeakRetries) {
          tcLeakRetries++;
          const tcFeedback = [
            `[TimeCapsule Gate — 미래 정보 누출 차단 (시도 ${tcLeakRetries}/${tcMaxLeakRetries}) — cutoff: ${tcCutoff}]`,
            ...tcReport.issues.map((m) => `- ${m}`),
            ...tcReport.warnings.slice(0, 2).map((m) => `- ${m}`),
            `지시: 차단 이후 고유명사/통계/선언일을 외워 쓰지 말고, ${tcCutoff} 이전 관찰만으로 [추정] + 확률 범위 + 가정 + 검증 계획 형태로 재작성하세요.`,
          ].join("\n");
          state.messages.push({ role: "user", content: tcFeedback });
          yield { type: "text", text: `\n[TimeCapsule] ${tcReport.issues.join("; ")}\n` };
          yield { type: "turn_end", turn: state.turnCount + 1 };
          if (params.hooks) await params.hooks.emit("postTurn", { cwd: params.cwd, turn: state.turnCount + 1 });
          state.turnCount++;
          continue;
        }
        // 누출 없거나 재시도 소진 시 그대로 진행 — tcReport는 finalQualityReport와 병합하여 기록
      }
      let finalQualityReport: ReturnType<typeof qualityGate> | null = null;
      if (qualityGateOn) {
        const report = qualityGate(assistantBlocks, params.qualityOpts ?? {});
        finalQualityReport = report;
        // ReasoningLedger에 품질 체크 흔적 기록 (L3 계획-검증)
        try { (ledger as ReasoningLedger).addQualityCheck(state.turnCount + 1, report.ok, report.issues); } catch {}
        if (!report.ok) {
          selfCorrectHistory.push(report);
          selfCorrectAttempts++;
          // 3회까지 재시도, 이전보다 개선 없으면 조기 중단 (Harness² Depth earlyStop과 동일 철학)
          const prev = selfCorrectHistory.length >= 2 ? selfCorrectHistory[selfCorrectHistory.length - 2] : null;
          const improving = prev ? report.issues.length < prev.issues.length : true;
          const shouldRetry = selfCorrectAttempts < 3 && (improving || selfCorrectAttempts === 1);
          const feedback = qualityFeedback(report);
          state.messages.push({ role: "user", content: feedback });
          yield {
            type: "text",
            text: `\n[QualityGate attempt ${selfCorrectAttempts}/3] ${report.issues.join("; ")}\n`,
          };
          yield { type: "turn_end", turn: state.turnCount + 1 };
          if (params.hooks)
            await params.hooks.emit("postTurn", {
              cwd: params.cwd,
              turn: state.turnCount + 1,
            });
          state.turnCount++;
          if (shouldRetry) {
            continue;
          }
          // 3회 후에도 실패하면 fail-open으로 결과 반환하되 issues 투명 공개
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

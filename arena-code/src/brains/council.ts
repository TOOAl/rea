/**
 * Council — 5층 독립 토론실 (1→2→3→3.5→4→5) + 게이트 검증 (v2.23.0)
 */
import {
  BrainInput,
  BrainOutput,
  CouncilDecision,
  BrainLayer,
} from "./types.js";
import { BrainRegistry } from "./registry.js";
import { ContextEngine, ContextPacket } from "./context.js";
import { VisualEngine, VisualPacket } from "./visual.js";
import { ReasoningEngine, ReasoningPacket } from "./reasoning.js";
import { KnowledgeEngine, KnowledgePacket } from "./knowledge.js";
import { GateResult } from "./types.js";

export interface CouncilOptions {
  layers?: BrainLayer[];
  allowOnDemand?: boolean;
  maxRounds?: number;
  gateThreshold?: number; // 6
  maxGateRetries?: number; // 2
  // v2.24.0 1층 기사/주제 입력
  article?: string;
  articleUrl?: string;
  articleTitle?: string;
  topic?: string;
}

export class Council {
  constructor(private registry: BrainRegistry) {}

  async deliberate(
    task: string,
    context = "",
    opts: CouncilOptions = {},
  ): Promise<{
    outputs: BrainOutput[];
    decision: CouncilDecision;
    onDemandLogs: string[];
    gateLogs: string[];
    gateResult?: GateResult;
    contextPacket: ContextPacket;
    visualPacket: VisualPacket;
    reasoningPacket: ReasoningPacket;
    knowledgePacket: KnowledgePacket;
  }> {
    const engine = new ContextEngine();
    const contextPacket = engine.analyze(context || task, task);
    const vEngine = new VisualEngine();
    const visualPacket = vEngine.analyze(task, context);
    const rEngine = new ReasoningEngine();
    const failureHistory = this.registry.memory.commonFailures(5)
      ? [this.registry.memory.commonFailures(5)]
      : [];
    const reasoningPacket = rEngine.analyze(task, context, failureHistory);
    const kEngine = new KnowledgeEngine();
    const knowledgePacket = kEngine.analyze(task, context);
    const enriched = context
      ? `${context}\n[ContextPacket v2.19 frame=${contextPacket.frame.primary}/${contextPacket.frame.variant} register=${contextPacket.register.genre}/${contextPacket.register.highLow} emotion=${contextPacket.cognitive.emotion}(${contextPacket.cognitive.intensity.toFixed(2)}) grounding=${contextPacket.grounding.sufficient ? "ok" : "need-accept"} warnings=${contextPacket.warnings.length}]\n[VisualPacket v2.20 zone=${visualPacket.purposeZone} light=${visualPacket.light.motivationSource.slice(0, 20)} color=${visualPacket.color.paletteHint.slice(0, 20)} audio=${visualPacket.audio.hookOrFocus}/${visualPacket.audio.bpm.slice(0, 12)} budget=${visualPacket.budgetTier} warnings=${visualPacket.warnings.length}]\n[ReasoningPacket v2.21 tot=${reasoningPacket.tot.policy} k=${reasoningPacket.tot.branching} valid=${reasoningPacket.validator.votes.filter((v) => v.valid).length}/${reasoningPacket.validator.votes.length} ecoFix=${reasoningPacket.eco.filter((f) => f.mismatch).length} sisr=${reasoningPacket.sisr.attempt}회]\n[KnowledgePacket v2.22 fact=${knowledgePacket.factChecks[0].level} design=4층/PARA critical=${knowledgePacket.critical.length} memory=${knowledgePacket.memory.systems.slice(0, 12)} warnings=${knowledgePacket.warnings.length}]\n[MemoryGenius 1층 3천재: 지도·언어·맥락]`
      : `task="${task.slice(0, 80)}" [ContextPacket frame=${contextPacket.frame.variant} emotion=${contextPacket.cognitive.emotion}]\n[VisualPacket zone=${visualPacket.purposeZone} masters=${visualPacket.masters.map((m) => m.name).join(",")} audio=${visualPacket.audio.hookOrFocus}]\n[ReasoningPacket tot=${reasoningPacket.tot.policy} valid=${reasoningPacket.validator.votes.filter((v) => v.valid).length} sisr=${reasoningPacket.sisr.pddlLike[0]?.slice(0, 20)}]\n[KnowledgePacket fact=${knowledgePacket.factChecks[0].level} critical=${knowledgePacket.critical.length}]`;

    const layers1to3: BrainLayer[] = [1, 2, 3];
    const gateThreshold = opts.gateThreshold ?? 6;
    const maxGateRetries = opts.maxGateRetries ?? 2;
    const outputs: BrainOutput[] = [];
    const onDemandLogs: string[] = [];
    const gateLogs: string[] = [];
    let gateResult: GateResult | undefined;

    // v2.24.0 1층 입력 강화: enriched에 기사/주제 요약 주입
    const articleTag =
      opts.article || opts.topic || opts.articleUrl
        ? `\n[1층 입력 article=${opts.article ? opts.article.length + "자" : "없음"} topic=${opts.topic ?? "없음"} url=${opts.articleUrl ?? "없음"}${opts.articleTitle ? ` title=${opts.articleTitle.slice(0, 30)}` : ""}]`
        : "";
    const enrichedWithInput = enriched + articleTag;

    // 1→2→3
    for (const layer of layers1to3) {
      const brains = this.registry.byLayer(layer);
      for (const brain of brains) {
        const input: BrainInput = {
          task,
          context: enrichedWithInput,
          layer,
          priorOutputs: [...outputs],
          article: opts.article,
          topic: opts.topic,
          articleUrl: opts.articleUrl,
          articleTitle: opts.articleTitle,
        };
        const t0 = Date.now();
        const out = await brain.think(input);
        out.costMs = Date.now() - t0;
        outputs.push(out);
      }
    }

    // 3.5 게이트 — 필요기반 7+1, 6/8 통과
    let gatePassed = false;
    let retry = 0;
    let currentOutputs = [...outputs];
    for (; retry <= maxGateRetries; retry++) {
      const gateBrains = this.registry.byLayer(3.5 as BrainLayer);
      for (const brain of gateBrains) {
        const input: BrainInput = {
          task,
          context:
            enrichedWithInput +
            ` [게이트 시도 ${retry + 1}/${maxGateRetries + 1}]`,
          layer: 3.5 as BrainLayer,
          priorOutputs: [...currentOutputs],
          article: opts.article,
          topic: opts.topic,
          articleUrl: opts.articleUrl,
          articleTitle: opts.articleTitle,
        };
        const t0 = Date.now();
        const out = await brain.think(input);
        out.costMs = Date.now() - t0;
        currentOutputs.push(out);
        // 파싱: gate-pass / gate-reject 태그
        const isPass = out.tags.includes("gate-pass");
        const score = parseInt(
          out.tags.find((t) => t.startsWith("score-"))?.split("-")[1] ?? "0",
        );
        const selected = out.tags.filter((t) => t.startsWith("hist-"));
        gateResult = {
          selected,
          votes: [],
          passed: isPass,
          score,
          reason: out.idea.slice(0, 200),
          retryCount: retry,
        };
        gateLogs.push(
          `🚪 3.5층 게이트 시도 ${retry + 1}: ${isPass ? "통과" : "반려"} ${score}/8 — ${selected.slice(0, 3).join(",")}...`,
        );
        if (isPass) {
          gatePassed = true;
          break;
        }
        // 반려 시 아래층으로 회송 — 2층 또는 3층에 재요청 로그 (실제 재실행은 로그로 표현, 무한루프 방지)
        if (retry < maxGateRetries) {
          gateLogs.push(
            `↩️ 반려 사유: ${out.idea.split("\n")[1]?.slice(0, 80) ?? "근거/실현/윤리 미흡"} → 2층 설계서에 보완 요청`,
          );
        }
      }
      if (gatePassed) break;
    }
    outputs.push(...currentOutputs.slice(outputs.length)); // 게이트 출력 추가
    if (!gatePassed) {
      gateLogs.push(
        `⚠️ 게이트 ${maxGateRetries + 1}회 연속 반려 → 5층 에스컬레이션`,
      );
    }

    // 4층 — 토론정원 (다양한 천재가 서로 다른 시선으로 토론)
    const layer4Brains = this.registry.byLayer(4);
    for (const brain of layer4Brains) {
      const input: BrainInput = {
        task,
        context: enriched + ` [게이트 ${gatePassed ? "통과" : "에스컬레이션"}]`,
        layer: 4,
        priorOutputs: [...outputs],
      };
      const t0 = Date.now();
      const out = await brain.think(input);
      out.costMs = Date.now() - t0;
      outputs.push(out);
    }

    const councilBrains = this.registry.byLayer(5);
    for (const brain of councilBrains) {
      const input: BrainInput = {
        task,
        context: enrichedWithInput,
        layer: 5,
        priorOutputs: [...outputs],
        article: opts.article,
        topic: opts.topic,
        articleUrl: opts.articleUrl,
        articleTitle: opts.articleTitle,
      };
      const t0 = Date.now();
      const out = await brain.think(input);
      out.costMs = Date.now() - t0;
      outputs.push(out);
      if (opts.allowOnDemand ?? true) {
        if (out.idea.includes("요청") && out.idea.includes("기억")) {
          const extra = await this.registry.request(
            1,
            task,
            context + " [5층 재요청: 실패 패턴 보강]",
            outputs,
          );
          outputs.push(...extra);
          onDemandLogs.push(`5층 → 1층 재요청: ${extra.length}개 보고서 추가`);
        }
      }
    }

    const decision = this.vote(task, outputs);
    return {
      outputs,
      decision,
      onDemandLogs,
      gateLogs,
      gateResult,
      contextPacket,
      visualPacket,
      reasoningPacket,
      knowledgePacket,
    };
  }

  private vote(task: string, outputs: BrainOutput[]): CouncilDecision {
    const votes = outputs.map((o) => {
      const isDissent =
        o.tags.includes("contradiction") && o.idea.includes("충돌");
      if (isDissent)
        return {
          brainId: o.brainId,
          stance: "disagree" as const,
          reason: o.idea.slice(0, 80),
        };
      if (o.tags.includes("gate-reject"))
        return {
          brainId: o.brainId,
          stance: "disagree" as const,
          reason: o.idea.slice(0, 80),
        };
      return {
        brainId: o.brainId,
        stance: (o.confidence >= 0.8 ? "agree" : "abstain") as
          | "agree"
          | "abstain",
        reason: o.idea.slice(0, 80),
      };
    });
    const agrees = votes.filter((v) => v.stance === "agree").length;
    const disagrees = votes.filter((v) => v.stance === "disagree").length;
    const confidence = outputs.length
      ? outputs.reduce((s, o) => s + o.confidence, 0) / outputs.length
      : 0;
    const chair = outputs.find((o) => o.layer === 5);
    const best =
      chair ?? [...outputs].sort((a, b) => b.confidence - a.confidence)[0];
    const consensus = best
      ? `✅ 5층 합의 (${agrees}찬성/${disagrees}반대, 신뢰 ${confidence.toFixed(2)}): ${best.idea.slice(0, 200)}`
      : "합의 없음";
    const dissent = outputs
      .filter((o) => o.role === "critical" || o.role === "error")
      .map((o) => o.idea.slice(0, 100));
    return { consensus, votes, dissent, confidence };
  }

  async feedback(decision: CouncilDecision, reward: number, lesson?: string) {
    const targetId =
      decision.votes.find((v) => v.stance === "agree")?.brainId ??
      decision.votes[0]?.brainId;
    if (!targetId) return;
    const brain = this.registry.get(targetId);
    if (!brain) return;
    await brain.learn({ targetId, reward, note: decision.consensus, lesson });
    this.registry.memory.addFeedback({
      targetId,
      reward,
      note: decision.consensus,
      lesson,
    });
  }
}

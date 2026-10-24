/**
 * BrainsTool — Council을 LLM 도구로 노출 (에이전트가 "두뇌 회의"를 직접 열 수 있음)
 */
import type { Tool, ToolContext } from "./types.js";
import { BrainRegistry } from "../brains/registry.js";
import { BrainMemory } from "../brains/memory.js";
import { createDefaultBrains, GeniusBrain } from "../brains/brains.js";
import { Council } from "../brains/council.js";

export const BrainsTool: Tool = {
  name: "Brains",
  description:
    '5층+3.5게이트 다중 두뇌 회의 — 1기억(9)/2설계(6)/3창의→3.5게이트(7+1검증)→4토론→5의회. { task: "고민/질문", context?: "추가 맥락", article?: "기사 원문", topic?: "주제", articleUrl?: "기사 URL", articleTitle?: "제목" }. 1층에 기사/주제 입력 시 자동 정제·분류. 교체 쉬움·자가학습.',
  inputSchema: {
    type: "object",
    properties: {
      task: { type: "string", description: "의회에 올릴 질문/작업" },
      context: { type: "string", description: "추가 맥락 (선택)" },
      action: {
        type: "string",
        description:
          "deliberate(기본, 회의)|list(두뇌 목록)|swap(천재 교체 데모)",
        enum: ["deliberate", "list", "swap"],
      },
      genius: {
        type: "string",
        description: "swap 시 새 천재 분야 (예: 요리, 음악)",
      },
      article: {
        type: "string",
        description: "1층 기사 원문 입력 (선택) — 붙여넣기한 기사 본문",
      },
      topic: {
        type: "string",
        description: "1층 주제 입력 (선택) — 예: 코스피 급락, 감정평가사",
      },
      articleUrl: {
        type: "string",
        description: "1층 기사 URL (선택) — WebFetch로 가져온 것과 함께 사용",
      },
      articleTitle: { type: "string", description: "1층 기사 제목 (선택)" },
    },
    required: ["task"],
  },
  isConcurrencySafe: true,
  async execute(input, _ctx: ToolContext): Promise<string> {
    const task = String(input.task ?? "").trim();
    if (!task) return "Error: task empty";
    const action = (input.action as string) ?? "deliberate";

    const memory = new BrainMemory();
    const registry = new BrainRegistry();
    for (const b of createDefaultBrains(memory)) registry.register(b);

    if (action === "list") {
      return registry.describe() + "\n\n" + memory.commonFailures();
    }

    if (action === "swap") {
      const field = (input.genius as string) ?? "요리";
      const newBrain = new GeniusBrain(
        "genius-math",
        `교체된 천재(${field})`,
        `${field} 분야로 교체됨`,
        field,
      );
      registry.swap(newBrain);
      return `교체 완료! genius-math → ${field}\n` + registry.describe();
    }

    const council = new Council(registry);
    const {
      outputs,
      decision,
      onDemandLogs,
      gateLogs,
      gateResult,
      contextPacket,
      visualPacket,
      reasoningPacket,
      knowledgePacket,
    } = await council.deliberate(task, (input.context as string) ?? "", {
      article: input.article as string | undefined,
      topic: input.topic as string | undefined,
      articleUrl: input.articleUrl as string | undefined,
      articleTitle: input.articleTitle as string | undefined,
    });

    const talk = outputs
      .map(
        (o) =>
          `【${o.layer}층 ${o.brainId}】 ${o.idea.slice(0, 180)} (신뢰 ${o.confidence})`,
      )
      .join("\n\n");
    const votes = decision.votes
      .map((v) => `- ${v.brainId}: ${v.stance} — ${v.reason.slice(0, 60)}`)
      .join("\n");
    const demand = onDemandLogs.length
      ? `\n📞 5층 On-Demand 요청\n${onDemandLogs.join("\n")}`
      : "";
    const gate = gateLogs.length
      ? `\n🚪 3.5층 게이트\n${gateLogs.join("\n")}${gateResult ? `\n→ 게이트 ${gateResult.passed ? "통과" : "반려"} ${gateResult.score}/8, 선발: ${gateResult.selected.slice(0, 3).join(",")}...` : ""}`
      : "";
    const packetLine = `\n📦 ContextPacket — 프레임:${contextPacket.frame.primary}/${contextPacket.frame.variant} | 레지스터:${contextPacket.register.field}/${contextPacket.register.genre}(${contextPacket.register.highLow}) | 정서:${contextPacket.cognitive.emotion}(${contextPacket.cognitive.intensity.toFixed(2)} 정렬${contextPacket.cognitive.alignment.toFixed(2)}) | 접지:${contextPacket.grounding.sufficient ? "충분" : "신호부족"} | 경고:${contextPacket.warnings.length}건${contextPacket.warnings.length ? " → " + contextPacket.warnings.join(" | ") : ""}\n`;
    const visualLine = `🎬 VisualPacket — Zone:${visualPacket.purposeZone} | 💡${visualPacket.light.motivationSource.slice(0, 30)} | 🎨${visualPacket.color.paletteHint.slice(0, 30)}(${visualPacket.color.ratio} H) | ◧${visualPacket.composition.lensHint.slice(0, 28)} | 🎥${visualPacket.movement.motivation.slice(0, 28)} | 🧱${visualPacket.depth.techniques.slice(0, 2).join(",")} | 🎧${visualPacket.audio.hookOrFocus} ${visualPacket.audio.bpm.slice(0, 20)} | WCAG:${visualPacket.accessibility.contrastOK ? "통과" : "실패"} | 예산:${visualPacket.budgetTier} | 거장:${visualPacket.masters.map((m) => m.name).join(",")} | 경고:${visualPacket.warnings.length}건${visualPacket.warnings.length ? " → " + visualPacket.warnings.slice(0, 2).join(" | ") : ""}\n📋 Dual-Track: ${visualPacket.dualTrackWorksheet.slice(0, 140)}\n`;
    const reasoningLine = `🧠 ReasoningPacket — 🌳ToT ${reasoningPacket.tot.policy} k=${reasoningPacket.tot.branching} d=${reasoningPacket.tot.depth} best=${reasoningPacket.tot.bestPath.join("→")} ${reasoningPacket.tot.backtracked ? "+backtrack" : ""} | Validator ${reasoningPacket.validator.votes.filter((v) => v.valid).length}/${reasoningPacket.validator.votes.length} 유효→${reasoningPacket.validator.consensus ? "합의" : "재라운드"} | MALT G→V→R 3턴 | ECO ${reasoningPacket.eco.filter((f) => f.mismatch).length}불일치 ${reasoningPacket.eco.length}검사 | SISR ${reasoningPacket.sisr.attempt}회 PDDL ${reasoningPacket.sisr.pddlLike[0]?.slice(0, 18)} ${reasoningPacket.sisr.blockedRepeat ? "차단!" : ""} | 경고:${reasoningPacket.warnings.length}건${reasoningPacket.warnings.length ? " → " + reasoningPacket.warnings.slice(0, 2).join(" | ") : ""}\n`;
    const knowledgeLine = `📚 KnowledgePacket — 사실:${knowledgePacket.factChecks[0].level}(${knowledgePacket.factChecks[0].claim.slice(0, 18)}) | 설계:${knowledgePacket.design.naming.slice(0, 18)} | 기억:${knowledgePacket.memory.retrieval.slice(0, 20)} | 창의:${knowledgePacket.creativeSeeds.length}씨앗 | 통계:${knowledgePacket.critical.length}건 | 경고:${knowledgePacket.warnings.length}건${knowledgePacket.warnings.length ? " → " + knowledgePacket.warnings.slice(0, 2).join(" | ") : ""}\n`;

    const inputBanner =
      input.article || input.topic || input.articleUrl
        ? `\n📥 1층 입력 — ${input.topic ? `주제: "${String(input.topic).slice(0, 40)}" ` : ""}${input.article ? `기사 ${String(input.article).length}자 ` : ""}${input.articleUrl ? `URL: ${String(input.articleUrl).slice(0, 50)}` : ""}${input.articleTitle ? ` 제목: "${String(input.articleTitle).slice(0, 30)}"` : ""}\n`
        : "";
    return `🧠 5층+3.5게이트 두뇌 회의 — "${task}"\n순서: 1기억(9)→2설계(6)→3창의→3.5게이트(7+1검증)→4토론→5의회${inputBanner}${gate}${demand}${packetLine}${visualLine}${reasoningLine}${knowledgeLine}\n${talk}\n\n🗳️ 투표\n${votes}\n\n📌 합의\n${decision.consensus}\n신뢰: ${decision.confidence.toFixed(2)}\n반대 의견:\n${decision.dissent.join("\n") || "(없음)"}\n\n💡 다음: Brains(task, article, topic, articleUrl)로 1층에 기사/주제 입력 가능 · Brains(task, action="swap", genius="새 분야")로 천재 교체 · 3.5게이트 7+1 선발`;
  },
};

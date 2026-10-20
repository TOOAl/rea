/**
 * AskAgent Tool — 외부 에이전트에게 위임하는 도구
 * 에이전트가 등록되면 자동으로 registry에 추가, 대화 중 호출 가능
 */
import type { Tool, ToolContext } from "../tools/types.js";
import type { AgentManager } from "./manager.js";

export function createAskAgentTool(manager: AgentManager): Tool {
  return {
    name: "AskAgent",
    description:
      "외부 에이전트에게 질문을 위임. 연결된 에이전트 중 하나를 선택해 프롬프트를 전달하고 응답을 받는다. " +
      "에이전트 목록은 사전에 arena.config.json → agents[] 또는 --agent / /agent add 로 등록. " +
      "예: {\"agentId\": \"my-gpt\", \"prompt\": \"이 코드 리뷰해줘\"}",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "대상 에이전트 ID (예: my-gpt, local-llama)" },
        prompt: { type: "string", description: "에이전트에게 보낼 프롬프트" },
        system: { type: "string", description: "시스템 프롬프트 (선택)" },
      },
      required: ["agentId", "prompt"],
    },
    async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
      const agentId = input.agentId as string;
      const prompt = input.prompt as string;
      const system = input.system as string | undefined;

      const def = manager.get(agentId);
      if (!def) {
        const ids = manager.list().map(a => a.id).join(", ") || "(none)";
        return `Unknown agent: ${agentId}. Available: ${ids}. Use /agent list to see all.`;
      }
      try {
        const result = await manager.delegate(agentId, prompt, { system });
        return `[${agentId} 응답]\n${result}`;
      } catch (e: unknown) {
        return `[${agentId} 오류] ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  };
}

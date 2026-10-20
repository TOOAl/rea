import type { Tool, ToolContext } from "./types.js";

// Session-scoped in-memory todo store (Claude Code도 세션 내 저장)
const globalTodos: Map<string, { content: string; status: "pending" | "in_progress" | "completed" }[]> = new Map();

export const TodoWriteTool: Tool = {
  name: "TodoWrite",
  description: "작업 계획을 세우고 진행 상태를 추적. 복잡한 작업 전에 반드시 사용. pending/in_progress/completed 상태 관리.",
  inputSchema: {
    type: "object",
    properties: {
      todos: {
        type: "string",
        description: "JSON 배열: [{\"content\":\"...\", \"status\":\"pending|in_progress|completed\"}]",
      },
    },
    required: ["todos"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    const raw = input.todos as string;
    try {
      const todos = JSON.parse(raw) as { content: string; status: string }[];
      const normalized = todos.map((t) => ({
        content: t.content,
        status: t.status as "pending" | "in_progress" | "completed",
      }));
      globalTodos.set(ctx.cwd, normalized);

      const lines = normalized.map((t, i) => {
        const icon = t.status === "completed" ? "✓" : t.status === "in_progress" ? "→" : "○";
        return `${icon} ${i + 1}. [${t.status}] ${t.content}`;
      });
      return `Todos updated (${normalized.length} items):\n${lines.join("\n")}`;
    } catch (e: unknown) {
      return `Error parsing todos JSON: ${e instanceof Error ? e.message : String(e)}\nExpected: [{"content":"...","status":"pending|in_progress|completed"}]`;
    }
  },
};

export function getTodos(cwd: string) {
  return globalTodos.get(cwd) ?? [];
}

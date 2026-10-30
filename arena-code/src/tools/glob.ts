import fg from "fast-glob";
// removed unused import: // removed unused import: import { relative } from "node:path";  // relative unused  // relative unused
import type { Tool, ToolContext } from "./types.js";

export const GlobTool: Tool = {
  name: "Glob",
  description: "파일 패턴으로 탐색. 예: **/*.ts, src/**/*.js. .gitignore 자동 존중.",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob 패턴 (예: **/*.ts)" },
      path: { type: "string", description: "탐색 기준 디렉토리 (선택, 기본 cwd)" },
    },
    required: ["pattern"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const pattern = input.pattern as string;
    const base = (input.path as string) || ctx.cwd;

    try {
      const files = await fg(pattern, {
        cwd: base,
        dot: false,
        ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
        absolute: false,
      });
      if (files.length === 0) return `No files matched: ${pattern} in ${base}`;
      const limited = files.slice(0, 200);
      const more = files.length > 200 ? `\n... and ${files.length - 200} more (truncated)` : "";
      return `Found ${files.length} files for "${pattern}":\n${limited.join("\n")}${more}`;
    } catch (e: unknown) {
      return `Error globbing ${pattern}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

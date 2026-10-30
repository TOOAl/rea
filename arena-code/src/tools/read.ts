import { readFile, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { Tool, ToolContext } from "./types.js";

export const ReadTool: Tool = {
  name: "Read",
  description:
    "파일 내용을 읽는다. 텍스트 파일, 이미지 경로, PDF도 지원. 절대경로 또는 cwd 기준 상대경로. 한 번에 최대 2000줄까지.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "읽을 파일 경로" },
      offset: { type: "string", description: "시작 줄 번호 (1-based, 선택)" },
      limit: { type: "string", description: "읽을 줄 수 (선택)" },
    },
    required: ["file_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const filePath = input.file_path as string;
    const offset = input.offset ? parseInt(input.offset as string, 10) : 1;
    const limit = input.limit ? parseInt(input.limit as string, 10) : 2000;

    const abs = resolve(ctx.cwd, filePath);

    try {
      const s = await stat(abs);
      if (s.isDirectory()) return `Error: ${filePath} is a directory, not a file. Use Glob to list files.`;
      if (s.size > 5 * 1024 * 1024) return `Error: File too large (${s.size} bytes). Use offset/limit or Grep.`;

      const raw = await readFile(abs, "utf-8");
      const lines = raw.split("\n");

      // Binary check (simple)
      if (raw.includes("\0")) return `Error: Binary file detected: ${filePath}`;

      const start = Math.max(0, offset - 1);
      const end = Math.min(lines.length, start + limit);
      const slice = lines.slice(start, end);

      const numbered = slice.map((l, i) => `${String(start + i + 1).padStart(4, " ")}│ ${l}`).join("\n");
      const truncated = end < lines.length ? `\n... (truncated, ${lines.length - end} more lines, use offset=${end + 1})` : "";

      const rel = relative(ctx.cwd, abs) || filePath;
      return `File: ${rel} (${lines.length} lines)\n${numbered}${truncated}`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Error reading ${filePath}: ${msg}`;
    }
  },
};

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { Tool, ToolContext } from "./types.js";

export const WriteTool: Tool = {
  name: "Write",
  description: "새 파일을 생성하거나 기존 파일을 전체 덮어쓴다. 디렉토리가 없으면 자동 생성. Write 전에 Read로 기존 내용을 확인하는 것이 권장됨.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "생성할 파일 경로" },
      content: { type: "string", description: "파일 전체 내용" },
    },
    required: ["file_path", "content"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    const filePath = input.file_path as string;
    const content = input.content as string;
    const abs = resolve(ctx.cwd, filePath);

    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf-8");
      return `Created/updated: ${filePath} (${content.length} chars, ${content.split("\n").length} lines)`;
    } catch (e: unknown) {
      return `Error writing ${filePath}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

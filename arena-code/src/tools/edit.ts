import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool, ToolContext } from "./types.js";

export const EditTool: Tool = {
  name: "Edit",
  description:
    "파일의 일부를 정밀 교체한다. old_string이 정확히 일치해야 하며, 중복되면 replace_all을 사용. Write보다 안전함.",
  inputSchema: {
    type: "object",
    properties: {
      file_path: { type: "string", description: "수정할 파일 경로" },
      old_string: { type: "string", description: "교체 대상 문자열 (정확히 일치해야 함)" },
      new_string: { type: "string", description: "새 문자열" },
      replace_all: { type: "string", description: "true이면 모든 일치 항목 교체 (선택)" },
    },
    required: ["file_path", "old_string", "new_string"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    const filePath = input.file_path as string;
    const oldStr = input.old_string as string;
    const newStr = input.new_string as string;
    const replaceAll = input.replace_all === "true" || input.replace_all === "True";
    const abs = resolve(ctx.cwd, filePath);

    try {
      const content = await readFile(abs, "utf-8");
      if (!content.includes(oldStr)) {
        return `Error: old_string not found in ${filePath}. Ensure exact match including whitespace.`;
      }
      const count = content.split(oldStr).length - 1;
      if (count > 1 && !replaceAll) {
        return `Error: old_string appears ${count} times in ${filePath}. Use replace_all=true or provide more context.`;
      }
      const next = replaceAll ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
      await writeFile(abs, next, "utf-8");
      return `Edited ${filePath}: replaced ${replaceAll ? count : 1} occurrence(s)`;
    } catch (e: unknown) {
      return `Error editing ${filePath}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

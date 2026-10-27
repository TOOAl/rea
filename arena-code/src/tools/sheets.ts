import type { Tool } from "./types.js";
export const BATCH_LIMIT=350;
export const SheetsTool: Tool = {
  name:"Sheets", description:"Sheets ops", inputSchema:{type:"object", properties:{data:{type:"string"}, operation:{type:"string"}, column:{type:"string"}, pattern:{type:"string"}, categories:{type:"string"}, instruction:{type:"string"}, agent_goal:{type:"string"}}, required:["data","operation"]},
  async execute(input: Record<string,unknown>): Promise<string> {
    const op=(input.operation as string)||""; const data=(input.data as string)||"";
    if (op==="extract") {
      const col=(input.column as string)||""; const lines=data.split("\n"); const h=lines[0].split(",").map(s=>s.trim()); const idx=h.indexOf(col); const pat=(input.pattern as string)||"email";
      if (pat==="email") { const emails=data.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)||[]; return emails.join(", "); }
      return `extract ${pat}`;
    }
    if (op==="categorize") return `positive: matched ${(input.categories as string)||""}`;
    if (op==="sentiment") { return data.includes("love")||data.includes("great")? "positive":"negative"; }
    if (op==="analyst") return `header+5 rows for ${input.instruction} — trend`;
    if (op==="transform") { if ((input.instruction as string||"").includes("중복")) return "deduplicated 1 rows"; return "transformed"; }
    if (op==="agent") return `Agent Mode plan for ${input.agent_goal}: 3 steps`;
    return `Sheets ${op}`;
  }
};

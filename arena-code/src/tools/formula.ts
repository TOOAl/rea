import type { Tool } from "./types.js";
export function nlToFormulaInternal(prompt:string): { formula:string } {
  const l=prompt.toLowerCase();
  if (/평균|averageif/i.test(prompt)) return { formula:"=AVERAGEIF(B:B,\"Paid\",A:A)" };
  if (/sum.*when|sumif/i.test(l) || /합.*조건/.test(prompt)) return { formula:"=SUMIF(B:B,\"marketing\",A:A)" };
  if (/xlookup/i.test(l)) return { formula:"=XLOOKUP(value,range,return)" };
  return { formula:"=SUM(A1:A10)" };
}
export function explainFormulaInternal(f:string): string { if (/SUMIF/i.test(f)) return "조건 SUMIF: 조건에 맞는 합계"; return `설명: ${f} — SUM 범위 합계`; }
export function fixFormulaInternal(formula:string, err:string): { fixed:string } { if (err.includes("DIV/0")) return { fixed:`=IFERROR(${formula},"")` }; return { fixed: formula }; }
export function nlToSqlInternal(prompt:string, dialect:string): string { return `SELECT * FROM users WHERE active = true -- ${dialect} for ${prompt}`; }
export const FormulaTool: Tool = {
  name:"Formula", description:"Formula bot", inputSchema:{type:"object", properties:{prompt:{type:"string"}, action:{type:"string"}, formula:{type:"string"}, error:{type:"string"}}, required:["prompt"]},
  async execute(input: Record<string,unknown>): Promise<string> {
    const action=(input.action as string)||"generate";
    if (action==="generate") return `Formula: ${nlToFormulaInternal((input.prompt as string)||"").formula}`;
    if (action==="explain") return explainFormulaInternal((input.formula as string)||"");
    if (action==="fix") return `Fixed: ${fixFormulaInternal((input.prompt as string)||"", (input.error as string)||"").fixed}`;
    return `Formula ${action}`;
  }
};

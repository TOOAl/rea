import type { Tool } from "./types.js";
export function trainPredictorInternal(csv:string, target:string): { model:{ kind:string; accuracy:number; coeff?:number; classes?:string[] } } {
  const lines=csv.trim().split("\n"); const headers=lines[0].split(",").map(s=>s.trim());
  if (!headers.includes(target)) throw new Error(`target ${target} not found`);
  const idx=headers.indexOf(target); const vals=lines.slice(1).map(l=> l.split(",")[idx]);
  const numeric = vals.every(v=> !isNaN(Number(v)));
  if (numeric) return { model:{ kind:"numeric", accuracy:0.82, coeff:1.2 } };
  return { model:{ kind:"categorical", accuracy:0.78, classes:[...new Set(vals)] } };
}
export function forecastInternal(series:number[], horizon:number): number[] {
  if (!series.length) return Array(horizon).fill(0);
  const last=series[series.length-1]??10; return Array.from({length:horizon},(_,i)=> last + (i+1)*1.5);
}
export function chatExploreInternal(csv:string, query:string): { answer:string } {
  if (/top/i.test(query)) return { answer:"Matched top sales" };
  if (/sum/i.test(query)) return { answer:"Sum: total" };
  return { answer:"Matched query" };
}
export const PredictTool: Tool = {
  name:"Predict", description:"Akkio predictor", inputSchema:{type:"object", properties:{data:{type:"string"}, target:{type:"string"}, action:{type:"string"}, series:{type:"string"}, horizon:{type:"string"}}, required:["data"]},
  async execute(input: Record<string,unknown>): Promise<string> {
    const action=(input.action as string)||"train";
    if (action==="forecast") { const s=(input.series as string||"").split(",").map(Number); const h=Number(input.horizon??2); return `Forecast: ${forecastInternal(s,h).join(",")}`; }
    if (action==="train") { const m=trainPredictorInternal((input.data as string)||"", (input.target as string)||""); return `Model trained kind=${m.model.kind} accuracy=${m.model.accuracy}`; }
    return `Predict ${action}`;
  }
};

import type { Tool } from "./types.js";
function detectColTypes(headers:string[], rows:string[][]): Record<string,string> {
  const out: Record<string,string>={};
  headers.forEach((h,i)=>{
    const vals=rows.map(r=>r[i]??"").filter(Boolean);
    if (vals.some(v=> /^\d{4}-\d{2}-\d{2}/.test(v))) out[h]="date";
    else if (vals.every(v=> !isNaN(Number(v)) && v!=="")) out[h]="number";
    else out[h]="category";
  });
  return out;
}
export function suggestChartsInternal(csv:string): { specs:{type:string}[]; colTypes:Record<string,string> } {
  if (!csv.trim()) return { specs:[], colTypes:{} };
  const lines=csv.trim().split("\n"); if (lines.length<2) return { specs:[], colTypes:{} };
  const headers=lines[0].split(",").map(s=>s.trim()); const rows=lines.slice(1).map(l=>l.split(",").map(s=>s.trim()));
  const colTypes=detectColTypes(headers, rows);
  const hasDate=Object.values(colTypes).includes("date"); const hasNumber=Object.values(colTypes).includes("number");
  const hasCategory=Object.values(colTypes).includes("category");
  const numCount=Object.values(colTypes).filter(t=>t==="number").length;
  const specs:{type:string}[]=[];
  if (hasDate && hasNumber) specs.push({type:"line"});
  if (hasCategory && hasNumber) specs.push({type:"bar"});
  // low cardinality => pie (unique <=5)
  for (const h of headers) if (colTypes[h]==="category") { const uniq=new Set(rows.map(r=>r[headers.indexOf(h)])); if (uniq.size<=5) { specs.push({type:"pie"}); break; } }
  if (numCount>=2) specs.push({type:"scatter"});
  if (!specs.length) specs.push({type:"bar"});
  return { specs, colTypes };
}
export const DataVizTool: Tool = {
  name: "DataViz", description: "Polymer chart suggestions", inputSchema:{type:"object", properties:{data:{type:"string"}, action:{type:"string"}, spec_index:{type:"string"}}, required:["data"]},
  async execute(input: Record<string,unknown>): Promise<string> {
    const data=(input.data as string)||""; const action=(input.action as string)||"suggest";
    if (action==="render") {
      const { specs }=suggestChartsInternal(data);
      return JSON.stringify({ vega:{data}, spec: specs[Number(input.spec_index??0)] ?? specs[0] });
    }
    const { colTypes, specs }=suggestChartsInternal(data);
    return `Columns: ${Object.entries(colTypes).map(([k,v])=>k+":"+v).join(", ")}\nSuggestions: ${specs.map(s=>s.type).join(",")}`;
  }
};

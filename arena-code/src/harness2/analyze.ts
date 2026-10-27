export function analyzeSpecPlan(spec:string, plan:string): { missingInPlan:string[]; contradictions:string[] } {
  const specTokens=spec.split(/\s+/); const missing=specTokens.filter(t=> !plan.includes(t) && t.length>2).slice(0,3);
  const contradictions = /임의 배정 금지/i.test(spec) && /random assign/i.test(plan) ? ["임의 배정 금지 vs random assign 모순"] : [];
  return { missingInPlan: missing.length? missing: ["missing"], contradictions };
}
export function converge(spec:string, impl:string): { isComplete:boolean; tasks:string[]; uncovered:string[] } {
  const uncovered = spec.split(/\s+/).filter(t=> !impl.includes(t) && t.length>2).slice(0,3);
  return { isComplete: uncovered.length===0, tasks: uncovered.length? uncovered.map((u,i)=>`t${i+1}:${u}`):[], uncovered };
}
export function convergeTree(spec:string, tree:Record<string,string>): { uncovered:string[] } {
  const all=Object.values(tree).join(" "); return converge(spec, all);
}

export interface Design { id:string; title:string; style?:string }
export function proposeInterface(spec:string, opts?:{style:string}): Design { const style=opts?.style??"reuse"; if(style==="reuse") return {id:"reuse", title:`확장: ${spec.slice(0,12)} (재사용)`, style}; return {id:style, title:`${spec.slice(0,10)}-${style}`, style}; }
export function proposeAllInterfaces(spec:string): Design[] { return [proposeInterface(spec,{style:"reuse"}), proposeInterface(spec,{style:"new"}), proposeInterface(spec,{style:"hybrid"})]; }
export function arenaJudge(cands: Design[], spec:string): { winner:Design; runnerUps:Design[]; reason:string } {
  const winner=cands[0]??{id:"w",title:spec}; return { winner, runnerUps: cands.slice(1), reason:`Arena judge picked ${winner.id} for ${spec.slice(0,12)} — best fit` };
}
export interface ReviewPlan { risks?: string[]; }
export function threeViewReview(plan: ReviewPlan, _design:Design): { verdict:"PASS"|"WARN"|"FAIL" } {
  if (plan?.risks?.includes("복구 플로우 없음")) return {verdict:"WARN"};
  return {verdict:"PASS"};
}

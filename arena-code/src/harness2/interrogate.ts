export interface InterrogateOpinion { model: string; role: string; ok: boolean; }
export function interrogate(tree:Record<string,string>, opts?:{models?:string[]; roles?:string[]}): { opinions:InterrogateOpinion[]; finalVerdict:"PASS"|"FAIL"; commonIssues:string[]; uniqueIssues:string[] } {
  const all=Object.values(tree).join("\n");
  const hasTODO=/TODO|FIXME/.test(all);
  const hasAny=/:\s*any\b/.test(all);
  const issues:string[]=[];
  if (hasTODO) issues.push("TODO 잔존");
  if (hasAny) issues.push("any 사용");
  const models=opts?.models??["claude","grok"]; const roles=opts?.roles??["simplicity","correctness","compliance"];
  const opinions=models.flatMap(m=> roles.map(r=>({model:m, role:r, ok:!hasTODO})) );
  const finalVerdict = hasTODO? "FAIL":"PASS";
  return { opinions, finalVerdict, commonIssues: hasTODO?issues:[], uniqueIssues: hasAny?["any 경고"]:[] };
}
export function qaCheck(tree:Record<string,string>): { ok:boolean; mismatches:string[] } {
  const hasDisplay=Object.values(tree).some(v=>/display\(\)/.test(v));
  const hasNotify=Object.values(tree).some(v=>/notify\(\)/.test(v));
  if (hasDisplay && hasNotify) return { ok:false, mismatches:["display vs notify 불일치: 알림 조건 누락"] };
  if (hasDisplay && !hasNotify) return { ok:false, mismatches:["display만 있고 notify 없음 — 표시 조건 불일치"] };
  return { ok:true, mismatches:[] };
}

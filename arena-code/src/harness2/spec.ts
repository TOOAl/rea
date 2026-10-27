export interface Constitution { principles: string[]; constraints: string[]; raw: string }
export function parseConstitution(text: string): Constitution|null {
  if (!text.trim()) return null;
  const lines=text.split("\n");
  const principles: string[]=[]; const constraints:string[]=[];
  for (const l of lines){ const t=l.trim(); if (/^[-*]\s+/.test(t)){ const c=t.replace(/^[-*]\s+/,""); if (/제약|제약조건|must|not/i.test(c)) constraints.push(c); else principles.push(c);} }
  if (!principles.length && !constraints.length) return null;
  return { principles: principles.length?principles:["원칙"], constraints, raw:text };
}
export interface SpecDoc { title: string; rawSpec: string; constitution?: Constitution|null }
export function buildSpecDoc(args:{ rawSpec:string; title?:string; constitutionText?:string }): SpecDoc {
  return { title: args.title??"Spec", rawSpec: args.rawSpec, constitution: args.constitutionText?parseConstitution(args.constitutionText):null };
}
export function clarifySpec(doc: SpecDoc): string[] {
  const miss:string[]=[];
  if (!/임의 배정|random/i.test(doc.rawSpec)) miss.push("임의 배정 기준이 모호함 — 무작위 금지 여부 명시 필요");
  if (!/알림|notify/i.test(doc.rawSpec)) miss.push("알림 조건 누락");
  return miss;
}
export function validateSpecDoc(doc: SpecDoc): { warnings:string[] } {
  const w:string[]=[];
  if (!doc.constitution) w.push("constitution 없음 — 헌법 원칙 필요");
  if (doc.rawSpec.length<5) w.push("spec 너무 짧음");
  return { warnings:w };
}
export function specToMarkdown(doc: SpecDoc): string { return `# ${doc.title}\n\n## Spec\n\n${doc.rawSpec}\n`; }
export function readSpecFromTree(tree: Record<string,string>): SpecDoc|null {
  const k=Object.keys(tree).find(k=> /spec\//i.test(k));
  if (!k) return null;
  const c=tree[k]; const m=/#\s*(.+)\n/.exec(c); return { title: m?.[1]?.trim()??"Spec", rawSpec: c.split("## Spec")[1]?.trim()??c, constitution:null };
}

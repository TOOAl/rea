export interface VerifyArtifact { diff: { modified: string[]; added: string[]; removed: string[] }; plan?: string; browserLog?: string; base: Record<string,string>; next: Record<string,string> }
export function buildVerifyArtifact(args: { base: Record<string,string>; next: Record<string,string>; plan?: string; browserLog?: string }): VerifyArtifact {
  const modified: string[]=[]; const added:string[]=[]; const removed:string[]=[];
  for (const k of Object.keys(args.next)) { if (k in args.base) { if (args.base[k] !== args.next[k]) modified.push(k); } else added.push(k); }
  for (const k of Object.keys(args.base)) if (!(k in args.next)) removed.push(k);
  return { diff:{modified,added,removed}, plan: args.plan, browserLog: args.browserLog, base: args.base, next: args.next };
}
export function formatVerifyReport(a: VerifyArtifact): string {
  return `# Verify Report\nmodified: ${a.diff.modified.join(",")||"none"}\nadded: ${a.diff.added.join(",")||"none"}\nplan: ${a.plan??""}\nbrowser: ${a.browserLog??""}`;
}
export function verifyPasses(a: VerifyArtifact): { ok:boolean } {
  const hasChange = a.diff.modified.length>0 || a.diff.added.length>0 || a.diff.removed.length>0;
  return { ok: hasChange };
}

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
export interface AntigravitySkill { name: string; description: string; hasReferences: boolean; references: string[]; path: string }
export function scanAntigravitySkills(opts: { workspaceRoot: string }): AntigravitySkill[] {
  const root = join(opts.workspaceRoot, ".agents/skills");
  if (!existsSync(root)) return [];
  const out: AntigravitySkill[]=[];
  try {
    for (const name of readdirSync(root)) {
      const dir = join(root, name);
      try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
      const md = join(dir, "SKILL.md");
      if (!existsSync(md)) continue;
      const content = readFileSync(md,"utf-8");
      const descM = /description:\s*(.+)/.exec(content);
      const refsDir = join(dir, "references");
      let refs: string[]=[]; let hasRefs=false;
      if (existsSync(refsDir)) { try { const files=readdirSync(refsDir); refs=files.map(f=> `references/${f}`); hasRefs=refs.length>0; } catch{} }
      out.push({ name, description: descM?.[1]?.trim()??"", hasReferences: hasRefs, references: refs, path: md });
    }
  } catch {}
  return out;
}
export function loadReference(workspaceRoot: string, skillName: string, refPath: string): string {
  try { return readFileSync(join(workspaceRoot, ".agents/skills", skillName, refPath),"utf-8"); } catch { return ""; }
}
export function buildSkillsIndexPrompt(skills: AntigravitySkill[]): string { return skills.map(s=> `- ${s.name}: ${s.description} (refs: ${s.references.join(",")||"none"})`).join("\n"); }
export function cacheKeyForArgon(system: string, prompt: string): string { const h=createHash("sha256").update(system+"\n"+prompt).digest("hex").slice(0,12); return `argon-cache-${h}`; }
export function resolveAgentsFile(dir: string): string { const a=join(dir,"AGENTS.md"); const b=join(dir,"AGENT.md"); if (existsSync(a)) return a; if (existsSync(b)) return b; return a; }

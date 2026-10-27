export interface Plan { structure: string[]; specRef: string }
export function planFromSpec(spec: string): Plan {
  const parts = spec.split(/과|와|하며|그리고|,|그리고/).map(s=>s.trim()).filter(Boolean);
  const structure = parts.length>=2? parts.map((p,i)=>`src/${i+1}.ts:${p.slice(0,12)}`) : ["src/a.ts","src/b.ts","src/c.ts"];
  return { structure, specRef: spec };
}
export interface Task { id:string; title:string; dependsOn:string[] }
export function tasksFromPlan(plan: Plan, _spec:string): Task[] {
  return plan.structure.map((s,i)=>({id:`t${i+1}`, title:s, dependsOn: i===0?[]:[`t${i}`]}));
}
export function tasksInOrder(tasks: Task[]): Task[] { return [...tasks].sort((a,b)=> parseInt(a.id.slice(1))-parseInt(b.id.slice(1))); }
export function wayfinderSplit(tasks: Task[], size:number): Task[][] {
  const g: Task[][]=[]; for(let i=0;i<tasks.length;i+=size) g.push(tasks.slice(i,i+size)); return g;
}
export function planToMarkdown(p: Plan): string { return `# Plan\n${p.structure.map(s=>`- ${s}`).join("\n")}`; }
export function tasksToMarkdown(ts: Task[]): string { return `| t1 | title |\n|---|---|` + ts.map(t=>`\n| ${t.id} | ${t.title} |`).join(""); }

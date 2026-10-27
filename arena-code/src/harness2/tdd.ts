export function classifyGoal(text:string): { playbook:string } { return { playbook: /버그|오류|fix|bug/i.test(text)?"bugfix":"feature" }; }
export function selectPlaybook(text:string): { steps:string[]; playbook:string } { const c=classifyGoal(text); return { steps:["1. 실패 테스트","2. 최소 구현","3. 리팩터","4. 회고"], playbook:c.playbook }; }
export function tddCycle(spec:string): { steps:{phase:string; expectFail:boolean}[]; subAgents:number; playbook:string } {
  const large = spec.length>30;
  return { steps:[{phase:"red", expectFail:true},{phase:"green", expectFail:false},{phase:"refactor", expectFail:false}], subAgents: large?3:1, playbook:"feature" };
}
export function tddCheck(tree:Record<string,string>): { hasTestsFirst:boolean; testFiles:string[] } {
  const testFiles=Object.keys(tree).filter(k=>/\.test\.|\.spec\./.test(k));
  return { hasTestsFirst: testFiles.length>0, testFiles };
}
export function potatoCycle(spec:string, _criteria:string): { playbook:string; steps:any[] } { return { playbook: classifyGoal(spec).playbook, steps:[1,2,3] }; }

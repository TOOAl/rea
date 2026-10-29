export interface LongRunBenchmark { id: string; goal: string; }
export interface LongRunProposal { id: string; }
export interface LongRunShipped { title: string; }
export interface LongRunRejected { id: string; }
export interface LongRunResult { benchmarks: LongRunBenchmark[]; proposals: LongRunProposal[]; shipped: LongRunShipped[]; rejected: LongRunRejected[]; prBody: string; selfAudit: string }
export function simulateLongRun(goal: string): LongRunResult {
  const benchmarks=[1,2,3,4,5].map(i=>({id:`b${i}`, goal}));
  const proposals=[1,2,3,4,5,6].map(i=>({id:`p${i}`}))
  const shipped=[ {title:"세션 이벤트 필터 최적화"}, {title:"import 지연 로딩 최적화"} ];
  const rejected=[1,2,3,4].map(i=>({id:`r${i}`}));
  return { benchmarks, proposals, shipped, rejected, prBody:"before → after numbers", selfAudit:"3분 전 자가점검 완료" };
}
export function longRunSummary(r: LongRunResult): string { return `${r.shipped.length} shipped, ${r.rejected.length} rejected — benchmarks ${r.benchmarks.length}`; }

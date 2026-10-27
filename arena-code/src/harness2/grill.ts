export interface GrillQuestion { id: string; question: string; category: string }
export function grillSpec(spec: string, opts?: { maxQuestions?: number; includeOfficeHours?: boolean }): GrillQuestion[] {
  const max = opts?.maxQuestions ?? 5;
  const base: GrillQuestion[]=[
    {id:"q1", question:"이 기능의 핵심 가치는 무엇이며, 사용자가 체감하는 성공 지표는?", category:"value"},
    {id:"q2", question:"실패 시 롤백 전략과 데이터 복구 플로우는?", category:"reliability"},
    {id:"q3", question:"인증/인가가 필요한 경계는 어디이며, 권한 모델은?", category:"security"},
    {id:"q4", question:"성능 병목과 확장 한계는 어디에서 발생하나?", category:"performance"},
    {id:"q5", question:"테스트 커버리지와 검증 기준은 무엇인가?", category:"quality"},
    {id:"q6", question:"운영 모니터링과 알림 체계는 어떻게 구성하나?", category:"ops"},
    {id:"q7", question:"외부 의존성과 장애 전파 경로는?", category:"dependency"},
    {id:"q8", question:"개인정보와 감사 로그 보관 정책은?", category:"compliance"},
  ];
  let out = base.slice(0, max);
  // security 강제 포함 if spec lacks auth
  const lower=(spec||"").toLowerCase();
  if (!/auth|인증|권한|로그인/i.test(spec||"") && !out.some(o=>o.category==="security")) {
    out[2]={id:"q3-sec", question:"보안: 인증 없는 기능인데 익명 접근 제어는 어떻게 하나?", category:"security"};
  }
  if (opts?.includeOfficeHours) {
    out = [...out, {id:"office-1", question:"오피스아워: 이해관계자 우려는 무엇인가?", category:"office"},
      {id:"office-2", question:"오피스아워: 예산·일정 합의는 되었나?", category:"office"},
      {id:"office-3", question:"오피스아워: 반대 의견 수렴 절차는?", category:"office"}].slice(0, max);
    // ensure at least one office question included by replacing last
    if (!out.some(o=>o.id.startsWith("office-"))) out[max-1]={id:"office-1", question:"오피스아워: 이해관계자 우려는?", category:"office"};
  }
  return out.slice(0,max);
}
export function officeHoursGate(reason: string): { needToBuild:boolean; questions: GrillQuestion[] } {
  const neg = /필요 없음|이미 있음|대안 충분|굳이/i.test(reason);
  return { needToBuild: !neg, questions: grillSpec(reason,{maxQuestions:3}) };
}
export function interviewQuestion(spec: string): { question:string } {
  if (/담당자/.test(spec)) return { question:"담당자 배정 기준은 무엇이며, 부재 시 대체자는?" };
  return { question:`${spec||"기능"}에 대해 담당자 관점에서 질문: 책임자는 누구인가?` };
}

/**
 * History Genius 30 — 01 문서 30인 8분야×4단 서술 + 52참고
 * 각 30인은 “확인된 성과 → 해석 → 조건 → 한계”를 그대로 노출, 영웅 서사 제거
 */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";

export interface HistoryGenius {
  id: string;
  name: string;
  field: string;
  period: string;
  achievement: string;
  interpretation: string;
  condition: string;
  limit: string;
}

export const HISTORY_30: HistoryGenius[] = [
  // 수학 4
  { id: "hist-archimedes", name: "아르키메데스", field: "수학", period: "기원전 287~212", achievement: "구적·원주율 상하한·평형·부력, 소진법 정교화", interpretation: "기하 엄밀성+역학적 직관 연결, 분해·비교로 증명 가능 여부 판단", condition: "그리스 기하학 축적·동시대 교류", limit: "소진법≠현대 미적분 완성, 유레카 일화≠증거, 전쟁기계 일화 구분" },
  { id: "hist-madhava", name: "마드하바", field: "수학", period: "14~15세기 케랄라", achievement: "삼각·역탄젠트 무한급수·원주율, 케랄라 학파 중심", interpretation: "유한→무한 합으로 함수 다루기, 유럽 단일 경로 교정", condition: "천문 계산·학파 계승, 후대 기록 복원", limit: "저작 소실·귀속 불확실, 유럽 전파 단정 금지" },
  { id: "hist-ramanujan", name: "라마누잔", field: "수학", period: "1887~1920", achievement: "정수론·분할수·무한급수·연분수 수첩", interpretation: "관계 예상·다량 명제 생성, 발견 직관≠정당화 동시", condition: "독학+수학서·후원·하디 협업·검증", limit: "미완성 증명≠완성, 종교 설명≠과학 기제" },
  { id: "hist-noether", name: "에미 노터", field: "수학", period: "1882~1935", achievement: "추상대수 환·아이디얼 구조화, 대칭·보존량 정식화", interpretation: "개별 계산→공통 구조·조건 찾기, 언어 재설계", condition: "괴팅겐 공동체·제자 교류, 성별 장벽·추방", limit: "대칭 무제한 확대 부정확, 예외성 강조로 기여 가림 금지" },
  // 물리·화학·광학 4
  { id: "hist-alhaytham", name: "이븐 알하이삼", field: "물리·화학·광학", period: "965~1040", achievement: "광학서 기하·실험 분석, 눈으로 들어오는 빛", interpretation: "감각→관찰·장치·수학 분해, 당연함→검토 가능 질문", condition: "그리스 전통 비판·아랍 학술·번역 주석", limit: "유일 과학방법 발명자 아님, 분야 실험≠제도 전체" },
  { id: "hist-newton", name: "뉴턴", field: "물리·화학·광학", period: "1643~1727", achievement: "프린키피아 운동·중력 수학적 연결, 미적분·광학", interpretation: "지상·천체 통합→예측, 계산법+현상 연결", condition: "갈릴레이·케플러·할리 자극·출판, 라이프니츠 독립", limit: "사과 일화≠이론, 고전역학 유효범위, 모든 판단 참 아님" },
  { id: "hist-einstein", name: "아인슈타인", field: "물리·화학·광학", period: "1879~1955", achievement: "광양자·브라운·특수·일반 상대성, 광전효과 노벨 1921", interpretation: "시간·동시성·전제 재검토, 사고실험≠정식화·검증 대체 아님", condition: "전자기·열역학·수학과 연결", limit: "노벨≠상대성 가치, 상상력≠훈련 불필요, 상대성≠모든 주장 참" },
  { id: "hist-curie", name: "마리 퀴리", field: "물리·화학·광학", period: "1867~1934", achievement: "방사성 정량·폴로늄·라듐 분리, 베크렐 선행·피에르 공동", interpretation: "불일치 측정값→새 물질 근거, 분리·측정·해석 결합", condition: "화학 처리·계측·공동·실험실 운영·장벽", limit: "방사능 혼자 발견 아님, 노출 희생 모방 금지, 안전 부족≠필수" },
  // 생물·의학 3
  { id: "hist-darwin", name: "다윈", field: "생물·의학", period: "1809~1882", achievement: "종의 기원 자연선택 누적 논증, 월리스 공동 1858", interpretation: "관찰 한방≠장기 누적 논증(사육·분포·변이)", condition: "여행·수집가·편지망·경제 조건·반론 포함", limit: "진화 전체 최초 아님, 유전 한계, 적자≠도덕 우월" },
  { id: "hist-cajal", name: "카할", field: "생물·의학", period: "1852~1934", achievement: "뉴런 독립 세포 단위 관찰, 골지 염색 변형, 1906 노벨 공동", interpretation: "도구+관찰 유리 조직 선택·그림으로 비교, 시각화=추론 도구", condition: "염색 기술 조건, 같은 기법 다른 해석", limit: "광학현미경≠전자현미경 모든 접합, 모든 후속 그림 속 아님" },
  { id: "hist-tu", name: "투유유", field: "생물·의학", period: "1930~", achievement: "전통 기록→추출·실험 아르테미시닌, 2015 노벨", interpretation: "믿거나 버리기→시험 가설, 문헌·조건·효능 연결", condition: "국가 사업·팀·제제·임상·보급 집단", limit: "전통 전체 유효 증명 아님, 전 과정 혼자 아님, 자기실험 오늘 기준 아님" },
  // 계산·공학 4
  { id: "hist-turing", name: "튜링", field: "계산·정보·공학", period: "1912~1954", achievement: "계산 형식화·보편 모델, 에니그마 봄브 참여", interpretation: "계산 조건·한계 질문, 이론↔구체 오감", condition: "처치 독립·폴란드 선행·웰치먼·블레츨리 조직", limit: "보편≠모든 수학 해결, 혼자 승리 아님, 박해≠창의 원천" },
  { id: "hist-shannon", name: "섀넌", field: "계산·정보·공학", period: "1916~2001", achievement: "1948 통신 이론 정보량·부호화·채널 한계", interpretation: "의미 분리→선택·확률, 넣지 않을 것 결정", condition: "통신 선행·벨연구소, 구현은 후속 필요", limit: "통신 정보량≠진실·깊이·가치, 인간 지식 전체 설명 아님" },
  { id: "hist-hopper", name: "호퍼", field: "계산·정보·공학", period: "1906~1992", achievement: "A-0·FLOW-MATIC·COBOL 기여, 연결·적재 선구", interpretation: "기계 절차→사람 쓰기 쉬운 도구, 표준·교육·조정이 창의 일부", condition: "팀·기업·해군·표준화 협력, 단독 아님", limit: "버그 용어 최초 아님(Cambridge 기록), 팀 기록 vs 후대 일화 구분" },
  { id: "hist-watt", name: "와트", field: "계산·정보·공학", period: "1736~1819", achievement: "뉴커먼 열손실 별도 응축기 개선→산업 장치", interpretation: "상충 요구 분리(병목 찾아 바꾸기)≠새 기계 상상", condition: "모델 시행착오·정밀 제작·볼턴 사업", limit: "증기기관 최초 아님, 발명·특허·생산·채택 구분, 혁명 전체 환원 금지" },
  // 철학·사회 4
  { id: "hist-confucius", name: "공자", field: "철학·사회사상", period: "기원전 551~479", achievement: "인·예·수양·모범, 동아시아 영향(편찬 전승)", interpretation: "관계·실천으로 사람 형성, 덕·의례·통치 사고", condition: "의례·시·역사 전통·제자·후대 주석·제도", limit: "논어 전 문장 직필 아님, 모든 제도 본인 의도 아님, 위계 정당성 검토 대상" },
  { id: "hist-aristotle", name: "아리스토텔레스", field: "철학·사회사상", period: "기원전 384~322", achievement: "논리·윤리·정치·생물 분석·분류 체계", interpretation: "대상별 질문·설명 유형 구별, 구획·논증 형식 창조", condition: "플라톤 학파·학문 공동체·관찰 자료", limit: "자연학 수정됨, 노예·성별 정당화 부당, 영향≠진실/윤리 정당" },
  { id: "hist-khaldun", name: "이븐 할둔", field: "철학·사회사상", period: "1332~1406", achievement: "무깟디마 역사 신뢰·결속·통치·문명 분석", interpretation: "사건→사회·경제 가능 여부 따지기, 역사비판+사회 설명", condition: "정치·행정 경험·이슬람 전통", limit: "현대 사회학 단독 창시 아님, 모든 사회 법칙 아님, 닮음≠직접 계승" },
  { id: "hist-smith", name: "애덤 스미스", field: "철학·사회사상", period: "1723~1790", achievement: "도덕감정론·국부론 분업·교환·제도·부 분석", interpretation: "개인 동기→의도 못한 사회적 결과·제도 연결, 윤리·법과 분리 안 함", condition: "스코틀랜드 계몽·흄·상업사회 관찰", limit: "이기심→공익·정부 불필요 오독, 수리경제학 완성 아님, 모든 정책 승인 아님" },
  // 문자·문학 5
  { id: "hist-sejong", name: "세종", field: "문자·문학", period: "1397~1450", achievement: "1443 언문 28자 친제(세종실록), 1446 훈민정음 해례·정인지 참여", interpretation: "소리 분석→학습 문자 설계, 정의·구조·설명·보급 연결", condition: "왕 기여+국가 인력·자료·출판·교육, 창제 vs 해설·보급 구분", limit: "협업 강조≠이름만, 혼자 전체 아님, ‘유일 과학 문자’ 무기준 찬사 금지" },
  { id: "hist-murasaki", name: "무라사키", field: "문자·문학", period: "10세기말~11세기초", achievement: "겐지 이야기 관계·시간·지위·기억 서사", interpretation: "감정 단선 설명≠관계·시간 속 드러내기, 통찰≠마음 읽기", condition: "귀족 교육·여성 필사·궁정 후원", limit: "세계 최초 소설 정의 의존, 생몰·전승 불확실, 최초 타이틀보다 성취" },
  { id: "hist-shakespeare", name: "셰익스피어", field: "문자·문학", period: "1564~1616", achievement: "비극·희극·역사·시, 배우·주주·극작, 플레처 공동", interpretation: "욕망·해석 충돌 장면화, 누가·언제·누구에게가 장치", condition: "선행 이야기·동료·배우·관객", limit: "무에서 창조 아님, 귀속 논쟁≠전체 부정, 통찰≠인격 증명" },
  { id: "hist-tagore", name: "타고르", field: "문자·문학", period: "1861~1941", achievement: "벵골어 시·노래·산문·번역·1913 노벨", interpretation: "서정·음악 결합·지역↔국제 오가기", condition: "벵골 전통·교육·번역·국제 소개", limit: "서구 명성≠벵골어 평가, 일부 시≠전체, 노벨≠유일 계량" },
  { id: "hist-sorjuana", name: "소르 후아나", field: "문자·문학", period: "1648/51~1695", achievement: "시·극·산문·답신 여성 교육 옹호", interpretation: "수사·운율·논증으로 권위 구조 되묻기, 제약 속 주체성", condition: "수도원·궁정 후원=기회+제약, 학습 의지+제도", limit: "어린 일화≠검사, 오늘 범주 소급 금지, 영웅 서사만 금지" },
  // 미술·건축 3
  { id: "hist-leonardo", name: "레오나르도", field: "미술·건축", period: "1452~1519", achievement: "회화+해부·기계·자연 드로잉·코덱스 아룬델 낱장 묶음", interpretation: "그리기+설명 결합, 그림=질문·비교·모델링 수단", condition: "공방·후원·장인 기술·재료", limit: "스케치≠실작·보급 검증, 닮은 모양≠현대 기술 완성, 노트 영향≠작품 영향" },
  { id: "hist-sinan", name: "시난", field: "미술·건축", period: "약1490~1588", achievement: "쉴레이마니예·셀리미예 돔·채광·공간, 수석 건축가", interpretation: "버티기+개방·통일 통합 설계", condition: "비잔틴·오스만·재정·협업", limit: "모든 건물 직접 설계 아님, 현대 공학 그대로 아님, 수량≠능력 점수" },
  { id: "hist-hokusai", name: "호쿠사이", field: "미술·건축", period: "1760~1849", achievement: "후가쿠 36경·파도(1830~32·70세)·판화·삽화 변주", interpretation: "크기·시점·운동 바꿔 새로 보이게, 축적 실험", condition: "상업 출판·판각·인쇄·출판 분업(Met)", limit: "판화≠혼자 단일 물건, 나이 성과≠만인 법칙" },
  // 음악 3
  { id: "hist-bach", name: "바흐", field: "음악", period: "1685~1750", achievement: "대위·화성·성악·기악 방대, 라이프치히 교회", interpretation: "성부 독립→전체 형식, 제약 아래 일관 흐름", condition: "집안·훈련·선행·수요·연주 인력", limit: "대위·조성 최초 아님, 편곡·재작업 포함, 악보≠IQ·수학 점수" },
  { id: "hist-mozart", name: "모차르트", field: "음악", period: "1756~1791", achievement: "오페라·협주·교향·실내악, 조기 교육·여행", interpretation: "형식·극적 상황·선율·악기 조직, 조숙+성숙 구성", condition: "레오폴트 교육·난네를·도시·양식·연주자", limit: "전곡 완성 떠오르기 신화 경계, 초기 필적 부친, 수정 적음≠전곡 수정 없음" },
  { id: "hist-armstrong", name: "암스트롱", field: "음악", period: "1901~1971", achievement: "핫5·핫7 리듬·음색·즉흥 확장, 녹음 자료", interpretation: "재생 넘어 시간·음색으로 발화, 즉흥≠우연", condition: "뉴올리언스 전통·올리버·앙상블·산업", limit: "재즈 혼자 발명 아님, 합주 기여 유지, 녹음≠모든 음악 우열" },
];

function mkOutput(input: any, brain: any, idea: string, confidence: number, tags: string[]) {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}
abstract class BaseHistBrain implements Brain {
  abstract id: string; abstract role: BrainRole; abstract layer: BrainLayer;
  abstract name: string; abstract description: string;
  version = "2.22.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

// 8분야 대표 8개로 압축 — 각 분야 1명씩 창의 유형 대표 (전부 노출하되 brains 수는 관리)
const FIELD_REPS: Record<string, string[]> = {
  "수학": ["hist-noether", "hist-ramanujan"],
  "물리·화학·광학": ["hist-newton", "hist-curie"],
  "생물·의학": ["hist-darwin", "hist-cajal"],
  "계산·정보·공학": ["hist-turing", "hist-hopper"],
  "철학·사회사상": ["hist-smith", "hist-khaldun"],
  "문자·문학": ["hist-sejong", "hist-shakespeare"],
  "미술·건축": ["hist-leonardo", "hist-hokusai"],
  "음악": ["hist-bach", "hist-armstrong"],
};

export function createHistoryBrains(): Brain[] {
  const brains: Brain[] = [];
  for (const [field, ids] of Object.entries(FIELD_REPS)) {
    const reps = ids.map(id => HISTORY_30.find(h => h.id === id)!).filter(Boolean);
    const repNames = reps.map(r => r.name).join("·");
    const brain = new (class extends BaseHistBrain {
      id = `genius-history-${field}`; role = "genius" as const; layer = 4 as const;
      name = `${field} 천재(역사)`; description = `${field} 역사 천재 ${repNames} — 확인된 성과·조건·한계로 배우기`;
      async think(input: BrainInput): Promise<BrainOutput> {
        const matched = reps.map(r => `【${r.name} ${r.period}】 ${r.achievement} → 해석: ${r.interpretation} | 조건: ${r.condition} | 한계: ${r.limit}`).join("\n");
        return mkOutput(input, this,
          `📚 ${field} 역사 천재 — ${repNames}\n${matched}\n` +
          `→ 작업 원리: 좁히기·바꾸기·분리·틀릴 수 있게·기억/찾기 분리·혼자+검토 (01 6.1)\n` +
          `→ 모방 금지: 빈곤·박해·수면부족 필수 아님 (01 6.2)`,
          0.83, ["history", field, ...ids]);
      }
    })();
    brains.push(brain);
  }
  return brains;
}

export class HistoryRegistry {
  static all(): HistoryGenius[] { return HISTORY_30; }
  static byField(field: string): HistoryGenius[] { return HISTORY_30.filter(h => h.field === field); }
  static get(id: string): HistoryGenius | undefined { return HISTORY_30.find(h => h.id === id); }
  static compareTable(): string {
    return `| 유형 | 인물 예 | 실제로 다른 점 |\n` +
      `| 구조·표상 재설계 | 노터·튜링·섀넌 | 대수·계산 정의·통신 확률 모형은 다른 추상화 |\n` +
      `| 여러 증거 통합 | 뉴턴·다윈·퀴리 | 연역·역사 추론·실험 비중 다름 |\n` +
      `| 관찰을 보이게 | 카할·레오나르도 | 검증 표상≠조형 탐구 |\n` +
      `| 복잡 형식 통제 | 바흐·무라사키·셰익스피어 | 음향·시간·언어 제약 다름 |\n` +
      `| 실용화·조정 | 와트·호퍼·시난·세종 | 장치·표준·건축·문자 채택 조건 다름 |\n` +
      `| 전통 변형 | 알하이삼·타고르·호쿠사이·암스트롱 | 활용≠독창성 부재 |`;
  }
}

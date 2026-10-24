/**
 * Visual Engine — Cinematic 5레이어 + 신경미학 + 음악 + Dual-Track 이식
 * 원전: Deakins/Lubezki/Doyle/Storaro/Fraser/정정훈(5레이어), Chatterjee(Vessel/Reber/Berlyne), Cowan/WCAG(Jonauskaite), Music(Yerkes-Dodson/Baddeley)
 * 등급: A(표준)·B(유력)·C(단일)·D(무검증)·H(휴리스틱)·U(비검증)·X(부정확) — 수정판 §5 준용
 * 팩트체크: C1-C12, N1-N12는 주석에 라벨, 수치·명언·시장규모는 H/U/X로 격리
 */
export type Grade = "A" | "B" | "C" | "D" | "H" | "U" | "X";
export type BudgetTier = "0원" | "300만원" | "3000만원+" | "unknown";
export type PurposeZone = "A:수행" | "B:감흥" | "unknown";

export interface LightInfo {
  /** “이 빛은 어디서 왔는가?” — 모든 빛의 출처 질문 (Deakins Motivated Lighting) */
  motivationSource: string;
  subtractiveFirst: boolean; // 빼기가 먼저다 — Black Flag 2개 먼저
  coveLight: boolean; // 0원 재현 가능 여부
  budgetAlt: string; // 예산별 대안
  safetyNote?: string;
  grade: Grade; // H: 작가 휴리스틱
}

export interface ColorInfo {
  /** 3색 가설 — “이번 연습의 제약” (H) */
  constrained: boolean;
  paletteHint: string; // 60:30:10은 시작 가설, 보장 아님
  ratio: "60:30:10";
  storyLink?: string; // 인물 기억과 연결 여부 — DMN 활성화 힌트
  grade: Grade;
}

export interface CompositionInfo {
  lensHint: string; // 포맷 병기 필수 — 예: 40mm@S35, 35-50mm 휴리스틱
  negativeSpace: string;
  threeLayers: boolean; // 전경-중경-배경
  squatTest: string; // 흐리게 봐도 위계 읽히는지 (저주파 윤곽)
  grade: Grade;
}

export interface MovementInfo {
  motivation: string; // 왜 움직이는가? — 감정/정보/긴장 동기
  ratioHeuristic: string; // 고정4:푸시1 같은 훈련용 제약 (H)
  grade: Grade;
}

export interface DepthInfo {
  techniques: string[]; // 가림·스케일·원근·명암·초점·패럴랙스·헤이즈 등
  hazeSafety: string; // MSDS·환기·승인 필수 — X/안전 라벨
  grade: Grade;
}

export interface MasteryRef {
  name: string;
  keyword: string;
  film: string;
}

export interface NeuroHint {
  triad: string; // 감각-감정-의미 삼원모델
  fluency: string; // 유창성 — 쉬울수록 선호, 단 지루 리스크
  arousalCurve: string; // Berlyne 역U자 — 최적점은 이동함
  attentionPath: string; // 1초 시선 → 다음 이동 경로
  dmnNote: string; // 자기참조·기억 연결이 감동으로
  grade: Grade;
}

export interface AudioInfo {
  hookOrFocus: "attention" | "focus" | "hybrid";
  bpm: string; // 60-90 vs 120-135
  lyrics: string; // 무가사 필수 여부 (음운루프 보호)
  noise?: string; // 핑크/브라운/화이트
  workflow: string; // 도파민스타터→딥워크→리셋→앵커링
  grade: Grade;
}

export interface AccessibilityInfo {
  contrastOK: boolean; // 4.5:1 / 3:1
  photosensitiveOK: boolean; // 플리커·급격 패턴 없음
  wcagNote: string;
  grade: Grade; // A: 표준
}

export interface VisualPacket {
  sceneSummary: string;
  light: LightInfo;
  color: ColorInfo;
  composition: CompositionInfo;
  movement: MovementInfo;
  depth: DepthInfo;
  motivation: string; // 숨은 6번째 요소 — 모든 레이어의 이유
  masters: MasteryRef[];
  purposeZone: PurposeZone;
  neuro: NeuroHint;
  audio: AudioInfo;
  accessibility: AccessibilityInfo;
  evidenceGrades: Record<string, Grade>;
  warnings: string[]; // validate() 결과 — A급 위반·3대 오류·안전
  validated: boolean;
  dualTrackWorksheet: string; // 이원화 워크시트 요약
  budgetTier: BudgetTier;
}

// ── 6거장 레퍼런스 풀 (원문 02) ──
const MASTERS: MasteryRef[] = [
  { name: "Deakins", keyword: "Motivated·Subtractive·Cove", film: "Blade Runner 2049/1917" },
  { name: "Lubezki", keyword: "Natural Light·Magic Hour·Wide", film: "The Revenant/Birdman" },
  { name: "Doyle", keyword: "Neon·Step-Printing·Improv", film: "화양연화/중경삼림" },
  { name: "Storaro", keyword: "Color Philosophy·Spectrum", film: "Apocalypse Now/마지막황제" },
  { name: "Fraser/van Hoytema", keyword: "Large Format·IMAX·Naturalistic Sci-Fi", film: "Dune/Oppenheimer" },
  { name: "정정훈/홍경표", keyword: "대비·대칭·공간=계급", film: "Oldboy/기생충" },
];

export class VisualEngine {
  analyze(scenePrompt: string, contextHint = ""): VisualPacket {
    const lower = `${scenePrompt} ${contextHint}`.toLowerCase();
    const scene = scenePrompt.slice(0, 80);

    // ── Budget Tier ──
    let budgetTier: BudgetTier = "unknown";
    if (/0원|스마트폰|아이폰|갤럭시|무료/i.test(contextHint + scenePrompt)) budgetTier = "0원";
    else if (/300만|fx3|fx30|a7/i.test(contextHint + scenePrompt)) budgetTier = "300만원";
    else if (/3000만|arri|venice|alexa|imax/i.test(contextHint + scenePrompt)) budgetTier = "3000만원+";

    // ── Purpose Zone (Bridge: Berlyne) ──
    const isTask = /결제|설정|온보딩|대시보드|입력|학습|독서|논문|코딩|회의|발표/i.test(lower);
    const isBrand = /브랜드|랜딩|캠페인|전시|404|히어로|신제품|광고|브이로그|유튜브/i.test(lower);
    let purposeZone: PurposeZone = "unknown";
    if (isTask && !isBrand) purposeZone = "A:수행";
    else if (isBrand) purposeZone = "B:감흥";
    else if (/수행|효율|빠르게/i.test(lower)) purposeZone = "A:수행";
    else if (/감성|매력|브랜딩|기억/i.test(lower)) purposeZone = "B:감흥";

    // ── Light (5레이어 1) — H 휴리스틱 라벨 ──
    const hasWindow = /창문|창광|햇빛|자연광|일몰|매직아워|해운대|광안리/i.test(scenePrompt + contextHint);
    const light: LightInfo = {
      motivationSource: hasWindow ? "창문광(주광) + 프랙티컬 1개 — Deakins 원칙" : "프랙티컬(전구/네온)을 출처로 지정 — 출처 없는 빛 끄기",
      subtractiveFirst: true,
      coveLight: true,
      budgetAlt: budgetTier === "0원" ? "흰 광목천 3m + Aputure 60d 바운스 + 검은천 1개(그림자 조각) — 15만원 70% 재현(H)" : budgetTier === "300만원" ? "Aputure 60d + Light Dome Mini + PavoTube, DMX 수동" : "Aputure 600d + Skypanel X + DMX + DF-50 헤이저",
      safetyNote: lower.includes("헤이즈") || lower.includes("가습기") ? "헤이즈: MSDS·환기·승인 필수 — 임의 스프레이 금지(X/안전)" : undefined,
      grade: "H",
    };

    // ── Color (5레이어 2) ──
    const isNeon = /네온|홍콩|전포|감천|밤거리/i.test(scenePrompt + contextHint);
    const isClassic = /기생충|마지막황제|화양연화/i.test(scenePrompt + contextHint);
    const color: ColorInfo = {
      constrained: true,
      paletteHint: isNeon ? "빨강·초록·노랑 네온 3색(H) — 색이 곧 대사(Doyle)" : isClassic ? "주조60+보조30+액센트10 가설(H) — 예: 베이지/초록/빨강(기생충)" : "의상·벽·소품 3색 통일 후 Coolors 테스트 — LUT 전 평탄 Log 촬영",
      ratio: "60:30:10",
      storyLink: purposeZone === "B:감흥" ? "반복 모티프를 인물 기억과 연결 — 강한 감동은 DMN 관여(B)" : "명도 대비로 정보 분리 — 형상-배경 분리(A)",
      grade: "H",
    };

    // ── Composition (5레이어 3) ──
    const composition: CompositionInfo = {
      lensHint: /기생충|반지하|계급/i.test(lower) ? "21mm@S35(저층 광각) vs 85mm@S35(고층 망원) — 포맷 병기 필수, 렌즈수치 단독 일반화 금지(U)" : "35-50mm@S35 선호(H) — 스마트폰 1x 24mm는 1.5x 크롭 고려, 왜곡·압축은 카메라 위치가 결정",
      negativeSpace: isTask ? "중앙 정렬 + 충분한 여백 — 인지부하↓" : "Negative space로 외로움·권력 표현(Doyle/홍경표)",
      threeLayers: true,
      squatTest: "스쿼트(흐리게) 테스트: 윤곽만 봐도 위계 읽히는지 확인(B)",
      grade: "B",
    };

    // ── Movement (5레이어 4) ──
    const hasDrone = /드론|fpv|avata|inspire/i.test(lower);
    const hasGimbal = /짐벌|gimbal|rs3|rs4/i.test(lower);
    const movement: MovementInfo = {
      motivation: hasDrone ? "드론: 정보 갱신(지형·공간)·긴장 동기 있을 때만 — 과시성 FPV는 3초에 질림" : hasGimbal ? "짐벌 슬로우 푸시 20% — 감정이 움직일 때만, 나머진 삼각대 고정" : "고정 90% 훈련용 제약(H) — 5컷 중 4고정 1무빙, 대사·감정과 동기화",
      ratioHeuristic: "고정70%+푸시20%+드론10%는 훈련용 제약(H) — 장르·플랫폼·서사에 따라 달라짐, 비율 보장 아님(U)",
      grade: "H",
    };

    // ── Depth (5레이어 5) ──
    const depthTechs: string[] = ["가림(occlusion)", "스케일·원근선", "명암·색 대비", "초점·모션 패럴랙스"];
    if (/헤이즈|안개|연기|먼지|비|가습기/i.test(scenePrompt + contextHint)) depthTechs.push("대기 산란(헤이즈) — 안전 전제");
    if (/나뭇잎|커튼|유리|전경|식물/i.test(scenePrompt + contextHint)) depthTechs.push("전경 레이어(식물·유리)로 3단 레이어");
    const depth: DepthInfo = {
      techniques: depthTechs,
      hazeSafety: "승인 공연용 유체만, MSDS·환기·화재감지기·호흡기·결로 확인 — 임의 가습기 금지(X/안전)",
      grade: "H",
    };

    // ── Masters 매칭 (간단 휴리스틱: 키워드 1개라도 맞으면 해당 거장) ──
    let masters: MasteryRef[] = [];
    if (lower.includes("빛") || lower.includes("cove") || lower.includes("빼기") || lower.includes("조명")) masters.push(MASTERS[0]);
    if (lower.includes("자연광") || lower.includes("매직") || lower.includes("롱테이크") || lower.includes("광각")) masters.push(MASTERS[1]);
    if (lower.includes("네온") || lower.includes("홍콩") || lower.includes("즉흥") || lower.includes("핸드헬드")) masters.push(MASTERS[2]);
    if (lower.includes("색") || lower.includes("팔레트") || lower.includes("빨강") || lower.includes("파랑")) masters.push(MASTERS[3]);
    if (lower.includes("대형") || lower.includes("imax") || lower.includes("sf") || lower.includes("sf") || lower.includes("우주")) masters.push(MASTERS[4]);
    if (lower.includes("기생충") || lower.includes("계급") || lower.includes("공간") || lower.includes("한국")) masters.push(MASTERS[5]);
    if (masters.length === 0) masters = [MASTERS[0], MASTERS[3]]; // default

    // ── Neuro 힌트 (§08 삼원모델·유창성·예측·DMN) — B/H 라벨 ──
    const neuro: NeuroHint = {
      triad: "감각-운동(색·형태·깊이·얼굴) + 감정-가치(쾌/보상)·의미-지식(서사·문화) 3체계 상호작용(B)",
      fluency: purposeZone === "A:수행" ? "유창성↑(명도대비·정렬·프로토타입) — 수행 목표선 유창성 우선(A~B)" : "적정 일탈로 정점 노리기 — 유창성↓+예측위반 한축, 해소 가능한 놀라움(B)",
      arousalCurve: "Berlyne 역U자: 너무 단순=지루, 너무 복잡=혼란 — 최적점은 전문성·친숙도·과제에 따라 이동, 고정값 아님(B)",
      attentionPath: "이 숏 1초 시선 → 다음 이동 경로 명시, 얼굴·움직임·대비 중 1개만 강조(현저성≠선호)",
      dmnNote: purposeZone === "B:감흥" ? "반복 모티프를 자기참조 기억과 연결 — 강한 감동은 DMN 동반(B)" : "정보 전달 숏은 DMN 자극 최소화, 실루엣·동선 명확히",
      grade: "B",
    };

    // ── Audio (music_focus) — Task-Audio Matrix ──
    const wantsHook = /숏폼|인트로|3초|관심|훅|hook|광고|트레일러/i.test(lower);
    const wantsFocus = /집중|코딩|독서|논문|몰입|딥워크|공부|디버깅|설계/i.test(lower);
    const wantsCreative = /브레인스토밍|아이디어|창의|디자인|기획/i.test(lower);
    const wantsRepetitive = /반복|라벨링|청소|운동|데이터/i.test(lower);
    let audio: AudioInfo;
    if (wantsHook && !wantsFocus) {
      audio = {
        hookOrFocus: "attention",
        bpm: "120-135 + 1-4kHz 보컬훅( Hey! ) + 0.1-0.2s 무음갭 → 드롭 — 도파민 예측오차(B)",
        lyrics: "전경(foreground) — 짧은 보컬찹 허용, 후킹 3음 반복(Earworm)",
        noise: "완벽 무음보다 50-65dB 배경 — 확률적 공명(B)",
        workflow: "도파민 스타터 1곡(120BPM) → 본편 훅 → 0.15s gap",
        grade: "B",
      };
    } else if (wantsFocus || lower.includes("코딩") || lower.includes("수학")) {
      const hasLyrics = /가사|보컬|노래|k-pop|팝송/i.test(lower);
      audio = {
        hookOrFocus: "focus",
        bpm: wantsRepetitive ? "120-135(반복작업 각성↑)" : wantsCreative ? "Rubato·모달재즈/네오클래시컬(확산사고)" : "60-90(안정시 심박 동조, Yerkes-Dodson sweet spot)",
        lyrics: hasLyrics ? "⚠️ 음운루프 충돌 — 가사 제거 필수(A) — 작업효율 20-30%↓" : "무가사 필수(A) — 50-60dB, 선율 굴곡 최소",
        noise: "브라운노이즈(ADHD 과각성 진정) / 핑크(알파 8-12Hz) / 화이트(마스킹) 중 선택",
        workflow: "0-3분 도파민스타터 → 4-50분 딥워크(무가사 70BPM+브라운) → 50-60분 무음 리셋 → 앵커링",
        grade: "A",
      };
    } else {
      audio = {
        hookOrFocus: wantsHook && wantsFocus ? "hybrid" : "focus",
        bpm: "60-90(집중) / 120-135(훅) — 작업별 매트릭스 참조",
        lyrics: "고난도 언어작업은 무가사 절대(A), 창의작업은 Rubato 허용",
        noise: "50-65dB 확률적 공명 — 무음보다 인지↑",
        workflow: "Task-Audio 매트릭스: 언어/분석 50-70BPM 앰비언트, 코딩 80-100 Lo-Fi, 반복 120-135, 창의 자유템포",
        grade: "B",
      };
    }

    // ── Accessibility — Grade A 하드룰 ──
    const isLowContrast = /뉴모피즘|neumorphism|저대비|은은한 그림자/i.test(lower);
    const isFlashy = /플리커|깜빡|스트로브|빠른 컷|광과민/i.test(lower);
    const accessibility: AccessibilityInfo = {
      contrastOK: !isLowContrast,
      photosensitiveOK: !isFlashy,
      wcagNote: isLowContrast ? "WCAG 4.5:1(본문)/3:1(대형) 미달 구조적 위험(D→X) — Elevation으로 대체(B)" : "WCAG AA 4.5:1 / 3:1 통과 목표(A), 군집화(crowding) 자간·행간 확보(A)",
      grade: "A",
    };

    // ── Motivation (숨은 6번째) ──
    const motivation = hasWindow || isNeon ? `모든 빛·색·구도·움직임·깊이는 서사적 동기에서 — "${scene.slice(0, 40)}"가 왜 이 빛을 지금 받아야 하는가?` : "동기 있는 선택만 — 이유 없는 짐벌·헤이즈·LUT는 아마추어 증거, 팀 레퍼런스 3장(빛·색·구도)으로 동기 통일";

    // ── Evidence Grades 집계 ──
    const evidenceGrades: Record<string, Grade> = {
      light: light.grade,
      color: color.grade,
      composition: composition.grade,
      movement: movement.grade,
      depth: depth.grade,
      neuroFluency: "B",
      neuroArousal: "B",
      dmn: "B",
      audioYerkes: "B",
      audioPhonological: "A",
      wcag: accessibility.grade,
      neumorphism: isLowContrast ? "D" : "B",
      sevenPlusTwo: "D",
    };

    // ── Dual-Track Worksheet 요약 ──
    const dualTrackWorksheet = [
      `Track1 발상: 다감각(${depth.techniques.slice(0, 2).join(",")}) + 생경성(${color.paletteHint.slice(0, 20)}) + 감성3층)`,
      `Bridge Zone=${purposeZone} — ${purposeZone === "A:수행" ? "유창성 극대화, 일탈 금지" : purposeZone === "B:감흥" ? "정점 적정일탈, 1-2축만 예측위반" : "목적 미정 — Zone 결정 후 재검토"}`,
      `Track2 게이트: ${accessibility.contrastOK ? "WCAG 통과(A)" : "WCAG 실패-차단"} | 역추론·무효과·당위비약 3필터`,
      `Execution: 단일축 A/B(조명or색or움직임 하나만 변경) + 7점평정+강제선택+한줄이유+시선추적, 상영조건(폰/TV/극장) 기록`,
    ].join(" | ");

    const packet: VisualPacket = {
      sceneSummary: `${scene} | context: ${contextHint.slice(0, 40)} | budget:${budgetTier} | zone:${purposeZone}`,
      light,
      color,
      composition,
      movement,
      depth,
      motivation,
      masters,
      purposeZone,
      neuro,
      audio,
      accessibility,
      evidenceGrades,
      warnings: [],
      validated: false,
      dualTrackWorksheet,
      budgetTier,
    };

    packet.warnings = this.validate(packet, scenePrompt + " " + contextHint);
    packet.validated = packet.warnings.length === 0;
    return packet;
  }

  /** Dual-Track + A-D + 3대오류 + 안전 검증 — “검증 도구”로 반증 */
  validate(p: VisualPacket, raw: string): string[] {
    const w: string[] = [];
    const lower = raw.toLowerCase();

    // ── Grade A Hard Rule ──
    if (!p.accessibility.contrastOK) {
      w.push("A/WCAG: 저대비 뉴모피즘 — 본문 4.5:1/대형 3:1 미달(D→X), 머티리얼 Elevation으로 대체 필요");
    }
    if (p.audio.hookOrFocus === "focus" && /가사|보컬|팝송|k-pop/i.test(lower) && p.purposeZone === "A:수행") {
      w.push("A/인지부하: 고난도 언어작업에 가사 BGM — 음운루프 충돌, 효율 20-30%↓, 무가사로 교체(A)");
    }
    if (!p.accessibility.photosensitiveOK) {
      w.push("A/안전: 플리커·스트로브·빠른 패턴 — 광과민·멀미 유발, WCAG 2.3 Seizure 기준 확인");
    }
    // ── Grade D 반증 (인용 금지) ──
    if (/7\s*±\s*2|7개 메뉴|매직넘버7/i.test(raw)) {
      w.push("D/7±2: Miller 7±2는 수사적 표현, 현 기준 Cowan 4±1(A) — 메뉴 7개 규칙 근거 없음(D)");
    }
    if (/좌뇌.*우뇌|우뇌.*좌뇌|뇌타입|좌뇌형/i.test(lower)) {
      w.push("D/좌우뇌: 과제 의존적 편향, Marr≠Navon 출처혼동(D) — ‘좌뇌=디테일’ 서술 삭제, 스쿼트 테스트로 대체(B)");
    }
    if (/세리프.*가독|산세리프.*가독/i.test(lower) && !/차이 없음/i.test(lower)) {
      w.push("C/세리프신화: 세리프/산세리프 가독 차이 반복 미검출(A-무효과) — 브랜드 톤 문제로 취급");
    }
    // ── 3대 오류 필터 (수정판 §0) ──
    if (/뇌섬엽|insula|도파민.*터짐|보상회로.*켜짐.*좋다|편도체.*자극.*긴장/i.test(lower) && /그러므로|따라서.*디자인/i.test(lower)) {
      w.push("3대오류/역추론: ‘영역X 활성화→심리Y’ 역추론 오류(Poldrack 2006) — 행동지표(A/B)로 재검증 필요");
    }
    if (/뉴모피즘.*뇌.*좋아|다감각.*뉴모피즘/i.test(lower)) {
      w.push("3대오류/당위비약: 뇌반응 사실→뉴모피즘 처방은 Is-Ought 비약, WCAG 실패로 시장도태(D)");
    }
    // ── 안전/기술 보정 (팩트체크 §07) ──
    if ((/헤이즈|가습기|스프레이/i.test(raw)) && !/msds|환기|승인|sds/i.test(lower)) {
      w.push("안전/대기효과: 헤이즈·가습기 승인·MSDS·환기·화재감지기·결로 확인 없이 사용 금지(X/안전)");
    }
    if (/드론|fpv/i.test(lower) && !/승인|허가|보험/i.test(lower) && p.light) {
      w.push("안전/드론: 항공안전·공역·비행승인·보험·사생활 확인 필요 — 실내도 가드·이격·탈출경로 점검(X/안전)");
    }
    // ── 수치·명언·스펙 H/U/X 격리 경고 ──
    if (/80%|3색 고정|90% 고정|70% 감성|2배 좋아/i.test(raw) && !/가설|제약|휴리스틱/i.test(lower)) {
      w.push("H/수치격리: 80%/3색/90%고정 등은 작가 휴리스틱(H) — ‘이번 연습 제약’으로 라벨, 보장문구 삭제 필요");
    }
    if (/모든 네온은 실제|100% 자연광|완전히 대체|표준|항상/i.test(raw) && !/정정/i.test(lower)) {
      w.push("X/과장격리: ‘모든/완전/표준/항상’ 절대 표현 — 팩트체크표(X) 대상, ‘현장광+후반 결합’ 등으로 정정");
    }
    // ── Bridge 불일치 ──
    if (p.purposeZone === "A:수행" && /뉴모피즘|과도한 깊이|화려한 일탈/i.test(lower)) {
      w.push("Bridge/역U자: Zone A(수행)인데 과도한 일탈 — 유창성↓→오류↑, 수행 화면은 곡선 왼쪽 유지(B)");
    }
    // ── 오디오-인지 불일치 ──
    if (p.audio.hookOrFocus === "focus" && p.audio.bpm.includes("120-135") && /코딩|논문|독서/i.test(lower)) {
      w.push("오디오/집중: 고난도 언어·분석 작업에 120BPM 업비트 — Yerkes-Dodson 과각성, 60-90BPM으로 하향(B)");
    }
    // ── 뉴로 힌트는 가설임 명시 ──
    if (/황금비|mofc.*아름다움|뇌가 아름다움/i.test(lower)) {
      w.push("신경미학 한계: ‘황금비=아름다움’ ‘mOFC=아름다움센터’는 환원 오류 — 삼원모델 상호작용 가설로 재서술(B)");
    }

    return w;
  }
}

/* ──────────────────────────────────────────────────────────────
   Video Genius Brains — 4층에 장착할 교체형 천재 3종
   각 두뇌는 VisualEngine을 내부에서 호출해 VisualPacket을 근거로 조언
   ──────────────────────────────────────────────────────────── */
import { Brain, BrainInput, BrainOutput, BrainFeedback, BrainRole, BrainLayer } from "./types.js";
import { BrainMemory } from "./memory.js";

function mkOutput(input: BrainInput, brain: Brain, idea: string, confidence: number, tags: string[]): BrainOutput {
  return { brainId: brain.id, role: brain.role, layer: brain.layer, idea, confidence, tags, costMs: 0 };
}

abstract class BaseVisualBrain implements Brain {
  abstract id: string;
  abstract role: BrainRole;
  abstract layer: BrainLayer;
  abstract name: string;
  abstract description: string;
  version = "4.0.0";
  protected learned: string[] = [];
  async learn(feedback: BrainFeedback): Promise<void> { if (feedback.lesson) this.learned.push(feedback.lesson); }
  abstract think(input: BrainInput): Promise<BrainOutput>;
}

export class CinematicBrain extends BaseVisualBrain {
  id = "genius-cinematic"; role = "genius" as const; layer = 4 as const;
  name = "시네마 천재"; description = "Deakins·Lubezki·Doyle 5레이어 + 4공식 + 7트렌드 — ‘이 빛은 어디서 왔는가?’를 묻고 출처 없이 빛을 끈다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const engine = new VisualEngine();
    const vp = engine.analyze(input.task, input.context);
    return mkOutput(input, this,
      `🎬 시네마 5레이어 진단 (Zone ${vp.purposeZone})\n` +
      `💡 Light: ${vp.light.motivationSource} | 빼기 우선=${vp.light.subtractiveFirst} | ${vp.budgetTier} 대안: ${vp.light.budgetAlt}\n` +
      `🎨 Color: ${vp.color.paletteHint} (${vp.color.ratio} 가설 H)\n` +
      `◧ Composition: ${vp.composition.lensHint} | ${vp.composition.negativeSpace}\n` +
      `🎥 Movement: ${vp.movement.motivation} | ${vp.movement.ratioHeuristic}\n` +
      `🧱 Depth: ${vp.depth.techniques.join(", ")}\n` +
      `🎭 Motivation: ${vp.motivation}\n` +
      `거장 레퍼런스: ${vp.masters.map(m => `${m.name}(${m.keyword})`).join(" | ")}\n` +
      `⚠️ 경고 ${vp.warnings.length}건: ${vp.warnings.slice(0, 2).join(" | ") || "(없음)"}`,
      vp.validated ? 0.88 : 0.72, ["cinematic", "5layers", `zone-${vp.purposeZone.slice(0, 1)}`, vp.budgetTier]);
  }
}

export class VisualDesignBrain extends BaseVisualBrain {
  id = "genius-visual"; role = "genius" as const; layer = 4 as const;
  name = "비주얼 디자인 천재 4.0"; description = "게슈탈트·처리유창성·Berlyne 역U자·VWFA + 한글 타이포 + 그리드 60:30:10 + WCAG 4.5:1 — 천재는 폰트·그리드·대비를 한 번에 처방한다.";
  version = "4.0.0";
  async think(input: BrainInput): Promise<BrainOutput> {
    const engine = new VisualEngine();
    const vp = engine.analyze(input.task, input.context);
    // 한글 타이포 처방 — 12살 가독성 규칙
    const typo = `한글 타이포: 자간 -0.02em, 행간 1.7, keep-all(단어 잘림 방지), 최소 16px, 제목 스케일 1.35x — body{font-family:Pretendard,'Noto Sans KR'; word-break:keep-all; overflow-wrap:anywhere; letter-spacing:-0.02em}`;
    const grid = `그리드 60:30:10 — 주조60(배경) + 보조30(카드) + 액센트10(강조), 여백 48px, 카드 radius 12px, CTA 버튼 1개만`;
    const wcag = `WCAG AAA: ${vp.accessibility.wcagNote} | 대비 ${vp.accessibility.contrastOK ? "통과 4.5:1+" : "실패→#333으로 상향 필요"} | 포커스 링 2px solid var(--primary) 필수`;
    // 스타일 RAG 1위 추천 — 입력 task 기반 키워드 매칭 (가볍게 vp.sceneSummary로)
    let styleHint = "";
    try {
      const { searchStyles } = await import("../visual/styleLibrary.js");
      const hits = searchStyles(input.task.slice(0,40), 1);
      if (hits.length) styleHint = `StyleRAG 1위: ${hits[0].style.name}(${hits[0].style.id}) 팔레트 ${hits[0].style.palette.primary}/${hits[0].style.palette.accent} on ${hits[0].style.palette.bg} — ${hits[0].style.typography.letterSpacing}/${hits[0].style.typography.lineHeight} 적용`;
    } catch {}
    return mkOutput(input, this,
      `🎨 비주얼 디자인 천재 4.0 — 천재는 한 번에 처방한다\n` +
      `${typo}\n` +
      `${grid}\n` +
      `${wcag}\n` +
      (styleHint ? styleHint + "\n" : "") +
      `게슈탈트: ${vp.composition.squatTest}\n` +
      `유창성: ${vp.neuro.fluency} | 역U자: ${vp.neuro.arousalCurve}\n` +
      `증거등급: ${Object.entries(vp.evidenceGrades).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(" ")} | 경고 ${vp.warnings.length}건: ${vp.warnings.slice(0,1).join(" | ") || "없음"}`,
      vp.accessibility.contrastOK ? 0.92 : 0.68, ["visual", "typo-kr", "grid-60-30-10", "wcag", vp.purposeZone, "genius-4.0"]);
  }
}

export class AudioFocusBrain extends BaseVisualBrain {
  id = "genius-audio"; role = "genius" as const; layer = 4 as const;
  name = "오디오·집중 천재"; description = "Attention(1-4kHz 훅·무음갭 도파민) vs Focus(60-90BPM·무가사·DMN억제) — 작업별 매트릭스로 BGM을 처방한다.";
  async think(input: BrainInput): Promise<BrainOutput> {
    const engine = new VisualEngine();
    const vp = engine.analyze(input.task, input.context);
    return mkOutput(input, this,
      `🎧 오디오 처방 (${vp.audio.hookOrFocus})\n` +
      `BPM: ${vp.audio.bpm}\n` +
      `가사: ${vp.audio.lyrics}\n` +
      `노이즈: ${vp.audio.noise ?? "선택 — 브라운(과각성)/핑크(알파)/화이트(마스킹)"}\n` +
      `워크플로우: ${vp.audio.workflow}\n` +
      `Task-Audio 매트릭스: 언어/분석 50-70BPM 앰비언트(A) | 코딩 80-100 Lo-Fi | 반복 120-135 | 창의 Rubato\n` +
      (vp.warnings.some(w => w.includes("음운루프")) ? "⚠️ 가사 충돌 경고 있음 — 무가사 교체 필요" : ""),
      vp.audio.grade === "A" ? 0.84 : 0.78, ["audio", vp.audio.hookOrFocus, "yerkes-dodson"]);
  }
}

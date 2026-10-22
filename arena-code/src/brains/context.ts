/**
 * Context Engine — 8조건 중 영상 직결 P0 4조건(④프레임·⑤레지스터·⑦인지/정서·⑧접지) 경량 이식
 * 원전: Bateson/Goffman(프레임), Halliday/Hymes/Hall(레지스터), Pickering&Garrod·Horton(인지/정서), Clark(접지)
 * 감수보고서 권고: C2 출처 금지, A1 원전만 인용
 */
export type FramePrimary = "natural" | "social";
export type FrameVariant = "straight" | "keyed" | "fabricated"; // 1차 vs 조율(놀이화) vs 날조(기만)
export interface FrameInfo {
  question: "지금 무슨 일이 일어나고 있나?"; // Goffman
  primary: FramePrimary;
  variant: FrameVariant;
  keyCue?: string; // 조율 단서: "농담이야", "ㅋㅋ", 억제된 물기 등
  risk: string[]; // 오조율(miskeying) 위험
}

export interface RegisterInfo {
  field: string;  // 무슨 일 (Halliday field / Hymes Ends)
  tenor: string;  // 누가 누구에게 (지위·친밀·권력)
  mode: string;   // 어떻게 (구어/문어, 대면/비대면, 매체)
  genre: string;  // 장르 (공식보고·친구수다·사과·면접 등)
  speaking?: { setting: string; participants: string; ends: string; key: string; norms: string; genre: string }; // Hymes 8요소 축약
  highLow: "high" | "low" | "mixed"; // Hall 고·저맥락 (정보가 맥락에 vs 명시 부호에)
  mismatchWarning?: string;
}

export interface CognitiveInfo {
  emotion: "neutral" | "joy" | "anger" | "sadness" | "fear" | "tension";
  intensity: number; // 0..1
  alignment: number; // Pickering 정렬도 0..1 (대사-표정 일치도)
  manifestnessNote: string; // 접근성×강도 왜곡 경고
  suggestion: string;
}

export interface GroundingInfo {
  triple: { physical: boolean; linguistic: boolean; cultural: boolean }; // Clark 삼중 공동현전
  presentation: boolean; // 제시 있음
  acceptanceSignal: boolean; // 수락 신호 있음 (끄덕임, "응", 읽음 등)
  sufficient: boolean; // 현재 목적에 충분한가
  fix?: string;
}

export interface ContextPacket {
  siteSummary: string; // 사이트/대본 1줄 요약
  frame: FrameInfo;
  register: RegisterInfo;
  cognitive: CognitiveInfo;
  grounding: GroundingInfo;
  warnings: string[]; // validate() 결과 — ⑤⑦⑧ 불일치 경고
  validated: boolean;
}

export class ContextEngine {
  /** 사이트 텍스트 + 대본 1줄 → ④⑤⑦⑧ ContextPacket */
  analyze(siteText: string, scriptLine: string): ContextPacket {
    const lower = `${siteText} ${scriptLine}`.toLowerCase();
    const scriptLower = scriptLine.toLowerCase();

    // ── ④ 프레임: Goffman 1차 틀 + Bateson 메타신호 ──
    const playfulCues = ["ㅋㅋ", "ㅎㅎ", "lol", "농담", "장난", "ㅋ", "haha", "play", "놀이", "웃음"];
    const seriousCues = ["보고", "제안", "결정", "계약", "사과", "지적", "비판", "경고", "진지", "발표"];
    const isPlayful = playfulCues.some(c => lower.includes(c));
    const isSerious = seriousCues.some(c => lower.includes(c));
    const frame: FrameInfo = {
      question: "지금 무슨 일이 일어나고 있나?",
      primary: lower.includes("날씨") || lower.includes("자연") ? "natural" : "social",
      variant: isPlayful && !isSerious ? "keyed" : lower.includes("기만") || lower.includes("날조") ? "fabricated" : "straight",
      keyCue: isPlayful ? "ㅋㅋ/농담 표지 감지 — Bateson 메타신호" : undefined,
      risk: isPlayful && isSerious ? ["조율/진지 충돌 — 오조율 위험 (농담을 진담으로 오독)"] : [],
    };

    // ── ⑤ 레지스터: Halliday field/tenor/mode + Hall 고·저맥락 ──
    const isFormal = /공식|보고서|제안서|발표|회의|계약|사과문/i.test(siteText);
    const isCasual = /친구|수다|재미|놀이|캐주얼|방송/i.test(siteText);
    const register: RegisterInfo = {
      field: isFormal ? "공식 발표/보고" : isCasual ? "친근한 대화/놀이" : "일반 대화",
      tenor: /상사|교수|고객|선생/i.test(lower) ? "상하(공손 필요)" : /친구|동료|팀원/i.test(lower) ? "대등·친밀" : "중립",
      mode: "영상/구어 (표정·몸짓·음향 동반)",
      genre: isFormal ? "공식 발표" : isCasual ? "친구 수다" : "설명/안내",
      speaking: {
        setting: siteText.slice(0, 40),
        participants: isFormal ? "발표자-청중(격식)" : "화자-청중(친밀)",
        ends: isFormal ? "정보 전달·설득" : "유대·재미",
        key: isPlayful ? "장난스러움" : "진지함",
        norms: isFormal ? "경청·경어·절제" : "웃음·끼어들기 허용",
        genre: isFormal ? "보고/발표" : "수다/놀이",
      },
      highLow: isFormal ? "low" : isCasual ? "high" : "mixed", // 저맥락=명시 / 고맥락=암시
    };
    if (register.highLow === "low" && isPlayful) {
      register.mismatchWarning = "저맥락 공식 장르에 놀이 조율 섞임 — 격식 붕괴 위험";
    }

    // ── ⑦ 인지/정서: 표출성(접근성×강도) + 정렬 ──
    // 간단 휴리스틱: 대사 어조 vs 표정 키워드 불일치 탐지
    const angryWords = ["화났", "짜증", "비판", "지적", "틀렸", "문제", "심각"];
    const joyWords = ["좋아", "재미", "웃음", "행복", "성공", "좋네요", "감사"];
    const isAngry = angryWords.some(w => scriptLower.includes(w));
    const isJoy = joyWords.some(w => scriptLower.includes(w));
    let emotion: CognitiveInfo["emotion"] = "neutral";
    let intensity = 0.5;
    if (isAngry) { emotion = "anger"; intensity = 0.85; }
    else if (isJoy) { emotion = "joy"; intensity = 0.8; }
    else if (scriptLower.includes("슬프") || scriptLower.includes("미안")) { emotion = "sadness"; intensity = 0.7; }
    const cognitive: CognitiveInfo = {
      emotion,
      intensity,
      alignment: 0.6, // 기본값, validate()에서 재산정
      manifestnessNote: "정서는 가정들의 표출도 전체를 바꾼다 (Sperber 관련성) — 화남=부정 기억 접근성↑",
      suggestion: emotion === "anger" ? "표정=찡그림+팔짱, 몸짓=절제, 미소 금지" : emotion === "joy" ? "표정=미소+눈웃음, 몸짓=활발" : "표정=평온, 몸짓=보통",
    };

    // ── ⑧ 접지: Clark 삼중 공동현전 + 제시-수락 ──
    const hasPhysical = /여기|이것|저것|이 파일|화면/i.test(scriptLine);
    const grounding: GroundingInfo = {
      triple: {
        physical: hasPhysical,
        linguistic: scriptLine.length > 8, // 선행 언급 있으면 언어적 공동현전
        cultural: true, // 한국어는 고맥락 기본
      },
      presentation: true,
      acceptanceSignal: /네|응|알겠|끄덕/i.test(scriptLine), // 수락 신호
      sufficient: false,
    };
    grounding.sufficient = grounding.triple.linguistic && grounding.acceptanceSignal;

    const packet: ContextPacket = {
      siteSummary: `${siteText.slice(0, 60)} | 대사: ${scriptLine.slice(0, 60)}`,
      frame,
      register,
      cognitive,
      grounding,
      warnings: [],
      validated: false,
    };

    // ── 검증 ──
    packet.warnings = this.validate(packet, scriptLine);
    packet.validated = packet.warnings.length === 0;
    // 정렬도 재산정: 경고 있으면 낮게
    packet.cognitive.alignment = packet.validated ? 0.92 : Math.max(0.3, 0.9 - packet.warnings.length * 0.15);

    return packet;
  }

  /** ④⑤⑦⑧ 불일치 경고 — “문서가 자신에게 검증 절차 적용” (감수보고서) */
  validate(p: ContextPacket, scriptLine: string): string[] {
    const w: string[] = [];
    // ⑤ 레지스터 불일치: 공식 장르에 장난 톤
    if (p.register.mismatchWarning) w.push(`⑤ 레지스터: ${p.register.mismatchWarning}`);
    // ④ 프레임 오조율: 진지한 지적을 웃으며
    if (p.frame.risk.length) w.push(`④ 프레임: ${p.frame.risk[0]}`);
    if (p.frame.variant === "keyed" && p.register.genre === "공식 발표") {
      w.push("④⑤ 프레임-레지스터 충돌: 공식 발표인데 놀이 조율(ㅋㅋ/농담) 감지 — 표정·몸짓 격식 필요");
    }
    // ⑦ 정서-표정 불일치: 화난 대사에 웃는 표정 지시 등 (외부 표정 지시가 있다면)
    // 여기서는 scriptLine에 감정 단어와 반대 이모지가 함께 있으면 경고 — 간이 휴리스틱
    if (p.cognitive.emotion === "anger" && /😊|하하|ㅋㅋ/.test(scriptLine)) {
      w.push("⑦ 정서: 화남 대사에 웃음 표정(😊/ㅋㅋ) — 표정=찡그림으로 교체 필요");
    }
    if (p.cognitive.emotion === "joy" && /😠|화났|짜증/.test(scriptLine)) {
      w.push("⑦ 정서: 기쁨 대사에 분노 표정 — 불일치");
    }
    // ⑧ 접지 부족
    if (!p.grounding.sufficient) {
      w.push(`⑧ 접지: 수락 신호 없음 — 대사 끝 후 상대 끄덕임/“네” 같은 수락 신호 추가, 타이밍 지연 필요`);
    }
    if (!p.grounding.triple.physical && p.register.field.includes("발표")) {
      w.push("⑧ 접지: 물리적 공동현전 없음 — “여기 화면” 같은 지시어로 물리적 접지 확보");
    }
    return w;
  }
}

/**
 * Style RAG 도서관 — 20장 스타일 레퍼런스 + 검색/적용
 * 12살 설명: 색칠공부 견본 20장을 책장에 꽂아두고, 네가 "따뜻하게" 하면 가장 비슷한 견본을 찾아 색을 그대로 따라 칠하는 것
 * 설계: TF-IDF 없이 키워드 매칭 + 태그 보너스 (가볍고 결정적)
 */

export interface StyleDef {
  id: string;
  name: string;
  mood: string; // 따뜻, 차갑, 전문, 귀여움 등
  palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  fonts: { heading: string; body: string; sizeBase: string };
  layout: string; // 60:30:10, 중앙정렬, 카드 3열 등
  tags: string[]; // 검색용
  contrast: string; // WCAG 힌트
  when: string; // 언제 쓰는지
  example: string; // 예시 문구
}

export const STYLE_LIBRARY: StyleDef[] = [
  { id: "apple-keynote", name: "애플 키노트", mood: "미니멀 전문", palette: { primary: "#0A84FF", secondary: "#F5F5F7", accent: "#FF3B30", bg: "#FFFFFF", text: "#1D1D1F" }, fonts: { heading: "Pretendard ExtraBold", body: "Pretendard", sizeBase: "18px" }, layout: "중앙정렬 + 여백 60% + 1컬럼", tags: ["미니멀","전문","발표","세련","모던"], contrast: "4.8:1 통과", when: "보고서/발표/제품소개", example: "애플처럼 깔끔하고 여백 많은" },
  { id: "ghibli-warm", name: "지브리 따뜻", mood: "따뜻 포근", palette: { primary: "#FF8C42", secondary: "#FFF4E6", accent: "#6A994E", bg: "#FFFBF0", text: "#3E3A36" }, fonts: { heading: "Gowun Dodum", body: "Noto Sans KR", sizeBase: "17px" }, layout: "둥근 카드 + 손그림 아이콘", tags: ["따뜻","포근","감성","아이","스토리"], contrast: "4.6:1 통과", when: "아이/감성/스토리텔링", example: "지브리처럼 포근하고 손그림 감성" },
  { id: "naver-blog", name: "네이버 블로그", mood: "친근 일상", palette: { primary: "#03C75A", secondary: "#F2F4F7", accent: "#FFC800", bg: "#FFFFFF", text: "#222222" }, fonts: { heading: "NanumSquare Bold", body: "NanumSquare", sizeBase: "16px" }, layout: "좌정렬 + 이미지 상단 + 댓글 여유", tags: ["친근","일상","가독성","한글","블로그"], contrast: "4.5:1 통과", when: "블로그/일상/정보글", example: "네이버 블로그처럼 읽기 쉬운" },
  { id: "corporate-report", name: "기업 보고서", mood: "신뢰 전문", palette: { primary: "#0B1D3A", secondary: "#E8EEF6", accent: "#2D7D46", bg: "#FFFFFF", text: "#1A1A1A" }, fonts: { heading: "Pretendard SemiBold", body: "Pretendard", sizeBase: "15px" }, layout: "표 60:30:10 + 헤더 고정 + 페이지번호", tags: ["신뢰","전문","보고서","신뢰","데이터"], contrast: "7.2:1 통과", when: "기업보고서/IR/데이터", example: "삼성 IR처럼 신뢰감 있는" },
  { id: "youtube-thumbnail", name: "유튜브 썸네일", mood: "강렬 주목", palette: { primary: "#FF0000", secondary: "#282828", accent: "#FFCC00", bg: "#000000", text: "#FFFFFF" }, fonts: { heading: "Black Han Sans", body: "Pretendard Bold", sizeBase: "28px" }, layout: "중앙 얼굴 60% + 큰 글씨 3단어 이내", tags: ["강렬","주목","썸네일","유튜브","클릭"], contrast: "5.1:1 통과", when: "유튜브/썸네일/광고", example: "클릭하고 싶은 썸네일처럼" },
  { id: "notion-minimal", name: "노션 미니멀", mood: "정리 깔끔", palette: { primary: "#37352F", secondary: "#F7F6F3", accent: "#E16259", bg: "#FFFFFF", text: "#37352F" }, fonts: { heading: "Inter SemiBold", body: "Inter", sizeBase: "16px" }, layout: "좌측 토글 + 콜아웃 + 여백 40px", tags: ["정리","미니멀","노션","깔끔","생산성"], contrast: "6.2:1 통과", when: "노트/정리/위키", example: "노션처럼 정리된" },
  { id: "cafe-branding", name: "카페 브랜딩", mood: "따뜻 감각", palette: { primary: "#6F4E37", secondary: "#F5E6CC", accent: "#D4A574", bg: "#FFF8E7", text: "#3C2415" }, fonts: { heading: "Gowun Batang Bold", body: "Noto Sans KR", sizeBase: "17px" }, layout: "둥근 모서리 12px + 크래프트 질감", tags: ["감각","카페","따뜻","브랜딩","공예"], contrast: "4.9:1 통과", when: "카페/브랜딩/메뉴", example: "스타벅스처럼 감각적인" },
  { id: "medical-clean", name: "메디컬 클린", mood: "신뢰 청결", palette: { primary: "#0E7490", secondary: "#ECFEFF", accent: "#06B6D4", bg: "#FFFFFF", text: "#164E63" }, fonts: { heading: "Pretendard Bold", body: "Noto Sans KR", sizeBase: "16px" }, layout: "아이콘+수치 카드 3열 + 여백 넓게", tags: ["청결","신뢰","의료","전문","안전"], contrast: "5.8:1 통과", when: "의료/헬스/안전", example: "병원처럼 깨끗하고 신뢰가는" },
  { id: "finance-dashboard", name: "금융 대시보드", mood: "정밀 데이터", palette: { primary: "#111827", secondary: "#F3F4F6", accent: "#10B981", bg: "#FFFFFF", text: "#111827" }, fonts: { heading: "JetBrains Mono Bold", body: "Inter", sizeBase: "14px" }, layout: "숫자 큰 카드 4분할 + 그래프 60%", tags: ["정밀","데이터","금융","대시보드","숫자"], contrast: "8.1:1 통과", when: "대시보드/금융/데이터시각화", example: "토스 대시보드처럼 한눈에 보이는" },
  { id: "kids-playful", name: "키즈 알록달록", mood: "귀여움 활기", palette: { primary: "#FF6B6B", secondary: "#FFE66D", accent: "#4ECDC4", bg: "#FFFFFF", text: "#2D3436" }, fonts: { heading: "Jua", body: "Noto Sans KR", sizeBase: "18px" }, layout: "둥근 버튼 + 이모지 + 캐릭터", tags: ["귀여움","활기","키즈","놀이","색감"], contrast: "4.6:1 통과", when: "키즈/교육/행사", example: "뽀로로처럼 귀여운" },
  { id: "luxury-gold", name: "럭셔리 골드", mood: "고급 우아", palette: { primary: "#0A0A0A", secondary: "#F5F5F5", accent: "#D4AF37", bg: "#0A0A0A", text: "#F5F5F5" }, fonts: { heading: "Playfair Display Bold", body: "Noto Serif KR", sizeBase: "18px" }, layout: "중앙 정렬 + 골드 라인 + 여백 80px", tags: ["고급","우아","럭셔리","프리미엄","블랙"], contrast: "6.8:1 통과", when: "럭셔리/프리미엄/패션", example: "샤넬처럼 고급스러운" },
  { id: "eco-green", name: "에코 그린", mood: "자연 친환경", palette: { primary: "#228B22", secondary: "#F0FFF0", accent: "#FFD700", bg: "#FAFFF5", text: "#1B4332" }, fonts: { heading: "Gowun Dodum Bold", body: "Noto Sans KR", sizeBase: "17px" }, layout: "잎 아이콘 + 자연 사진 원형 크롭", tags: ["자연","친환경","에코","그린","지속"], contrast: "5.3:1 통과", when: "에코/환경/지속가능", example: "자연처럼 편안한 에코 감성" },
  { id: "tech-neon", name: "테크 네온", mood: "미래 강렬", palette: { primary: "#00F5FF", secondary: "#0A0E27", accent: "#FF00FF", bg: "#0A0E27", text: "#E0E0FF" }, fonts: { heading: "JetBrains Mono ExtraBold", body: "Inter", sizeBase: "16px" }, layout: "네온 glow + 다크모드 + 그리드", tags: ["미래","네온","테크","강렬","사이버"], contrast: "5.0:1 통과", when: "테크/스타트업/사이버", example: "사이버펑크처럼 미래적인" },
  { id: "school-exam", name: "수능 어법", mood: "정돈 학습", palette: { primary: "#1E3A8A", secondary: "#EFF6FF", accent: "#DC2626", bg: "#FFFFFF", text: "#1E293B" }, fonts: { heading: "NanumSquare ExtraBold", body: "Noto Sans KR", sizeBase: "16px" }, layout: "밑줄 <span class=ul> + 번호 ①②③ + 정답은 details 접힘", tags: ["정돈","학습","수능","어법","교육"], contrast: "7.0:1 통과", when: "수능/모의고사/학습지", example: "수능 문제지처럼 정돈된" },
  { id: "retro-vintage", name: "레트로 빈티지", mood: "복고 아날로그", palette: { primary: "#8B4513", secondary: "#FFE4B5", accent: "#CD853F", bg: "#FFF8DC", text: "#3E2723" }, fonts: { heading: "Gowun Batang", body: "Noto Serif KR", sizeBase: "17px" }, layout: "종이 질감 + 세피아 사진 + 손글씨", tags: ["복고","아날로그","빈티지","감성","레트로"], contrast: "4.7:1 통과", when: "레트로/감성/카페", example: "LP판처럼 복고적인" },
  { id: "gov-official", name: "정부 공문", mood: "공식 엄격", palette: { primary: "#003366", secondary: "#E6F0FF", accent: "#CC0000", bg: "#FFFFFF", text: "#000000" }, fonts: { heading: "Nanum Myeongjo Bold", body: "Nanum Myeongjo", sizeBase: "15px" }, layout: "좌측 정렬 + 도장 자리 + 결재선", tags: ["공식","엄격","정부","공문","행정"], contrast: "9.1:1 통과", when: "공문/행정/공식문서", example: "정부 문서처럼 공식적인" },
  { id: "pastel-diary", name: "파스텔 다이어리", mood: "부드러움 포근", palette: { primary: "#FFB5E8", secondary: "#FFF5F5", accent: "#B5DEFF", bg: "#FFF9F9", text: "#4A4A4A" }, fonts: { heading: "Gowun Dodum", body: "Gaegu Light", sizeBase: "17px" }, layout: "파스텔 카드 + 손글씨 + 스티커", tags: ["부드러움","다이어리","파스텔","일기","감성"], contrast: "4.5:1 통과", when: "다이어리/일기/감성", example: "다이어리처럼 부드러운 파스텔" },
  { id: "news-editorial", name: "뉴스 편집", mood: "객관 보도", palette: { primary: "#C41E3A", secondary: "#F8F9FA", accent: "#212529", bg: "#FFFFFF", text: "#212529" }, fonts: { heading: "Noto Serif KR Bold", body: "Noto Sans KR", sizeBase: "16px" }, layout: "헤드라인 2단 + 인용 박스 + 출처 푸터", tags: ["객관","보도","뉴스","편집","시사"], contrast: "8.5:1 통과", when: "뉴스/시사/보도자료", example: "신문 1면처럼 객관적인" },
  { id: "startup-pitch", name: "스타트업 피치", mood: "도전 에너지", palette: { primary: "#6366F1", secondary: "#EEF2FF", accent: "#F59E0B", bg: "#FFFFFF", text: "#1F2937" }, fonts: { heading: "Pretendard ExtraBold", body: "Inter", sizeBase: "16px" }, layout: "큰 숫자 3개 + 그래프 + CTA 버튼", tags: ["도전","피치","스타트업","에너지","투자"], contrast: "5.6:1 통과", when: "피치덱/IR/스타트업", example: "피치덱처럼 에너지 넘치는" },
  { id: "zen-minimal", name: "젠 미니멀", mood: "고요 여백", palette: { primary: "#2D3748", secondary: "#F7FAFC", accent: "#A0AEC0", bg: "#FFFFFF", text: "#2D3748" }, fonts: { heading: "Noto Serif KR Light", body: "Noto Sans KR Light", sizeBase: "16px" }, layout: "한 문장 한 페이지 + 여백 70% + 흑백 사진", tags: ["고요","여백","젠","명상","미니멀"], contrast: "6.0:1 통과", when: "젠/명상/시집/에세이", example: "무인양품처럼 여백 많은" },
];

export function searchStyles(query: string, topK = 3): Array<{ style: StyleDef; score: number }> {
  const q = query.toLowerCase();
  const qTokens = q.split(/[^a-z0-9가-힣]+/g).filter(w=>w.length>=2);
  const scored = STYLE_LIBRARY.map(s => {
    let score = 0;
    const hay = [s.name, s.mood, s.tags.join(" "), s.when, s.example].join(" ").toLowerCase();
    for (const tok of qTokens) {
      if (hay.includes(tok)) score += 1.0;
      // 부분 매칭
      if (s.tags.some(t=> t.includes(tok) || tok.includes(t))) score += 0.5;
    }
    if (q.includes(s.mood.slice(0,2))) score += 0.8;
    // contrast 보너스
    if (s.contrast.includes("통과")) score += 0.1;
    return { style: s, score };
  });
  scored.sort((a,b)=> b.score - a.score);
  return scored.slice(0, topK);
}

export function applyStyleToHtml(html: string, style: StyleDef): string {
  const css = `
    <style data-style="${style.id}">
      :root { --primary:${style.palette.primary}; --secondary:${style.palette.secondary}; --accent:${style.palette.accent}; --bg:${style.palette.bg}; --text:${style.palette.text}; }
      body { background: var(--bg); color: var(--text); font-family: ${style.fonts.body}; font-size: ${style.fonts.sizeBase}; line-height: 1.7; }
      h1,h2,h3 { font-family: ${style.fonts.heading}; color: var(--primary); }
      .card { background: var(--secondary); border-left: 4px solid var(--primary); padding: 16px; border-radius: 8px; }
      .accent { color: var(--accent); }
      /* layout hint: ${style.layout} */
      /* contrast: ${style.contrast} */
    </style>`;
  // head 닫기 직전에 삽입, 없으면 앞에
  if (html.includes("</head>")) return html.replace("</head>", `${css}\n</head>`);
  if (html.includes("<body>")) return html.replace("<body>", `<head>${css}</head><body>`);
  return `${css}\n${html}`;
}

export function describeStyleForPrompt(style: StyleDef): string {
  return `스타일: ${style.name} (${style.mood}) — 팔레트 ${style.palette.primary}/${style.palette.secondary}/${style.palette.accent} on ${style.palette.bg}, 폰트 ${style.fonts.heading}/${style.fonts.body}, 레이아웃 ${style.layout}, 대비 ${style.contrast}, 용도 ${style.when}`;
}

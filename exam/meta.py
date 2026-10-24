# -*- coding: utf-8 -*-
"""Meta information for the reconstructed 2026 CSAT-style English mock test."""

EXAM_TITLE_1 = "2026학년도 대학수학능력시험 대비 모의평가 문제지"
EXAM_TITLE_2 = "영어 영역 (독해)"
EXAM_SUBTITLE = "3교시 · 듣기 평가(1~17번) 제외 · 28문항"
EXAM_DATE = "2026학년도 9월 모의평가 재구성"

# Total points of the reconstructed paper (listening 1-17 excluded)
TOTAL_POINTS = 63

NOTICE = [
    "듣기·말하기 문항(1~17번)은 제외하고 독해 문항(18~45번)만으로 재구성한 시험지입니다.",
    "문항 수는 28문항이며, 배점은 실제 수능과 동일하게 2점(21문항)·3점(7문항)으로 차등 배점하였습니다.",
    "모든 문항은 5지 선다형이며, 지문은 실제 외국 기사·저널의 논지를 수능 지문 수준으로 재서술한 것입니다.",
]

# 문제 유형 구성 (번호, 유형명, 배점)
STRUCTURE = [
    (18, "글의 목적", 2),
    (19, "심경 변화", 2),
    (20, "필자의 주장", 2),
    (21, "함축적 의미", 2),
    (22, "글의 요지", 2),
    (23, "글의 주제", 2),
    (24, "글의 제목", 3),
    (25, "도표 정보 파악", 2),
    (26, "내용 일치(설명문)", 2),
    (27, "내용 일치(실용문)", 2),
    (28, "내용 일치(실용문)", 2),
    (29, "어법 정확성", 2),
    (30, "어휘 적절성", 3),
    (31, "빈칸 추론", 2),
    (32, "빈칸 추론", 3),
    (33, "빈칸 추론", 2),
    (34, "빈칸 추론", 3),
    (35, "무관한 문장", 2),
    (36, "글의 순서", 2),
    (37, "글의 순서", 3),
    (38, "문장 삽입", 2),
    (39, "문장 삽입", 3),
    (40, "문단 요약", 2),
    (41, "장문: 제목", 3),
    (42, "장문: 어휘", 2),
    (43, "장문: 순서", 2),
    (44, "장문: 지칭 추론", 2),
    (45, "장문: 내용 일치", 2),
]

# 각 문항 지문의 원출처(실제 외국 기사·저널 및 저작)와 재구성 메모
SOURCES = [
    (18, "실용문(편지)", "Ridgemont High School 동문의 졸업식 축사 초대 거절 서신 — 수능 18번 실용문 형식으로 창작",
     "EBS 수능특강 영어 유형편 01강 ‘글의 목적 파악’ / 수능완성 실전편 편지 유형"),
    (19, "서사(단편)", "Swafford, J. (2019). The Quiet Room. Literary Journal — 우정의 균열과 회복 장면 재서술",
     "EBS 수능특강 영어 유형편 02강 ‘심경·분위기 파악’"),
    (20, "사회·교육", "World Economic Forum, The Future of Jobs Report 2025, Chapter 3 ‘Reskilling’",
     "EBS 수능특강 영어 유형편 04강 ‘주장 파악’ / 수능완성 2강"),
    (21, "과학·기술", "UNESCO (2019), I’d Blush If I Could: Closing Gender Divides in Digital Skills (autocomplete bias); The Guardian (2019. 2. 21) 보도",
     "EBS 수능특강 영어 유형편 05강 ‘함축적 의미 파악’"),
    (22, "교육·심리", "Sommer, R. (1967). Classroom Ecology. Journal of Applied Behavioral Science, 3(4); Journal of Learning Spaces (2018), ‘The Impact of Seating Location’",
     "EBS 수능특강 영어 유형편 03강 ‘요지 파악’"),
    (23, "뇌과학", "Berridge, K. C., & Robinson, T. E. (2016). Liking, Wanting and the Incentive-Sensitization Theory of Addiction. American Psychologist, 71(8); Schultz, W. (2015) reward prediction error 연구",
     "EBS 수능특강 영어 유형편 06강 ‘주제 파악’ / 수능완성 과학 지문"),
    (24, "사회·인구", "Stanford Center on Longevity (2019), The New Map of Life; The Economist (2023), ‘The age of no age’",
     "EBS 수능특강 영어 유형편 07강 ‘제목 파악’"),
    (25, "도표", "UK Food Standards Agency·YouGov (2024) 식단 선택 조사 형식을 재구성한 가상 도표",
     "EBS 수능특강 영어 유형편 08강 ‘도표 정보 파악’"),
    (26, "인물·예술", "The New York Times (2019. 9. 21) Chuck Jones 탄생 100주년 기사; Jones, C. (1989). Chuck Amuck: The Life and Times of an Animated Cartoonist",
     "EBS 수능특강 영어 유형편 09강 ‘내용 일치(설명문)’"),
    (27, "실용문(안내문)", "고등학교 급식 잔반 줄이기 대회 안내문 — 수능 27번 실용문 형식으로 창작",
     "EBS 수능특강 영어 유형편 10강 ‘내용 일치(실용문)’ / 수능완성 Test 3"),
    (28, "실용문(강좌 안내)", "성우 연기 4주 과정 안내 — 수능 28번 실용문 형식으로 창작",
     "EBS 수능특강 영어 유형편 10강 ‘내용 일치(실용문)’"),
    (29, "경영·리더십", "Catalyst (2022), Empathy in the Workplace: A Tool for Effective Leadership; Harvard Business Review (2016), ‘Empathy Is a Leadership Skill’",
     "EBS 수능특강 영어 유형편 11강 ‘어법 정확성 파악’"),
    (30, "생태·원예", "Royal Horticultural Society, ‘Encourage natural predators’ (Gardening Advice); Journal of Applied Ecology (2019) 생물적 방제 연구",
     "EBS 수능특강 영어 유형편 12강 ‘어휘 적절성 파악’"),
    (31, "진화심리", "Eisenberger, N. I., Lieberman, M. D., & Williams, K. D. (2003). Does Rejection Hurt? Science, 302(5643); Nature (2017) 사회적 평가 두려움 연구",
     "EBS 수능특강 영어 유형편 13강 ‘빈칸 내용 추론(1)’"),
    (32, "신경과학", "Blakemore, S.-J., Wolpert, D. M., & Frith, C. D. (2000). Why can’t you tickle yourself? NeuroReport, 11(11); Nature Reviews Neuroscience (2002) sensory attenuation",
     "EBS 수능특강 영어 유형편 13강 ‘빈칸 내용 추론(1)’"),
    (33, "문학·서사학", "Ryan, M.-L. (2005). ‘Space’ in Routledge Encyclopedia of Narrative Theory; Narrative (2014) ‘Wayfinding in Fiction’",
     "EBS 수능특강 영어 유형편 14강 ‘빈칸 내용 추론(2)’"),
    (34, "심리·유머", "McGraw, A. P., & Warren, C. (2010). Benign Violations: Making Immoral Behavior Funny. Psychological Science, 21(8); Suls, J. (1972) incongruity-resolution 이론",
     "EBS 수능특강 영어 유형편 14강 ‘빈칸 내용 추론(2)’"),
    (35, "관광·문화", "Annals of Tourism Research (2017), ‘The Canonical Cultural Asset: Tourism Consumption and Selectivity’",
     "EBS 수능특강 영어 유형편 15강 ‘흐름에 무관한 문장 찾기’"),
    (36, "경영", "Kerr, S. (1975). On the Folly of Rewarding A, While Hoping for B. Academy of Management Journal, 18(4)",
     "EBS 수능특강 영어 유형편 16강 ‘문단 내 글의 순서 파악’"),
    (37, "생명과학", "Nature Communications (2015) 대서양 연어 유전체 연구; Science (2019), ‘Rapid domestication of farmed salmon’",
     "EBS 수능특강 영어 유형편 16강 ‘문단 내 글의 순서 파악’"),
    (38, "과학·시민참여", "Nature (2018), ‘Citizen science: the rise of public participation’; Science (2020) 시민과학 데이터 활용",
     "EBS 수능특강 영어 유형편 17강 ‘주어진 문장의 적합한 위치 찾기’"),
    (39, "음악·인지", "Huron, D. (2006). Sweet Anticipation: Music and the Psychology of Expectation. MIT Press",
     "EBS 수능특강 영어 유형편 17강 ‘주어진 문장의 적합한 위치 찾기’"),
    (40, "예술·무대", "Pilbrow, R. (1997). Stage Lighting Design: The Art, the Craft, the Life; Theatre Journal (2016) ‘Selective Visibility’",
     "EBS 수능특강 영어 유형편 18강 ‘문단 요약하기’"),
    (41, "소비자심리", "Maloney, J. C. (1956). Curiosity versus Disbelief in Advertising. Journal of Advertising Research; Journal of Consumer Research (2018) ‘Curious Disbelief’",
     "EBS 수능특강 영어 유형편 19강 ‘장문 독해(1)’"),
    (42, "소비자심리", "위 41번 지문과 동일 출처(장문 1지문 2문항)",
     "EBS 수능특강 영어 유형편 19강 ‘장문 독해(1)’"),
    (43, "개인 서사", "반려견 산책에 관한 개인 에세이 형식 — 수능 43~45번 장문 서사 형식으로 창작",
     "EBS 수능특강 영어 유형편 20강 ‘장문 독해(2)’ / 수능완성 실전편 서사 장문"),
    (44, "개인 서사", "위 43번 지문과 동일(장문 1지문 3문항)",
     "EBS 수능특강 영어 유형편 20강 ‘장문 독해(2)’"),
    (45, "개인 서사", "위 43번 지문과 동일(장문 1지문 3문항)",
     "EBS 수능특강 영어 유형편 20강 ‘장문 독해(2)’"),
]

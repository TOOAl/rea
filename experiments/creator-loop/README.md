# creator-loop — 진정성 우선 YouTube 창작 루프

> **"무엇을 만들지는 사람이 전략적으로 결정하고, 만드는 과정은 AI가 자동화한다."**

YouTube의 **2025년 7월 15일 YPP 정책 개정**("repetitious content" → **"inauthentic content"**)은
대량 생산·반복 콘텐츠의 수익화를 제한하면서, **AI 사용 자체는 허용**했습니다.
이 저장소는 그 경계선 위에서 실제로 돌아가는 파이프라인입니다:

```
① 니치 주제 리서치(사람 결정)  →  ② AI 고속 제작  →  ③ 썸네일·제목 최적화  →  ④ 데이터 리포트
        ↑                                                                    │
        └────────────────────── 다음 주제 추천 ←──────────────────────────────┘
```

그리고 **InVideo AI · Pictory · Veo 3 · Runway Gen-4 · Kling · Sora 2** 의 시그니처 기능을
자체 구현 + 공식 API 어댑터 + 로컬 대체 엔진으로 재현합니다 (`docs/tool-analysis.md`).

---

## 0. 지금 이 자리에서 확인 가능한 것

유료 API 키가 **하나도 없는 상태**에서 1080p 실영상을 끝까지 렌더했습니다.

```bash
cd experiments/creator-loop
pip install -r requirements.txt --break-system-packages   # 시스템 파이썬인 경우
python3 -m creatorloop.cli demo --resolution 1080p --runtime 110
```

실제 데모 로그:

```
① RESEARCH — 사람 결정 9개, 고유 기여 3개
② SCRIPT   — scenes=7 hook=scene_immersion human_ratio=77% edited=True gates=PASS
② PRODUCE  — out-demo/projects/brief_.../video.mp4  (13.2 MB, 106.5 s, 1920×1080)
             + audio_mix.wav, subtitles.srt/.ass/.json, poster.png, thumbnails/thumb_A·B·C.jpg
③ PACKAGE  — 제목 "부가가치세 신고 직접 하는 순서 (2025년 기준)", 썸네일 3종, 챕터 7개
③ POLICY   — score=100.0/100 pass=True blocking=0 warnings=1 decisions=11 variation=1.00
④ ANALYTICS— Studio CSV 인제스트 → solo_tax_kr 추천 3건 (EV≈3.1)
VARIATION  — 다음 편 초안을 같은 채널 기억과 비교 → score=67.0 blocking=1
ARTICLE    — 본인 장문 → scenes=5 human_ratio=100% runtime≈72s
```

`VARIATION` 줄이 이 프로젝트의 존재 이유입니다. **같은 템플릿으로 한 편 더 찍으려고 하면
엔진이 스스로 막습니다.** (BLOCK 1건 = `TEMPLATE_REPETITION`)

---

## 1. 설치

```bash
cd experiments/creator-loop
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
pip install -e .            # console script: creatorloop
creatorloop doctor          # 환경 점검
```

선택 사항:

| 추가 설치 | 얻는 것 |
| --- | --- |
| `pip install "mcp[cli]"` | `creatorloop mcp` — 에이전트 도구 표면 |
| `pip install edge-tts` | 무료 온라인 한국어 뉴럴 내레이션 |
| `GEMINI_API_KEY` | Veo 3 라우팅 활성화 |
| `RUNWAYML_API_SECRET` | Runway Gen-4 |
| `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` | Kling (무료 66 units/day) |
| `OPENAI_API_KEY` | Sora 2 |
| `YOUTUBE_ACCESS_TOKEN` | 실제 업로드 푸시 |

`doctor` 실출력:

```
ffmpeg      : .../imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2 (libass=True, zoompan=True, loudnorm=True)
TTS selected: espeak-ng
providers   : veo -- $0.4/s (GEMINI_API_KEY not set) | runway -- | kling -- | sora -- | local_studio OK $0.0/s
→ 유료 키가 없어 로컬 무료 엔진으로 제작합니다. 키를 추가하면 같은 샷이 자동으로 라우팅됩니다.
```

## 2. CLI

```bash
creatorloop doctor                                  # 환경/키/프로바이더 점검
creatorloop research --niche solo_tax_kr            # ① 리서치 데스크 (사람 질문·결정 기록)
creatorloop script   --brief <brief.json>           # ② 대본/스토리보드
creatorloop produce  --project <id> --resolution 1080p
creatorloop package  --project <id>                 # ③ 제목·썸네일
creatorloop policy   --project <id>                 # fail-closed 정책 감사
creatorloop approve  --project <id> --gate publish  # 사람 승인 기록
creatorloop analytics --csv data/samples/analytics_export.csv   # ④ 분석 + 다음 주제
creatorloop loop     --niche solo_tax_kr            # 루프 전체
creatorloop upload   --project <id>                 # 업로드 번들(+토큰 있으면 푸시)
creatorloop studio                                  # 로컬 웹 스튜디오
creatorloop mcp                                     # MCP 서버
creatorloop rea plan|ingest                         # REA 연동 (docs/rea-analysis-playbook.md)
```

모든 명령은 `--json`으로 기계 가독 출력을, `--home`으로 저장소 위치를 바꿉니다.

## 3. 로컬 웹 스튜디오

```bash
creatorloop studio --port 8787     # 0.0.0.0 바인딩
```

`GET /api/state · /api/questions · /api/health · /api/events(SSE)`
`POST /api/brief · /api/script · /api/produce · /api/package · /api/policy · /api/analytics · /api/approve · /api/job`

UI는 정책 순서대로만 진행됩니다: **리서치 → 대본 편집 → 패키징 선택 → 승인 → 분석**.
"편집 없이 다음 단계" 버튼은 없습니다 — 그것이 게이트입니다.

## 4. MCP 서버 (13 도구)

`initialize` → protocolVersion `2024-11-05`, serverInfo `creator-loop 0.1.0`.

`creatorloop_doctor · list_niches · research_questions · research_brief · draft_screenplay ·
apply_human_edits · produce_video · policy_audit · analytics_report · next_topics ·
project_state · rea_analysis_plan · rea_ingest_manifest`

서버 instructions가 `apply_human_edits`를 먼저 호출하라고 안내합니다 —
**에이전트가 사람 편집 단계를 건너뛸 수 없게** 만드는 장치입니다.

## 5. 모듈 지도

| 파일 | 역할 |
| --- | --- |
| `contracts.py` | 모든 데이터 계약(dataclass/enum), 직렬화·재구성, `beat_plan`/`shot_count` |
| `research.py` | ① 니치 프리셋 → 사람 질문 → `TopicBrief`(결정·value-add 기록) |
| `screenplay.py` | ② 초안/리믹스/사람 편집/러닝타임 피팅/**기사→영상**/기여도 리포트 |
| `direction.py` | 샷 서술·카메라 워크·모션 프로파일·character bible continuity |
| `art.py` | 브랜드킷·무드 팔레트·씬 아트·썸네일 렌더·가독성 리포트 |
| `audio.py` | TTS 백엔드 체인 + 절차적 음악/SFX/앰비언스 + loudnorm |
| `captions.py` | 워드레벨 큐·SRT/ASS·하이라이트(Shorts) 후보 |
| `render.py` | 프로바이더 라우팅 + ffmpeg 합성(1080p CRF 18) + 자막 번인 + 지문 프레임 |
| `packaging.py` | ③ 제목 후보·스코어링·썸네일 A/B/C·설명/챕터/해시태그·공개 설정 |
| `policy.py` | **진정성 감사 엔진** (21개 finding code, fail-closed) |
| `analytics.py` | ④ Studio CSV 인제스트·코호트·제목 가중치 학습·EV 기반 다음 주제 |
| `loop.py` | 루프 오케스트레이션 + 채널 기억(`catalog.jsonl`) |
| `store.py` | 프로젝트/결정/카탈로그/가중치 저장소 |
| `providers/` | `cloud.py`(veo·runway·kling·sora 어댑터) + 로컬 엔진 + 예산 라우팅 |
| `studio.py` `static/` | 로컬 웹 스튜디오 |
| `mcp_server.py` | MCP JSON-RPC 서버 |
| `rea_bridge.py` | REA 분석 플랜 생성 + capability manifest 인제스트 |

저장소 레이아웃(`--home`, 기본 `./out`):

```
out/
├── projects/<brief_id>/   brief.json research.json screenplay.json storyboard.json
│                          render_plan.json assets/ audio/ thumbnails/
│                          video.mp4 poster.png subtitles.{srt,ass,json}
│                          package.json policy.json produce_report.json upload.json
├── decisions.jsonl        사람 결정 감사 추적 (누가·언제·무엇을 골랐나)
├── catalog.jsonl          채널 기억 — 구조/텍스트/시각/오디오 지문
├── weights.json           학습된 제목 가중치
├── analytics/             ④ 리포트
└── rea/manifests/         관찰된 capability manifest
```

## 6. 테스트

```bash
python3 -m pytest tests -q        # 166 passed
```

| 파일 | 검증 대상 |
| --- | --- |
| `test_contracts_store.py` | 직렬화 왕복, 중첩 재구성, 저장소 |
| `test_screenplay.py` | 초안·리믹스·사람 편집·러닝타임 피팅·기여도 |
| `test_direction.py` | 샷 서술·카메라 필터·continuity |
| `test_policy.py` | 21개 finding code, 유사도 함수, 한국어 조사 정규화 |
| `test_packaging.py` | 제목 아키타입·썸네일·설명/챕터·A/B 플랜 |
| `test_captions.py` `test_art.py` | 큐 제한·SRT/ASS·브랜드·가독성 |
| `test_analytics.py` | CSV 인제스트(영/한 헤더)·코호트·가중치 학습 |
| `test_providers_contract.py` | 4개 클라우드 어댑터 페이로드/폴링 (픽스처, **실호출 없음**) |
| `test_loop.py` | 루프 전체 + **반복 차단 / 변형 허용** |
| `test_mcp_server.py` | 핸드셰이크·도구 목록·에러 코드 |
| `test_rea_bridge.py` | 플랜 생성·증거 검사·크리덴셜 마스킹 |

## 7. 정직한 한계

1. **유료 키가 없어 로컬 엔진으로 렌더합니다.** 절차적 아트(PIL) + ffmpeg zoompan
   카메라워크 + espeak-ng TTS입니다. Veo 3급 포토리얼/네이티브 오디오는 *어댑터 계약만*
   구현되어 있고 픽스처 테스트로 검증됩니다. 정책 엔진은 이 조합에
   `SYNTHETIC_VOICE_GENERIC_VISUAL` 경고를 일부러 남깁니다.
2. **6개 클라우드 제품은 역공학할 수 없습니다.** 서버사이드 모델이기 때문입니다.
   가능한 것은 본인 소유 아티팩트 관찰이며 `docs/rea-analysis-playbook.md`가 그 절차입니다.
   타사 제품 코드/모델 복제는 이 저장소의 범위가 아닙니다.
3. **정책 점수는 YouTube의 판정이 아닙니다.** 공개 정책 문언과 관측된 집행 사례에서
   역산한 내부 근사치입니다 (`docs/authenticity-policy.md` §6).
4. `imageio-ffmpeg` 빌드에는 **`drawtext`가 없습니다.** 텍스트는 PIL PNG 오버레이 또는
   libass로만 처리합니다.
5. 데모용 espeak-ng 음성은 실전에 쓰지 마세요. 본인 녹음 또는 상용 TTS를 권장하며,
   엔진이 그 방향으로 경고를 줍니다.

## 8. 문서

- `docs/tool-analysis.md` — 6개 제품 기능 → 구현/대체 맵, API 계약, 라우팅 규칙
- `docs/authenticity-policy.md` — 2025-07-15 정책 대응표, finding code, 임계값, 한계
- `docs/rea-analysis-playbook.md` — REA로 합법적으로 관찰하고 어댑터 계약을 검증하는 절차

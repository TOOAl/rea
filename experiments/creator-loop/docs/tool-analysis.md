# 6개 제품 기능 분석 → REA 관점 재구현 맵

대상: **InVideo AI · Pictory · Google Veo 3 · Runway Gen-4 · Kling AI · Sora 2**

## 0. 먼저: REA로 이 제품들을 "역공학"할 수 있는가

결론부터: **모델 자체는 불가능하고, 클라이언트 계약은 부분적으로 가능**합니다.

| 대상 | REA로 접근 가능한가 | 이유 |
| --- | --- | --- |
| 서버 측 모델 가중치/추론 (Veo, Sora, Kling, Runway) | **불가** | 완전한 서버사이드 클라우드 서비스. 로컬에 실행 파일이 없음 |
| 공식 API 페이로드/파라미터 | **가능** (문서·스키마) | 공개 API는 계약이 문서화되어 있음 → 어댑터로 구현 |
| 웹 클라이언트 JS 번들 (app.invideo.ai 등) | **가능** | 브라우저에서 실행되는 코드 → `rea analyze-web-bundle` |
| 본인 계정의 네트워크 트래픽 (HAR) | **가능** | 본인이 만든 요청만. `rea inspect-web-network-capture` |
| 본인이 내보낸 프로젝트 JSON | **가능** | 소유한 파일 → `rea` 증거 파이프라인 |
| 타인의 계정/비공개 엔드포인트 | **불가 · 금지** | 접근 권한 없음. REA의 기여 범위 밖 |

그래서 이 저장소의 전략은 **3겹**입니다:

1. **동등 기능 자체 구현** (로컬 엔진 — 오늘 당장 렌더 가능)
2. **공식 API 어댑터** (키가 있는 순간 라우팅으로 전환, 계약 테스트는 픽스처로 통과)
3. **REA 플레이북** (`docs/rea-analysis-playbook.md`) — 합법적으로 소유한
   아티팩트를 관찰해 *capability manifest*를 만들고, 그 관측치가 어댑터의
   파라미터 상한을 검증하게 하는 것

---

## 1. InVideo AI — "프롬프트 한 줄 → 완성 영상"

| InVideo의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 프롬프트 → 대본/씬/VO/b-roll/자막/브랜드킷 일괄 생성 | `draft_screenplay()` → `Storyboard` → `RenderPlan` → 합성 | `screenplay.py`, `direction.py`, `render.py` |
| 브랜드킷(색/폰트/로고) 일관 적용 | `DEFAULT_BRAND` + `data/brand/default.json`, 무드별 팔레트 6종 | `art.py` |
| **커맨드로 재편집**("더 짧게", "톤 바꿔") | `remix()`, `apply_human_edits()` — 씬 단위 지시 반영 후 재렌더 | `screenplay.py` |
| 템플릿 기반 빠른 양산 | **의도적으로 제한**: `variation_index`로 프로파일을 회전시키고 정책 엔진이 반복을 차단 | `policy.py` |

**대체 프로그램**: b-roll은 Pexels/Pixabay 같은 무료 스톡 + `render_scene_art()`의
절차적 비주얼(PIL)로 대체. 유료 스톡 API 없이도 동작합니다.

## 2. Pictory — "장문 텍스트 → 영상"

| Pictory의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 기사/블로그 → 영상 | `article_to_screenplay()` — 문단 경계에서 씬 분할, `human_sourced_ratio=1.0` | `screenplay.py` |
| 자동 씬 분할 | `scene_target_s`(기본 18초) 기준 문장 묶음 | `screenplay.py` |
| **워드 레벨 자동 캡션** | TTS 타임스탬프 → `build_cues()` (한국어 26자/12cps 제한) → `.srt` + `.ass` | `captions.py` |
| 하이라이트/Shorts 추출 | `highlight_candidates()` — 정보 밀도·길이 기준으로 세로 클립 후보 | `captions.py` |
| 브랜드 템플릿 | CaptionStyle + brand kit | `captions.py`, `art.py` |

이 경로는 정책적으로 가장 안전합니다. **본인이 쓴 글**이 원천이므로
`REUSED_WITHOUT_TRANSFORM` 위험이 없고 사람 기여율이 자동으로 100%가 됩니다.
데모에서 실제 동작 확인: `article screenplay: scenes=5 human_ratio=100% runtime≈72s`.

## 3. Google Veo 3 — "네이티브 동기 오디오"

| Veo의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 영상+오디오(대화·SFX·앰비언스) 동시 생성 | 로컬 대체: TTS(espeak-ng) + 절차적 SFX/앰비언스 층 → `amix` + `loudnorm I=-14 TP=-1.5 LRA=11` | `audio.py`, `render.py` |
| 프롬프트 확장(prompt expansion) | `describe_shot()` / `motion_profile()["prompt_phrase"]` — 짧은 지시를 렌즈·앵글·무빙 서술로 확장 | `direction.py` |
| ingredients-to-video(참고 이미지) | `render_plan`의 참조 이미지 슬롯 + 어댑터 `referenceImages` 페이로드 | `render.py`, `providers/cloud.py` |
| 포토리얼 품질 | 로컬 엔진은 **절차적 그래픽**(정직한 한계). 1080p CRF 18 인코딩으로 품질 상한 확보 | `render.py` |

**API 계약(구현됨)**: `POST /models/veo-3.0-generate-001:predictLongRunning` →
`:fetchPredictOperation` 폴링. `durationSeconds ∈ {4,6,8}`, 9:16 · 1080p 지원,
`veo-3.0-fast-generate-001` 저가형. **카메라 제어 파라미터 없음** → 무빙이
필요한 샷은 라우팅에서 제외됩니다.

## 4. Runway Gen-4 — "디렉터 모드 / 카메라 제어"

| Runway의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 카메라 무빙(pan/tilt/zoom/dolly/truck/pedestal/roll) | `Move` enum + `ffmpeg_move_filter()` — zoompan으로 실제 카메라 워크 렌더 | `contracts.py`, `direction.py` |
| 샷 타입 / 렌즈 / 앵글 | `describe_shot()` → "medium shot, 50mm lens, documentary feel, eye level angle…" | `direction.py` |
| 키프레임 | start/end 프레임 아트 + `xfade` 트랜지션 | `art.py`, `render.py` |
| 레퍼런스로 캐릭터 일관성 | **character bible** — 엔티티별 시각 명세를 스토리보드에 고정, `continuity_report()`가 위반 탐지 | `direction.py` |

`continuity_report()` 반환 키: `break_count`, `continuity_breaks`,
`entity_usage`, `entities_without_bible_entry`, `unresolved_shot_refs`.
Sora 2의 "character persistence" 요구도 같은 메커니즘으로 충족합니다.

**API 계약(구현됨)**: `POST https://api.dev.runwayml.com/v1/image_to_video`
`{"promptImage","promptText","model":"gen4_turbo","ratio":"1280:720","duration":5|10}`,
헤더 `X-Runway-Version: 2024-11-06`, `GET /v1/tasks/{id}` 폴링. **이미지 필수**이므로
로컬 엔진이 먼저 키프레임을 만들어 주는 구조가 그대로 이어집니다.

## 5. Kling AI — "자연스러운 모션 + 무료 크레딧"

| Kling의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 모션 강도 조절 / CFG / 네거티브 프롬프트 | `motion_profile()["mode"]`, `["cfg_scale"]`, `negative_prompt` | `direction.py`, `providers/cloud.py` |
| 립싱크 | **대체**: 자막 + 내레이션 타이밍 정렬(`align_scene_durations`). 립싱크는 로컬 재현 불가 → 어댑터 엔드포인트(`/v1/videos/lip-sync`)만 계약으로 확보 | `render.py`, `providers/cloud.py` |
| 넉넉한 무료 티어 | `free_units_per_day=66` → 라우팅 스코어 −3.0 보너스. **예산/쿼터 인식 라우팅**의 핵심 | `providers/cloud.py` |
| 카메라 제어 | `camera_control: {type, config}` — **`simple`은 한 축만 non-zero 허용(−10..10)** 이라 복합 무빙은 `dynamic` 사용 | `providers/cloud.py` |

**라우팅 규칙(낮을수록 우선)**: 힌트 −2.0 · 무료 크레딧 −3.0 · `prefer_free`일 때
무제한 로컬 −1.0 · +비용×길이×10 · −0.15×모션 · −0.25×리얼리즘(네이티브 오디오일 때) ·
키가 필요한데 예산 초과면 +1000(사실상 제외).

## 6. Sora 2 — "장편 서사 · 멀티샷 일관성 · 리믹스"

| Sora의 시그니처 | 우리 구현 | 파일 |
| --- | --- | --- |
| 긴 서사, 멀티샷 코히어런스 | `Screenplay.beat_plan` (hook→context→steps→payoff→cta) + 씬 간 엔티티 continuity | `contracts.py`, `direction.py` |
| 리믹스/변형 | `remix()` + `variation_profile()` — 시드 `sha256(title|angle|variation_index|niche)` | `screenplay.py` |
| 물리 표현 | 로컬 재현 불가 → 절차적 모션(zoompan/fade)으로 대체, 어댑터는 `seconds="4".."20"` 지원 | `providers/cloud.py` |
| 동기 대화 | 로컬 TTS 트랙 + 믹스로 대체 | `audio.py` |
| 캐릭터 지속성 | character bible(위 Runway 항목과 공유) | `direction.py` |

**API 계약(구현됨)**: `POST https://api.openai.com/v1/videos` (multipart:
`model=sora-2|sora-2-pro`, `prompt`, `size=1280x720|1080x1920|1920x1080`, `seconds`,
`input_reference`, `characters`) → `GET /v1/videos/{id}` → `/content` 다운로드. Batch API 지원.

---

## 7. 기능별 "구현 불가 → 대체 프로그램" 표

| 원래 기능 | 왜 불가한가 | 대체 |
| --- | --- | --- |
| 포토리얼 생성 비디오 | 서버사이드 모델, 키 없음 | 절차적 아트(PIL) + 스톡 이미지 + zoompan 카메라워크 |
| 네이티브 동기 오디오 생성 | 위와 동일 | TTS(espeak-ng) + 절차적 SFX/앰비언스 + loudnorm |
| 립싱크 | 얼굴 트랙 필요 | 워드레벨 자막 + 내레이션 타이밍 정렬 |
| 물리 시뮬레이션 | 모델 내부 기능 | 이징 커브 기반 카메라 무빙 |
| 유료 스톡 b-roll | 계정 없음 | 무료 스톡 + 생성 아트 |
| 고품질 한국 TTS | 상용 키 없음 | espeak-ng(데모용) — 실전은 본인 녹음 권장, 정책 경고로 유도 |
| YouTube 자동 업로드 | OAuth 토큰 없음 | `upload.json` **사람이 실행 가능한 업로드 번들** 생성 + 선택적 API 푸시 |

**중요**: `ffmpeg`는 `imageio-ffmpeg` 빌드를 쓰며 **`drawtext`가 없습니다.**
그래서 모든 텍스트 렌더링은 ① PIL로 PNG 오버레이를 만들거나 ② libass(`subtitles`/`ass`
필터 + `:fontsdir=`)로 처리합니다. 사용 가능한 필터: zoompan, subtitles, ass, loudnorm,
amix, xfade, scale, fade, rotate, adelay.

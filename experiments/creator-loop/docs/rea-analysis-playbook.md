# REA 분석 플레이북 — 6개 클라우드 제품을 *합법적으로* 관찰하는 법

REA는 **로컬 역공학 CLI/MCP 서버**입니다. 대상은 "내 기기에서 실행되거나,
내가 소유한 아티팩트"여야 합니다. Veo 3 · Sora 2 · Kling · Runway · InVideo · Pictory는
**서버사이드 클라우드 서비스**이므로 모델 자체는 REA의 대상이 될 수 없습니다.
대신 다음 세 가지는 관찰할 수 있고, 그것이 creator-loop의 어댑터 계약을 *검증*하는 데 쓰입니다.

| 관찰 대상 | REA 명령 | 얻는 것 |
| --- | --- | --- |
| 웹 클라이언트 JS 번들 | `analyze-web-bundle` | 파라미터 검증 로직, 프리셋 목록, UI가 허용하는 값의 범위 |
| 본인 세션의 네트워크 캡처(HAR) | `inspect-web-network-capture` | 실제 요청 본문 형태, 기본값, 에러 조건 |
| UI 실행 상태 | `observe-web-execution`, `capture-web-screenshot` | 설정 변경 ↔ 결과 대응 관계 |
| 소유한 파일(프로젝트 내보내기 등) | `evidence-export` | 재현 가능한 증거 고정 |

## 0. 법적 체크리스트 (플랜이 항상 앞에 출력합니다)

- [ ] 해당 서비스의 이용약관이 자동화 수집·역공학을 허용하는지 확인
- [ ] **본인 계정 / 본인 기기 / 본인 트래픽만** 대상으로 할 것
- [ ] 타인의 저작물·개인정보가 담긴 캡처는 제외할 것
- [ ] 수집한 자격증명(토큰·쿠키)을 저장하지 말 것 — `--sensitive-value` 마스크 사용
- [ ] 관찰 결과는 **"상호운용을 위한 사실 정보"** 로만 사용하고 모델/코드를 복제하지 말 것

**명시적 금지**: 모델 가중치 추출, 서버측 시스템 프롬프트 복제, 타인 계정 대상 수집.

## 1. 플랜 생성 (이 저장소에서)

```bash
cd experiments/creator-loop
python3 -m creatorloop.cli rea plan --target web-client \
    --artifact app.invideo.ai.js --artifact invideo-session.har
```

`--target` 선택지: `web-client` · `project-export` · `har` · `apk` · `any`.
출력은 실행 순서가 정해진 마크다운이며, 각 단계마다 `rea` 명령 전문과
"왜 이 단계가 필요한지", 출력 파일 경로가 붙습니다. 실제 생성되는 핵심 단계:

```bash
# 0. 준비 — 본인 브라우저의 loopback CDP 엔드포인트 확인
rea doctor && rea list-browser-targets http://127.0.0.1:9222

# 1. 번들 정적 분석
rea analyze-web-bundle http://127.0.0.1:9222 <targetId> \
    --allowed-origins https://<본인이 접속한 제품 도메인> --observation-ms 20000

# 2. UI 상태 관찰 (내가 UI를 조작하는 동안)
rea observe-web-execution http://127.0.0.1:9222 <targetId> \
    --observation-ms 30000 --include-json-body-shapes --include-console-text

# 3. 네트워크 캡처 검사 — 자격증명은 마스크
rea inspect-web-network-capture /absolute/path/to/session.har har \
    --sensitive-value Authorization

# 4. 설정 변경 전후 스크린샷 비교
rea capture-web-screenshot http://127.0.0.1:9222 <targetId> --output out/rea/ui-before.png

# 5. 증거 고정 (계약 테스트 픽스처로)
rea evidence-export out/rea/bundle-analysis.json out/rea/evidence/kling-web.json --overwrite
```

## 2. 관찰 결과를 capability manifest로 기록

관찰한 **사실만** 적습니다. 추측은 `not_observed`에 넣습니다.
샘플: `data/samples/capability_manifest_kling.json`

```json
{
  "product": "kling",
  "artifact_kind": "본인 계정 API 응답 + 공식 문서 대조",
  "legal_basis": "상호운용 목적의 사실 관찰",
  "observed_capabilities": [{
    "feature": "camera_control",
    "observed_values": {"type": ["simple", "dynamic"], "range": [-10, 10]},
    "constraint": "type=simple 일 때 0이 아닌 축은 1개만 허용",
    "evidence": "out/rea/evidence/kling-web.json#record-3",
    "maps_to_creator_loop": "direction.kling_camera_control"
  }],
  "observed_limits": [{"name": "max_duration_s", "value": 10, "evidence": "공식 문서 + 요청 응답"}],
  "not_observed": ["모델 가중치", "서버측 프롬프트 확장 문구", "타사 계정 데이터"]
}
```

`evidence` 필드가 실제 증거 파일을 가리키지 않으면 인제스트가
`missing_evidence`로 실패합니다 — **증거 없는 주장은 계약에 들어갈 수 없습니다.**

## 3. 인제스트 → 어댑터 계약 검증

```bash
python3 -m creatorloop.cli rea ingest --file data/samples/capability_manifest_kling.json
```

실제 출력(요약):

```json
{
  "ok": true, "product": "kling", "capabilities": 3, "limits": 2, "missing_evidence": [],
  "stored_at": "out/rea/manifests/kling.json",
  "contract_checks": [
    {"provider": "kling", "adapter_max_clip_s": 10.0, "observed_max_duration_s": 10,
     "adapter_native_audio": false, "adapter_camera_control": true, "ok": true},
    {"feature": "kling_camera_control", "adapter_simple_axes": {"pan_left": ["pan", -1], "...": "..."},
     "observed_single_axis_rule": true}
  ]
}
```

이 대조가 플레이북의 목적입니다:

- `adapter_max_clip_s`(우리가 가정하는 값) ↔ `observed_max_duration_s`(관찰값)
- `adapter_native_audio` ↔ 관찰된 오디오 유무
- `adapter_simple_axes` ↔ `observed_single_axis_rule`

불일치가 나오면 `ok: false` + `note`가 붙고, 라우팅이 그 프로바이더를
과신하지 않도록 조정합니다. **어댑터를 "문서대로 짰으니 맞겠지"로 두지 않고,
관측치로 회귀 테스트하는 구조**가 REA를 이 프로젝트에 붙인 이유입니다.

## 4. MCP 경로

`creatorloop.mcp_server`가 동일 기능을 에이전트 도구로 노출합니다:

| 도구 | 역할 |
| --- | --- |
| `rea_analysis_plan` | `{target, artifacts[], product}` → 플랜(명령 목록 + 마크다운 + 법적 체크리스트) |
| `rea_ingest_manifest` | manifest JSON 경로 → 저장 + 계약 검사 결과 |

## 5. 한계 (정직하게)

1. **REA로 6개 제품의 핵심 기능을 "추출"할 수는 없습니다.** 추출할 대상이
   로컬에 없기 때문입니다. 우리가 할 수 있는 것은 *계약(파라미터·제한·기본값)의 검증*뿐입니다.
2. 브라우저 관찰은 **본인이 로그인한 세션**에서만, **본인이 직접 조작하는 동안**만 수행합니다.
   자동화된 대량 스크레이핑은 약관 위반 위험이 있으며 이 플레이북의 범위가 아닙니다.
3. 원격 URL은 REA가 직접 가져오지 않습니다. `--artifact`로 주는 경로는
   **로컬에 이미 존재하는 파일**이어야 합니다 (`analyze-web-bundle`은 CDP 경유 관찰).
4. 관찰 결과는 시점 의존적입니다. 제품이 바뀌면 manifest를 다시 만들어
   계약 검사를 다시 돌려야 합니다 (`collected_at` 필수).

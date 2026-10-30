# Phase A 측정 — 숨겨진 경고 다시 켜기 (2026-10-30)

> branch: `arena/496ee405-rea` / base `main 8ee6ca0` (4678 files)
> 측정 설정: `.oxlintrc.measure.json` — `src/**`의 `complexity|max-depth|max-lines-per-function|max-params|no-unused-vars`를 `warn`으로 복구

## 1. 측정 결과

- **총 diagnostics: 3080 warnings, 0 errors** (4678 files)
  - `no-unused-vars` 2840 (92%)
  - `complexity` 118
  - `max-lines-per-function` 80
  - `max-depth` 30
  - `max-params` 12

기존 PLAN의 1848은 1946 파일 기준, 지금은 4678 파일이라 더 많음.

## 2. 자동 수정 (`oxlint --fix`)

- 명령: `npx oxlint --config .oxlintrc.measure.json --fix`
- 결과: **3080 → 1515 (-1565, -51%)**
  - `no-unused-vars` 2840 → 1224 (-1616)
  - `complexity` 118 유지
  - `max-lines-per-function` 80 유지
  - `max-depth` 30 유지
  - `max-params` 12 유지
  - `no-import-type-side-effects` 51 신규 (fix 부작용)

## 3. 변경 파일

- 282개 파일 수정, 대부분 미사용 변수/임포트 제거
- 예: `AdbProviderHelpers.ts` -36줄, `ApktoolProviderCore.ts` -33줄 등

## 4. 다음 단계

- **Day 2**: 남은 `no-unused-vars` 1224 수동 정리 + `no-control-regex`/`no-unsafe-finally` 55개 수정 → 1515 → ~1200
- **Day 3-4**: `complexity` 118 + `max-lines-per-function` 80 → Top20 함수 쪼개기 (Ghidra basic block 방식)
- 최종 목표: <500 warnings

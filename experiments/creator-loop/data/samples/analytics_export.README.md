# analytics_export.csv — 합성 샘플 데이터

이 파일은 **실제 채널 데이터가 아니라 파이프라인 검증용 합성 데이터**입니다.
YouTube Studio → 콘텐츠 → "CSV 내보내기"로 받은 실제 파일과 열 구조를 맞추어 두었으므로,
실제 내보내기 파일로 교체하면 그대로 `creatorloop analytics import`가 동작합니다.

열 이름은 영어/한국어 헤더 모두 인식합니다(`creatorloop/analytics.py`의 `HEADER_ALIASES`).
`brief_id`, `niche_id`, `hook_archetype`, `thumbnail_variant` 같은 열을 추가하면 코호트 분석이 더 정확해집니다.

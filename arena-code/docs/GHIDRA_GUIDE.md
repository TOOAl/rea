# Ghidra 완전 통합 가이드 — 바이너리 리버스 엔지니어링

> **NSA Ghidra (Apache 2.0) + REA + Arena Code** — 모든 기능을 하나의 코딩 에이전트에서 사용

---

## 1. Ghidra란?

미국 NSA가 만든 **무료 리버스 엔지니어링 도구**. 2019년 오픈소스 공개 후 업계 표준이 되었습니다.

| 기능 | 설명 | 예시 |
|------|------|------|
| **디스어셈블러** | 기계어를 어셈블리로 변환 | `90 90` → `NOP, NOP` |
| **디컴파일러** | 어셈블리를 C 코드로 변환 | 어셈블리 → `if (a==0) return 1;` |
| **시그니처 분석** | 함수, 문자열, 임포트 자동 탐지 | `main`, `strcmp`, `"password"` 찾기 |
| **참조 분석** | 누가 누구를 호출하는지 그래프 | `main → login → verify` |
| **패치 비교** | 두 버전의 차이 분석 | v1.0 vs v1.1 변경점 |

**Arena Code는 Ghidra의 모든 기능을 29개 도구로 제공합니다.**

---

## 2. 설치

### Ghidra 설치 (1번만)

```bash
# 1. 다운로드
# https://ghidra-sre.org/ 접속 → Download Ghidra
# 또는 직접:
wget https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.3_build/ghidra_11.3_PUBLIC_20250226.zip

# 2. 압축 해제
unzip ghidra_*.zip -d ~/ghidra
export GHIDRA_INSTALL_DIR=~/ghidra/ghidra_11.3_PUBLIC

# 3. Java 확인 (Ghidra는 Java 17+ 필요)
java -version
# 없으면: sudo apt install openjdk-17-jdk

# 4. REA에 등록
cd /home/user/rea/arena-code
npx rea-agents setup
# → Ghidra 경로 선택

# 5. 확인
npx rea doctor --provider ghidra --json
# → "healthy": true 이면 성공!
```

### Docker로 설치 (더 쉬움)

```bash
docker run -it --rm -v $(pwd):/data ghidra:latest
```

### 설치 없이도 가능?

네! Ghidra가 없어도:
- Read/Bash/Grep 등 8개 기본 도구는 그대로 동작
- Ghidra 도구 호출 시 설치 안내 메시지를 받고, 다른 방법으로 분석 가능
- `npx rea`가 Hopper나 다른 프로바이더로 폴백 가능

---

## 3. 29개 Ghidra 도구 목록

### 📦 카테고리 1: 기본 분석 (2개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraInspect` | 바이너리 전체 개요 — 아키텍처, 세그먼트, 엔트리, 함수/문자열 수, 임포트/익스포트 | `"이 바이너리를 분석해줘"` |
| `GhidraOverview` | Inspect와 동일 (별칭) | — |

### 📋 카테고리 2: 함수/심볼 (4개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraListProcedures` | 모든 함수 목록 (주소, 이름, 크기) | `"함수 목록 보여줘"` |
| `GhidraAnalyzeFunction` | 함수 1개의 완전 분석 (8개 facet: 의사코드+어셈블리+호출자/피호출자+문자열+CFG+주석) | `"main 함수 분석해줘"` |
| `GhidraListNames` | 모든 심볼 목록 (전역변수, 임포트 등) | `"심볼 목록 보여줘"` |
| `GhidraListSegments` | 메모리 세그먼트 (권한, 주소, 초기화) | `"메모리 레이아웃 보여줘"` |

### 🔓 카테고리 3: 디컴파일 (3개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraDecompile` | 함수 1개를 C 의사코드로 변환 (핵심 기능!) | `"0x401000을 C코드로 보여줘"` |
| `GhidraProcedurePseudoCode` | Decompile과 동일 (MCP 별칭) | — |
| `GhidraBatchDecompile` | 여러 함수 한 번에 디컴파일 (최대 10개) | `"main, login, verify를 모두 디컴파일해줘"` |

### 🔬 카테고리 4: 명령어/바이트 (4개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraInstructions` | 함수의 모든 어셈블리 명령어 | `"main의 어셈블리 보여줘"` |
| `GhidraInspectInstruction` | 단일 주소의 명령어 상세 (바이트, 토큰, 참조, 플로우) | `"0x401010 명령어 분석해줘"` |
| `GhidraReadBytes` | 특정 주소의 바이트 읽기 (덤프) | `"0x401000에서 32바이트 읽어줘"` |
| `GhidraInspectDataType` | 데이터 타입 조회 (구조체, 타입 정의) | `"MyStruct 타입 보여줘"` |

### 🔍 카테고리 5: 검색 (5개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraSearch` | 통합 검색 (함수+문자열, 리터럴/정규식) | `"password 검색해줘"` |
| `GhidraSearchProcedures` | 함수 이름으로 검색 | `"login 관련 함수 찾아줘"` |
| `GhidraSearchStrings` | 문자열 검색 (하드코딩된 텍스트) | `"에러 메시지 찾아줘"` |
| `GhidraSearchBytes` | 바이트 패턴 검색 (hex) | `"90 90 90 패턴 찾아줘"` |
| `GhidraListStrings` | 모든 문자열 목록 (문자셋, 길이) | `"모든 문자열 보여줘"` |

### 🔗 카테고리 6: 참조/그래프 (6개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraXrefs` | 교차 참조 (누가 이 주소를 쓰는가) | `"0x401000을 참조하는 곳 찾아줘"` |
| `GhidraCallers` | 호출자 — 누가 이 함수를 호출하는가 | `"verify를 호출하는 곳은?"` |
| `GhidraCallees` | 피호출자 — 이 함수가 누구를 호출하는가 | `"main이 호출하는 함수는?"` |
| `GhidraTrace` | 두 함수 간 호출 경로 추적 | `"main에서 verify로 가는 경로 추적해줘"` |
| `GhidraCallGraph` | 호출 그래프 (깊이별 트리) | `"main의 호출 그래프 보여줘"` |
| `GhidraResolveCallTargets` | 간접 호출 대상 해석 (함수 포인터 등) | `"0x401010의 호출 대상은?"` |

### 📝 카테고리 7: 어노테이션/비교 (5개)

| 도구 | 설명 | 예시 |
|------|------|------|
| `GhidraAnnotate` | 함수 이름/주석 추가 (유일한 쓰기 기능!) | `"0x401000을 decrypt로 이름 변경"` |
| `GhidraSetName` | 이름 변경 전용 | — |
| `GhidraSetComment` | 주석 추가 전용 | — |
| `GhidraCompareFunctions` | 두 바이너리의 함수 비교 (패치 분석) | `"v1과 v2의 main을 비교해줘"` |
| `GhidraCompareArtifacts` | 두 바이너리 전체 비교 | `"두 파일을 전체 비교해줘"` |

---

## 4. 사용 예시

### 예시 1: 처음 보는 바이너리 분석 (자동)

```bash
node dist/cli.js -p "
/tmp/malware 샘플을 Ghidra로 분석해줘:
1. GhidraInspect로 전체 개요 파악
2. GhidraListProcedures로 함수 목록 확인
3. 가장 의심스러운 함수 3개를 GhidraDecompile로 분석
4. GhidraSearch로 'password', 'http', 'cmd' 검색
5. 분석 보고서를 report.md로 저장해줘
" --provider gemini
```

### 예시 2: 특정 함수 깊이 분석

```bash
node dist/cli.js -p "
/tmp/target 바이너리의 0x401000 함수를 분석해줘:
1. GhidraAnalyzeFunction으로 전체 dossier 확인
2. GhidraCallers와 GhidraCallees로 호출 관계 파악
3. GhidraXrefs로 데이터 참조 확인
4. 취약점이 있는지 검토해줘
"
```

### 예시 3: 패치 분석 (두 버전 비교)

```bash
node dist/cli.js -p "
두 바이너리의 차이를 분석해줘:
- /tmp/v1/old.exe와 /tmp/v2/new.exe를 GhidraCompareArtifacts로 비교
- 변경된 함수를 GhidraCompareFunctions로 상세 비교
- 보안 패치가 무엇을 고쳤는지 설명해줘
"
```

### 예시 4: 문자열에서 로직 추적

```bash
node dist/cli.js -p "
/tmp/app에서:
1. GhidraListStrings로 모든 문자열 확인
2. '인증 실패' 문자열을 GhidraSearch로 찾기
3. 찾은 문자열이 사용되는 함수를 GhidraXrefs로 역추적
4. 해당 함수의 로직을 GhidraDecompile로 분석
"
```

### 예시 5: 대화형 — 에이전트와 함께 리버스 엔지니어링

```bash
node dist/cli.js --provider gemini
# 대화 시작:
❯ /tmp/crackme 파일을 분석해줘. 어떤 프로그램인지 개요부터 보여줘
❯ main 함수가 뭘 하는지 디컴파일해서 설명해줘
❯ 이 프로그램의 인증 로직을 찾고, 우회 방법을 분석해줘
❯ exit
```

---

## 5. 코딩 + 리버스 엔지니어링 통합 워크플로우

Arena Code의 진짜 강점은 **바이너리 분석과 코드 작성을 동시에** 할 수 있다는 것!

```bash
node dist/cli.js -p "
1. /tmp/vuln 바이너리를 GhidraAnalyzeFunction으로 분석해서 버그를 찾아줘
2. 찾은 버그와 동일한 로직을 가진 안전한 코드를 src/fixed.c로 작성해줘
3. Write로 파일 생성 후, Bash로 컴파일 테스트해줘
"
```

**가능한 통합 예시:**
- 바이너리에서 찾은 암호화 로직 → 파이썬으로 재구현 (Write)
- 취약한 C 코드 → Ghidra로 분석 → 안전한 코드로 패치 (Edit)
- 펌웨어 분석 → 문서화 (Write) → 에뮬레이터 코드 작성 (Write)

---

## 6. 고급: REA 직접 사용도 가능

Arena Code의 Ghidra 도구는 내부적으로 REA CLI를 호출합니다.
필요하면 REA를 직접 사용할 수도 있습니다:

```bash
# REA 직접 명령 (Arena Code 없이도 동작)
npx rea analyze /tmp/binary --provider ghidra --json
npx rea inspect /tmp/binary --provider ghidra --json
npx rea function /tmp/binary main --provider ghidra --json
npx rea decompile /tmp/binary main --provider ghidra --json
npx rea instructions /tmp/binary main --provider ghidra --json
npx rea search /tmp/binary password --kind strings --provider ghidra --json
npx rea xrefs /tmp/binary 0x401000 --provider ghidra --json
npx rea trace /tmp/binary query --provider ghidra --json

# REA MCP 서버 (다른 에이전트에서 사용)
npx rea-agents setup  # Claude Code 등과 연동
```

Arena Code는 이 모든 것을 **자연어로** 할 수 있게 해줍니다!

---

## 7. 트러블슈팅

| 문제 | 해결 |
|------|------|
| `Ghidra를 찾을 수 없습니다` | `GHIDRA_INSTALL_DIR` 환경변수 설정 또는 `npx rea-agents setup` |
| `java: command not found` | `sudo apt install openjdk-17-jdk` |
| `분석 실패` | 바이너리 경로를 절대경로로, 파일 형식 확인 (ELF/PE/Mach-O) |
| `건강 상태 unhealth` | `npx rea doctor --provider ghidra --json`으로 진단, Ghidra 로그 확인 |
| `timeout` | 대용량 바이너리는 3분 이상 걸릴 수 있음 — 기다리기 |
| Ghidra 없이도 쓰고 싶음 | Read/Bash/Grep 등 8개 기본 도구로도 코드 분석 가능 |

---

## 8. 라이선스

- **Ghidra**: Apache 2.0 (무료, 상업적 사용 가능) — https://github.com/NationalSecurityAgency/ghidra
- **REA**: MIT — https://github.com/morluto/rea
- **Arena Code**: MIT — 본 프로젝트

Ghidra는 NSA가 만든 도구지만 오픈소스로 공개되어 자유롭게 사용할 수 있습니다!

---

## 9. 더 알아보기

- Ghidra 공식 문서: https://ghidra-sre.org/
- REA Ghidra 문서: `../../docs/ghidra-provider.md`
- REA MCP 계약: `../../docs/mcp-contracts.md`
- 예제: `examples/ghidra-demo.md` (향후 추가)

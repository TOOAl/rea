# 🔓 Ghidra 바이너리 분석 가이드 — 12살도 이해하기

> **어려운 바이너리 분석을 쉬운 말로 설명합니다.**
> 코딩을 몰라도 따라 할 수 있습니다!

---

## 🤔 Ghidra가 뭔가요? (초등학생 버전)

### 비유: X-ray로 물건 속 들여다보기

Ghidra는 **파일의 속을 들여다보는 X-ray**입니다.

```
일반 파일: game.exe — 더블클릭하면 게임이 실행
Ghidra로 보면:
  → 이 파일은 3개의 부분으로 나뉘어 있음
  → 150개의 함수(기능)가 있음
  → "password"라는 글자가 숨어 있음
  → 0x401000 주소에서 로그인 검사를 함
```

컴퓨터 프로그램은 보통 **바이트(숫자)** 로만 저장됩니다.
사람이 읽을 수 있는 글자(코드)로 바꿔주는 것이 Ghidra의 일입니다!

### Ghidra가 하는 일 3가지

| 이름 | 비유 | 예시 |
|------|------|------|
| **디스어셈블** | 암호를 알파벳으로 풀기 | `90 85` → `MOV EAX, 1` |
| **디컴파일** | 알파벳을 문장으로 만들기 | `MOV EAX, 1` → `a = 1;` |
| **분석** | 문장의 의미를 찾기 | `a = 1;` → "이 함수는 1을 반환하는 함수입니다" |

---

## 🧩 Arena Code는 Ghidra를 어떻게 쓰나요?

Arena Code는 **29개의 Ghidra 손**을 새로 가졌습니다!

```
기존: 8개 손 (파일 읽기/쓰기/검색 등)
  +
새로운: 29개 손 (Ghidra 바이너리 분석)
  =
총 37개 손! 🤖🦾🦾🦾
```

사람이 말로 시키면, Ghidra 손이 자동으로 움직입니다:

```
사람: "이 파일 분석해줘"
  → 로봇: [GhidraInspect 손으로 파일 속 들여다보기]
  → 로봇: "이 파일은 게임 파일이고, 150개 기능이 있습니다!"
```

---

## 📚 29개 손이 뭘 하는지 쉽게 설명

### 1. 파일 전체 살펴보기 (2개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraInspect` | 파일 전체 X-ray | 처음 보는 파일을 만났을 때 |

**예:** 친구가 준 `game.exe`가 뭔지 모를 때
→ `GhidraInspect`로 "아키텍처, 함수 수, 문자열" 전체 파악

### 2. 함수 찾기 (4개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraListProcedures` | 함수 목록 보기 | 파일에 어떤 기능이 있는지 알고 싶을 때 |
| `GhidraAnalyzeFunction` | 함수 1개 자세히 보기 | 특정 함수가 뭘 하는지 깊이 알고 싶을 때 |
| `GhidraListNames` | 이름(심볼) 목록 | 전역 변수, 임포트 찾기 |
| `GhidraListSegments` | 메모리 지도 보기 | 파일이 메모리 어디에 저장되는지 |

**예:** `GhidraListProcedures`로 "main, login, check_password 3개 함수가 있네!" 확인

### 3. 코드를 사람 말로 바꾸기 (3개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraDecompile` | 암호 → C언어 | 함수 로직을 이해하고 싶을 때 |
| `GhidraBatchDecompile` | 여러 함수 한 번에 변환 | 10개 함수를 빠르게 보고 싶을 때 |

**예:** `0x401000` 주소의 암호 같은 코드를 `GhidraDecompile`로 C 코드로 변환
→ `"if (password == "1234") 로그인 성공"` 으로 보임!

### 4. 더 자세히 보기 (4개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraInstructions` | 어셈블리 보기 | CPU가 실제로 하는 일을 보고 싶을 때 |
| `GhidraInspectInstruction` | 명령어 1개 자세히 | 특정 위치의 명령어가 궁금할 때 |
| `GhidraReadBytes` | 바이트 읽기 | 파일의 원시 데이터 확인 |
| `GhidraInspectDataType` | 데이터 구조 보기 | 구조체, 타입 정의 확인 |

### 5. 찾기 (5개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraSearch` | 뭐든 찾기 | "password" 같은 단어 찾기 |
| `GhidraSearchProcedures` | 함수 이름으로 찾기 | "login" 함수 찾기 |
| `GhidraSearchStrings` | 문자열 찾기 | "에러 메시지" 찾기 |
| `GhidraSearchBytes` | 바이트 패턴 찾기 | 특정 숫자 패턴 찾기 |
| `GhidraListStrings` | 모든 문자열 보기 | 파일의 모든 텍스트 확인 |

**예:** `GhidraSearchStrings`로 "password" 검색 → 어딘가에 비밀번호가 하드코딩되어 있음 발견!

### 6. 연결 관계 찾기 (6개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraXrefs` | 누가 이걸 쓰는가? | "이 함수가 어디서 호출되는지" |
| `GhidraCallers` | 나를 부르는 사람 | "누가 login을 호출하는가?" |
| `GhidraCallees` | 내가 부르는 사람 | "login이 누구를 호출하는가?" |
| `GhidraTrace` | A에서 B로 가는 길 | "main에서 password 검사로 가는 경로" |
| `GhidraCallGraph` | 호출 지도 그리기 | 전체 함수의 호출 관계 트리 |
| `GhidraResolveCallTargets` | 간접 호출 추적 | "함수 포인터가 실제로 가리키는 곳" |

**예:** `GhidraCallers`로 "verify_password는 login에서 호출됨" → 로그인 흐름 파악!

### 7. 기록하고 비교하기 (5개)

| 손 이름 | 쉽게 말하면 | 언제 쓰나요? |
|---------|------------|--------------|
| `GhidraAnnotate` | 이름/주석 붙이기 | "0x401000을 'decrypt'로 이름 변경" |
| `GhidraCompareFunctions` | 함수 2개 비교 | "이전 버전과 현재 버전의 함수 차이" |
| `GhidraCompareArtifacts` | 파일 2개 전체 비교 | "두 프로그램의 차이점 전체" |

**예:** `GhidraCompareArtifacts`로 "v1.exe와 v2.exe는 3개 함수가 다름" → 패치 내용 파악!

---

## 🎮 따라 해보기 — 첫 바이너리 분석 (5분)

### 준비: Ghidra 설치 확인

```bash
# 터미널에서 확인
npx rea doctor --provider ghidra --json

# 결과에 "healthy": true 가 보이면 OK!
# 없으면:
# → https://ghidra-sre.org/ 에서 Ghidra 다운로드
# → export GHIDRA_INSTALL_DIR=/path/to/ghidra
```

### 실습 1: 간단한 프로그램 분석

```bash
# 1. 테스트 바이너리 만들기 (간단한 C 프로그램)
cat > /tmp/hello.c <<'EOF'
#include <stdio.h>
int main() {
    char pwd[20];
    printf("Enter password: ");
    scanf("%s", pwd);
    if (strcmp(pwd, "secret123") == 0) {
        printf("Welcome!\n");
    } else {
        printf("Wrong!\n");
    }
    return 0;
}
EOF
gcc /tmp/hello.c -o /tmp/hello

# 2. Arena Code로 분석
node dist/cli.js --provider gemini --cwd /tmp -p "
/tmp/hello 파일을 GhidraInspect로 분석하고,
GhidraDecompile로 main 함수를 C코드로 보여줘
"
```

**예상 결과:**
```
✅ Ghidra Analyze (/tmp/hello):
  - Architecture: x86_64
  - Functions: 15개
  - Entry: 0x401080

✅ Ghidra Decompile(main):
  int main() {
    char pwd[20];
    printf("Enter password: ");
    scanf("%s", pwd);
    if (strcmp(pwd, "secret123") == 0) {  ← 비밀번호 찾음!
        printf("Welcome!\n");
    }
  }
```

### 실습 2: 문자열로 비밀 찾기

```bash
node dist/cli.js -p "
/tmp/hello 파일에서:
1. GhidraListStrings로 모든 문자열 보여줘
2. GhidraSearch로 'secret' 검색해줘
"
```

---

## 🎯 바이너리 + 코딩 함께 하기 (진짜 강점!)

Arena Code는 **분석 + 코딩을 동시에** 할 수 있습니다:

### 예: 취약한 프로그램 찾고, 안전한 버전 만들기

```bash
node dist/cli.js --provider gemini -p "
1. /tmp/hello 파일을 GhidraAnalyzeFunction으로 분석해서 보안 문제 찾아줘
   (힌트: scanf는 버퍼 오버플로우 위험!)

2. 찾은 문제를 고친 안전한 코드를 src/secure_hello.c로 작성해줘
   (fgets 사용, 버퍼 크기 체크)

3. Bash로 컴파일 테스트: gcc src/secure_hello.c -o /tmp/secure_hello

4. 두 파일을 GhidraCompareArtifacts로 비교해서 뭐가 달라졌는지 설명해줘
"
```

**로봇이 하는 일:**
1. 🔓 GhidraAnalyzeFunction → `scanf` 위험 발견
2. ✍️ Write → `src/secure_hello.c` 안전한 코드 작성
3. 💻 Bash → `gcc` 컴파일 실행
4. 📝 GhidraCompare → 두 바이너리 차이 분석!

---

## 🆘 자주 묻는 질문

| 질문 | 답 |
|------|-----|
| **Ghidra가 없으면 어떻게 되나요?** | Ghidra 도구 호출 시 설치 안내가 나옵니다. Read/Bash 등 8개 기본 도구는 그대로 쓸 수 있습니다. |
| **어떤 파일이든 분석할 수 있나요?** | 대부분 가능! ELF(Linux), PE(Windows exe), Mach-O(Mac) 지원. 펌웨어도 일부 가능. |
| **분석이 느린가요?** | 처음 한 번은 오래 걸릴 수 있음 (큰 파일 1~3분). 그 후에는 빠름. |
| **Java가 필요한가요?** | 네, Ghidra는 Java 17+ 필요. `java -version`으로 확인, 없으면 `sudo apt install openjdk-17-jdk` |
| **맥/윈도우에서도 되나요?** | 네! REA가 모든 플랫폼 지원. 설치 경로만 다름. |
| **바이너리를 망가뜨리나요?** | 아니요! Ghidra는 읽기 전용 (read-only). 원본 파일은 절대 바뀌지 않음. 이름/주석 변경도 별도 저장. |

---

## 📖 더 배우기

- **어른용 자세한 문서:** `docs/GHIDRA_GUIDE.md`
- **Ghidra 공식 문서:** https://ghidra-sre.org/
- **REA 문서:** `../../docs/ghidra-provider.md`

> 💡 Ghidra는 NSA(미국 국가안보국)가 만든 도구입니다!
> 원래 비밀 도구였는데 2019년 무료로 공개되었습니다. 이제 전 세계 해커와 연구자가 사용합니다.
> Arena Code로 Ghidra를 말로 쉽게 쓸 수 있게 되었습니다! 🎉

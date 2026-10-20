# @arena-code/ghidra-tools

Ghidra 바이너리 분석 29 tools — 외부 패키지 분리.

- **Upstream**: [NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra) + [TOOAl/rea](https://github.com/TOOAl/rea)
- **업데이트**: `arena-code update`가 GitHub releases를 추적, 설치 버전과 비교해 알림

```ts
import { GHIDRA_TOOLS } from "@arena-code/ghidra-tools";
registry.registerAll(GHIDRA_TOOLS, { category: "ghidra" });
```

Arena 내에서 유지되던 `src/tools/ghidra/`는 이 패키지를 re-export하는 shim으로 남습니다.

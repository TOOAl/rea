# @arena-code/rea-bridge

REA(ReVerse Engineer Anything) 브리지 — REA CLI를 Arena Code 도구로 노출.

- **Upstream**: [TOOAl/rea](https://github.com/TOOAl/rea) / [morluto/rea](https://github.com/morluto/rea)
- **업데이트**: `arena-code update`가 GitHub releases를 추적

```ts
import { REA_TOOLS } from "@arena-code/rea-bridge";
registry.registerAll(REA_TOOLS, { category: "rea" });
```

제공 도구: `ReaDoctor`, `ReaAnalyze`, `ReaInspect`, `ReaTrace`, `ReaGraph`, `ReaCatalog`

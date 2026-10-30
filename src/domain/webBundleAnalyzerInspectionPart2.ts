import type { AnalysisAccumulator } from "./webBundleAnalyzerInspectionCore.js";
import type { WebBundleAnalysis } from "./webBundleAnalysis.js";
type Inference = WebBundleAnalysis["inferences"][number];

export const emptyAccumulator = (): AnalysisAccumulator => ({
  edges: [],
  routes: [],
  endpoints: [],
  webMcp: [],
  inferences: [],
  seen: new Set(),
  visitedNodes: 0,
  parsedScripts: 0,
  failedScripts: [],
  recoveredScripts: [],
});

export const isIncludedScript = (
  script: BrowserScript,
): script is IncludedScript => script.source.included;

const routeCallNames = [
  "route",
  "addRoute",
  "useRoutes",
  "createBrowserRouter",
  "createHashRouter",
] as const;

const vendorDetectors: readonly {
  readonly value: string;
  readonly detector: string;
  readonly patterns: readonly string[];
  readonly confidence: Inference["confidence"];
  readonly kind: Inference["kind"];
}[] = [
  {
    value: "webpack",
    detector: "webpack-runtime",
    patterns: ["__webpack_require__"],
    confidence: "high",
    kind: "bundle_runtime",
  },
  {
    value: "Vite",
    detector: "vite-runtime",
    patterns: ["__vite__", "import.meta.hot"],
    confidence: "medium",
    kind: "bundle_runtime",
  },
  {
    value: "React",
    detector: "react-runtime",
    patterns: ["__REACT_DEVTOOLS_GLOBAL_HOOK__", "React.createElement"],
    confidence: "medium",
    kind: "vendor_fingerprint",
  },
  {
    value: "Vue",
    detector: "vue-runtime",
    patterns: ["__VUE__", "createApp("],
    confidence: "medium",
    kind: "vendor_fingerprint",
  },
  {
    value: "Next.js",
    detector: "next-runtime",
    patterns: ["__NEXT_DATA__", "/_next/"],
    confidence: "high",
    kind: "vendor_fingerprint",
  },
  {
    value: "Angular",
    detector: "angular-runtime",
    patterns: ["ɵɵdefineComponent"],
    confidence: "high",
    kind: "vendor_fingerprint",
  },
  {
    value: "Svelte",
    detector: "svelte-runtime",
    patterns: ["svelte/internal"],
    confidence: "medium",
    kind: "vendor_fingerprint",
  },
];

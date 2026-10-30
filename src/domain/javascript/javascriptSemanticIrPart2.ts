import type { JavaScriptSourceRange } from "./javascriptStaticAnalysisTypes.js";
import type {
  JavaScriptSemanticResourceLimit,
  JavaScriptSemanticValue,
} from "./javascriptSemanticValueTypes.js";
import type {
  JavaScriptSemanticCoverage,
  JavaScriptSemanticReturnCoverage,
} from "./javascriptSemanticCoverage.js";
import type { JavaScriptModuleResolutionMode } from "./javascriptModuleResolutionMode.js";

/** One exact module origin followed through imports, requires, or aliases. */

export interface JavaScriptSemanticTimerOperation {
  readonly timerId: string;
  readonly kind: "schedule" | "cancel";
  readonly method:
    | "setTimeout"
    | "setInterval"
    | "setImmediate"
    | "clearTimeout"
    | "clearInterval"
    | "clearImmediate";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly handleBindingId: string | null;
  readonly projectedResultBindings: readonly JavaScriptSemanticProjectedResultBinding[];
  readonly linkedTimerId: string | null;
  readonly delayMilliseconds: number | null;
  readonly resolution: "complete" | "partial" | "unresolved";
}

/** One explicit asynchronous node:child_process creation candidate. */
export interface JavaScriptSemanticChildProcessSpawn {
  readonly processId: string;
  readonly method: "spawn" | "exec" | "execFile" | "fork";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly resultBindingId: string | null;
  readonly projectedResultBindings: readonly JavaScriptSemanticProjectedResultBinding[];
  readonly command: string | null;
  readonly argvCount: number | null;
  readonly environmentSupplied: boolean;
  readonly stdioMode: string;
  readonly resolution: "complete" | "partial";
}

/** One exit/error listener or signal operation linked to child candidates. */
export interface JavaScriptSemanticChildProcessInteraction {
  readonly interactionId: string;
  readonly kind: "listener" | "signal";
  readonly method: "on" | "once" | "addListener" | "kill";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly processBindingId: string | null;
  readonly linkedProcessIds: readonly string[];
  readonly eventName: "exit" | "error" | null;
  readonly signalName: string | null;
  readonly listenerLocation: JavaScriptSourceRange | null;
  readonly resolution: "complete" | "partial";
}

/** One environment, argv, file, or default configuration source. */
export interface JavaScriptSemanticConfigurationOperation {
  readonly configId: string;
  readonly kind: "environment" | "argv" | "file" | "default";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly resultBindingId: string | null;
  readonly key: string | null;
  readonly sourceConfigId: string | null;
  readonly value: string | number | boolean | null;
  readonly valueResourceLimit?: JavaScriptSemanticResourceLimit;
  readonly resolution: "complete" | "partial";
}

/** One request construction or response-consumer candidate. */
export interface JavaScriptSemanticRequestOperation {
  readonly requestId: string;
  readonly kind: "request" | "response-consumer";
  readonly method:
    | "fetch"
    | "WebSocket"
    | "request"
    | "get"
    | "json"
    | "text"
    | "arrayBuffer";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly resultBindingId: string | null;
  readonly projectedResultBindings: readonly JavaScriptSemanticProjectedResultBinding[];
  readonly linkedRequestIds: readonly string[];
  readonly endpoint: string | null;
  readonly fields: readonly {
    readonly name: string;
    readonly sourceBindingId: string | null;
  }[];
  readonly resolution: "complete" | "partial" | "unresolved";
}

/** A destructured result binding with its known projection path. */
export interface JavaScriptSemanticProjectedResultBinding {
  readonly bindingId: string;
  readonly projectionPath: readonly (string | number | null)[];
  readonly resolution: "complete" | "partial";
}

/** One parse, coercion, or validation boundary candidate. */
export interface JavaScriptSemanticBoundaryOperation {
  readonly boundaryId: string;
  readonly kind: "parse" | "coerce" | "validate";
  readonly method: string;
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly sourceBindingId: string | null;
  readonly resultBindingId: string | null;
  readonly resolution: "complete" | "partial";
}

/** One explicit built-in resource acquisition or release candidate. */
export interface JavaScriptSemanticResourceOperation {
  readonly resourceId: string;
  readonly kind: "acquire" | "release";
  readonly method:
    | "open"
    | "openSync"
    | "createReadStream"
    | "createWriteStream"
    | "connect"
    | "createConnection"
    | "close"
    | "destroy"
    | "end";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly resultBindingId: string | null;
  readonly linkedResourceIds: readonly string[];
  readonly resolution: "complete" | "partial";
}

/** One static property read/write, spread, or destructuring candidate. */
export interface JavaScriptSemanticObjectOperation {
  readonly objectOperationId: string;
  readonly kind: "read" | "write" | "spread" | "destructure";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly objectBindingId: string | null;
  readonly targetBindingId: string | null;
  readonly propertyPath: readonly string[] | null;
  readonly resolution: "complete" | "partial";
}

/** One syntax location where exact local semantic continuation is unavailable. */
export interface JavaScriptSemanticFrontier {
  /**
   * `dynamic-call`/`dynamic-property` mark a callee or key the analyzer could
   * not resolve. `dynamic-scope` marks `with`/`eval`, where the binding
   * environment itself is not statically knowable.
   */
  readonly kind: "dynamic-call" | "dynamic-property" | "dynamic-scope";
  readonly callableId: string | null;
  readonly location: JavaScriptSourceRange;
  readonly reason: string;
}

/** Static import/export relationship retained for cross-file composition. */
export interface JavaScriptSemanticModuleLink {
  readonly resolutionMode?: JavaScriptModuleResolutionMode;
  readonly kind:
    | "import"
    | "type-import"
    | "require"
    | "export"
    | "re-export"
    | "commonjs-export";
  readonly specifier: string | null;
  readonly importedName: string | null;
  readonly localName: string | null;
  readonly exportedName: string | null;
  readonly callableId: string | null;
  readonly location: JavaScriptSourceRange;
}

/** Provider-neutral JavaScript semantic IR. */
export interface JavaScriptSemanticIr {
  readonly schema: "JavaScriptSemanticIR";
  readonly scopes: readonly JavaScriptSemanticScope[];
  readonly bindings: readonly JavaScriptSemanticBinding[];
  readonly callables: readonly JavaScriptSemanticCallable[];
  readonly references: readonly JavaScriptSemanticReference[];
  readonly moduleLinks: readonly JavaScriptSemanticModuleLink[];
  readonly callSites: readonly JavaScriptSemanticCallSite[];
  readonly argumentFlows: readonly JavaScriptSemanticArgumentFlow[];
  readonly callReturnFlows: readonly JavaScriptSemanticCallReturnFlow[];
  readonly callResultFlows: readonly JavaScriptSemanticCallResultFlow[];
  readonly closureCaptures: readonly JavaScriptSemanticClosureCapture[];
  readonly promiseOperations: readonly JavaScriptSemanticPromiseOperation[];
  readonly eventOperations: readonly JavaScriptSemanticEventOperation[];
  readonly timerOperations: readonly JavaScriptSemanticTimerOperation[];
  readonly childProcessSpawns: readonly JavaScriptSemanticChildProcessSpawn[];
  readonly childProcessInteractions: readonly JavaScriptSemanticChildProcessInteraction[];
  readonly configurationOperations: readonly JavaScriptSemanticConfigurationOperation[];
  readonly requestOperations: readonly JavaScriptSemanticRequestOperation[];
  readonly boundaryOperations: readonly JavaScriptSemanticBoundaryOperation[];
  readonly resourceOperations: readonly JavaScriptSemanticResourceOperation[];
  readonly objectOperations: readonly JavaScriptSemanticObjectOperation[];
  readonly functionFingerprints: readonly JavaScriptSemanticFunctionFingerprint[];
  readonly frontiers: readonly JavaScriptSemanticFrontier[];
  readonly coverage: JavaScriptSemanticCoverage;
  readonly limitations: readonly string[];
}

/** Fail-closed result when Babel cannot produce an inert syntax tree. */
export const failedJavaScriptSemanticIr = (): JavaScriptSemanticIr => ({
  schema: "JavaScriptSemanticIR",
  scopes: [],
  bindings: [],
  callables: [],
  references: [],
  moduleLinks: [],
  callSites: [],
  argumentFlows: [],
  callReturnFlows: [],
  callResultFlows: [],
  closureCaptures: [],
  promiseOperations: [],
  eventOperations: [],
  timerOperations: [],
  childProcessSpawns: [],
  childProcessInteractions: [],
  configurationOperations: [],
  requestOperations: [],
  boundaryOperations: [],
  resourceOperations: [],
  objectOperations: [],
  functionFingerprints: [],
  frontiers: [],
  coverage: { status: "failed", omittedCount: null },
  limitations: [
    "JavaScript parsing failed; no semantic absence claim is available.",
    "No JavaScript was executed.",
  ],
});

import type { JavaScriptSourceRange } from "./javascriptStaticAnalysisTypes.js";
import type { JavaScriptSemanticValue } from "./javascriptSemanticValueTypes.js";
import type { JavaScriptSemanticReturnCoverage } from "./javascriptSemanticCoverage.js";
import type { JavaScriptModuleResolutionMode } from "./javascriptModuleResolutionMode.js";

/** One exact module origin followed through imports, requires, or aliases. */
export interface JavaScriptModuleOrigin {
  readonly resolutionMode?: JavaScriptModuleResolutionMode;
  readonly specifier: string;
  readonly importedPath: readonly string[];
}

/**
 * Fail-closed module-alias provenance for one binding, not transitive data flow.
 * Locally constructed values may contain or derive from imported values.
 */
export type JavaScriptBindingProvenance =
  | {
      readonly status: "module";
      readonly origins: readonly [JavaScriptModuleOrigin];
      readonly reason: null;
    }
  | {
      readonly status: "local";
      readonly origins: readonly [];
      readonly reason: null;
    }
  | {
      readonly status: "ambiguous";
      readonly origins: readonly JavaScriptModuleOrigin[];
      readonly reason: string;
    }
  | {
      readonly status: "unknown" | "cycle";
      readonly origins: readonly [];
      readonly reason: string;
    };

/** One lexical scope recovered without executing source. */
export interface JavaScriptSemanticScope {
  readonly scopeId: string;
  readonly parentScopeId: string | null;
  readonly kind:
    | "program"
    | "function"
    | "block"
    | "static-block"
    | "class"
    | "catch";
  readonly location: JavaScriptSourceRange;
  readonly bindingsComplete: boolean;
  readonly bindingIds: readonly string[];
}

/** One declaration or assignment contributing to a binding. */
export interface JavaScriptSemanticDefinition {
  readonly kind:
    | "import"
    | "variable"
    | "parameter"
    | "function"
    | "class"
    | "catch"
    | "assignment";
  readonly location: JavaScriptSourceRange;
}

/** One resolved lexical binding plus static value and provenance. */
export interface JavaScriptSemanticBinding {
  readonly bindingId: string;
  readonly scopeId: string;
  readonly name: string;
  readonly kind: JavaScriptSemanticDefinition["kind"];
  readonly mutable: boolean;
  readonly definitions: readonly JavaScriptSemanticDefinition[];
  readonly value: JavaScriptSemanticValue;
  readonly provenance: JavaScriptBindingProvenance;
}

/** One identifier use and its fail-closed lexical resolution. */
export interface JavaScriptSemanticReference {
  readonly name: string;
  readonly role: "read" | "write" | "export";
  readonly location: JavaScriptSourceRange;
  readonly bindingId: string | null;
  readonly resolution: "resolved" | "unbound" | "ambiguous" | "unknown";
}

/** Function, class, or method identity without pretending it is a binding. */
export interface JavaScriptSemanticCallable {
  readonly callableId: string;
  readonly kind: "function" | "class" | "method";
  readonly name: string | null;
  readonly containerScopeId: string;
  readonly bodyScopeId: string | null;
  readonly location: JavaScriptSourceRange;
  readonly returnSites: readonly JavaScriptSemanticReturnSite[];
  readonly returnCoverage: JavaScriptSemanticReturnCoverage;
}

/** One direct return expression belonging to exactly one callable. */
export interface JavaScriptSemanticReturnSite {
  readonly returnSiteId: string;
  readonly location: JavaScriptSourceRange;
  readonly identityReferenceLocation: JavaScriptSourceRange | null;
  readonly value: JavaScriptSemanticValue;
}

/** One statically visible call or construction expression. */
export interface JavaScriptSemanticCallSite {
  readonly callSiteId: string;
  readonly kind: "call" | "construct";
  readonly callerCallableId: string | null;
  readonly location: JavaScriptSourceRange;
  readonly calleeLocation: JavaScriptSourceRange;
  readonly resolution: "exact" | "ambiguous" | "unresolved";
  readonly calleeCallableIds: readonly string[];
  readonly arguments: readonly JavaScriptSemanticCallArgument[];
}

/** One argument occurrence retained without evaluating application code. */
export interface JavaScriptSemanticCallArgument {
  readonly index: number;
  readonly location: JavaScriptSourceRange;
  readonly spread: boolean;
}

/** One positional argument that may initialize one local parameter binding. */
export interface JavaScriptSemanticArgumentFlow {
  readonly callSiteId: string;
  readonly argumentIndex: number;
  readonly argumentLocation: JavaScriptSourceRange;
  readonly callableId: string;
  readonly parameterBindingId: string;
  readonly parameterLocation: JavaScriptSourceRange;
}

/** One direct local return that may supply a call expression's value. */
export interface JavaScriptSemanticCallReturnFlow {
  readonly callSiteId: string;
  readonly callableId: string;
  readonly returnSiteId: string;
  readonly returnLocation: JavaScriptSourceRange;
}

/** One local binding initialized or assigned from a retained call expression. */
export interface JavaScriptSemanticCallResultFlow {
  readonly callSiteId: string;
  readonly bindingId: string;
  readonly definitionLocation: JavaScriptSourceRange;
}

/** One resolved outer lexical binding referenced by a nested callable. */
export interface JavaScriptSemanticClosureCapture {
  readonly callableId: string;
  readonly bindingId: string;
  readonly referenceLocation: JavaScriptSourceRange;
}

/** One promise/task operation recovered from explicit syntax. */
export interface JavaScriptSemanticPromiseOperation {
  readonly promiseId: string;
  readonly kind:
    | "constructor"
    | "static"
    | "chain"
    | "aggregate"
    | "awaited-expression";
  readonly method:
    | "new"
    | "resolve"
    | "reject"
    | "then"
    | "catch"
    | "finally"
    | "all"
    | "allSettled"
    | "await";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly ownership:
    | "awaited"
    | "returned"
    | "detached"
    | "assigned"
    | "chained"
    | "aggregated"
    | "unknown";
  readonly ownerBindingId: string | null;
  readonly returnSiteId: string | null;
  readonly sourcePromiseIds: readonly string[];
  readonly sourceResolution: "complete" | "partial" | "unresolved";
}

/** Rename-resistant bounded component commitment for one callable. */
export interface JavaScriptSemanticFunctionFingerprint {
  readonly callableId: string;
  readonly status: "complete" | "partial" | "unavailable";
  readonly components: {
    readonly parameterArity: number;
    readonly normalizedAstSha256: string;
    readonly controlFlowSha256: string;
    readonly relationShapeSha256: string;
    readonly literalSetSha256: string;
    readonly effects: readonly (
      | "async"
      | "child-process"
      | "event"
      | "network"
      | "promise"
      | "resource"
      | "timer"
    )[];
  };
  readonly limitations: readonly string[];
}

/** One EventEmitter-style registration, removal, or dispatch candidate. */
export interface JavaScriptSemanticEventOperation {
  readonly eventId: string;
  readonly kind: "register" | "remove" | "dispatch";
  readonly method:
    | "on"
    | "once"
    | "addListener"
    | "prependListener"
    | "prependOnceListener"
    | "off"
    | "removeListener"
    | "removeAllListeners"
    | "emit";
  readonly location: JavaScriptSourceRange;
  readonly ownerCallableId: string | null;
  readonly emitterKey: string;
  readonly emitterBindingId: string | null;
  readonly eventName: string | null;
  readonly listenerBindingId: string | null;
  readonly listenerLocation: JavaScriptSourceRange | null;
  readonly resolution: "complete" | "partial" | "unresolved";
}

/** One timer scheduling or cancellation candidate. */

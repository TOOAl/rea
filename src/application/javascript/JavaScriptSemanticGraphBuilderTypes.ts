import type { JavaScriptSemanticGraphNode } from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type { SemanticFlowProjectionContext } from "./JavaScriptSemanticGraphFlowProjection.js";
import type { BuilderState as ConstructionState } from "./JavaScriptSemanticGraphConstruction.js";
import type {
  createSemanticCallableOwnerLookup,
  createSemanticCallSiteLookup,
  createSemanticNodeRangeLookup,
} from "./JavaScriptSemanticGraphProjection.js";

export type BuilderState = ConstructionState;

export interface BuilderInput {
  readonly rootArtifactSha256: string;
  readonly applicationGraph: Pick<
    import("../../domain/javascript/javascriptApplicationGraph.js")["JavaScriptApplicationGraph"],
    "graph_id" | "nodes"
  >;
  readonly analysis: import("./JavaScriptArtifactAnalysisTypes.js")["JavaScriptArtifactAnalysis"];
}

export interface FileContext extends SemanticFlowProjectionContext {
  readonly file: JavaScriptArtifactFile;
  readonly ir: JavaScriptSemanticIr;
  readonly state: BuilderState;
  readonly moduleNode: JavaScriptSemanticGraphNode;
  readonly bindingNodes: ReadonlyMap<string, JavaScriptSemanticGraphNode>;
  readonly callableNodes: ReadonlyMap<string, JavaScriptSemanticGraphNode>;
  readonly callSiteNodes: ReadonlyMap<string, JavaScriptSemanticGraphNode>;
  readonly returnSiteNodes: ReadonlyMap<string, JavaScriptSemanticGraphNode>;
  readonly argumentNodes: Map<string, JavaScriptSemanticGraphNode>;
  readonly referenceNodes: JavaScriptSemanticGraphNode[];
  readonly callResolutions: ReadonlyMap<string, "candidate" | "resolved">;
  readonly callableOwnerAt: ReturnType<
    typeof createSemanticCallableOwnerLookup
  >;
  readonly callSiteAt?: ReturnType<typeof createSemanticCallSiteLookup>;
  readonly referenceNodesWithin?: ReturnType<
    typeof createSemanticNodeRangeLookup
  >;
}

import type { ToolResultDelivery } from "./toolResult.js";
import type { EvidenceMcpServer } from "./EvidenceMcpServer.js";
import type {
  EvidenceWriter,
  UnknownRegistryPort,
} from "../application/investigation/InvestigationRecordPort.js";
import type {
  CallToolResult,
  ServerContext,
} from "@modelcontextprotocol/server";

import type { AnalysisOperationPort } from "../application/AnalysisProvider.js";
import type { BinarySessionPort } from "../application/binary/BinarySessionPort.js";
import { EnhancedTools } from "../application/EnhancedTools.js";
import type { ValidatedEnhancedCall } from "../application/EnhancedToolTypes.js";
import {
  executeComposedWorkflow,
  createWorkflowEvidence,
  workflowSnapshotRecord,
  recordWorkflowUnknowns,
} from "../application/WorkflowEvidence.js";
import { toolContract } from "../contracts/toolContracts.js";
import type { ToolContract } from "../contracts/toolContractTypes.js";
import type { AnalysisProfileCommitment } from "../domain/analysisProfile.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import type { JsonValue } from "../domain/jsonValue.js";
import type { Logger } from "pino";
import { mcpProgressReporter } from "./mcpProgress.js";
import { logToolExecution } from "./toolLogging.js";
import { toolRegistrationOptions } from "./toolRegistrationOptions.js";
import { executeFunctionAnalysisEvidence } from "../application/FunctionAnalysisEvidence.js";
import type { WithAdmittedAnalysis } from "./analysisAdmission.js";

/** Optional session services used by enhanced tool registration. */
export interface EnhancedToolRegistration {
  readonly withAdmittedAnalysis: WithAdmittedAnalysis;
  readonly logger: Logger;
  readonly activeTarget: (() => BinaryTarget | undefined) | undefined;
  readonly analysisProfile:
    | (() => AnalysisProfileCommitment | undefined)
    | undefined;
  readonly recordEvidence: EvidenceWriter["recordEvidence"] | undefined;
  readonly recordUnknown: UnknownRegistryPort["recordUnknown"] | undefined;
  readonly allowsSnapshotReplay:
    | ((operation: ValidatedEnhancedCall["name"]) => boolean)
    | undefined;
  readonly recordWorkflowSnapshot:
    | ((
        input: Parameters<BinarySessionPort["recordWorkflowSnapshot"]>[0],
      ) => ReturnType<BinarySessionPort["recordWorkflowSnapshot"]>)
    | undefined;
}

/** Register composed workflows against the same port as direct bridge tools. */
// oxlint-disable-next-line max-lines-per-function -- direct SDK calls retain each schema-handler type correlation.
export const registerEnhancedTools = (
  server: EvidenceMcpServer,
  options: EnhancedToolRegistration,
): void => {
  const registration = { ...options, delivery: server.delivery };
  const nativeDispatchMetadata = toolContract(
    "inspect_native_dispatch_metadata",
  );
  const objcClasses = toolContract("get_objc_classes");
  const objcProtocols = toolContract("get_objc_protocols");
  const batchDecompile = toolContract("batch_decompile");
  const callGraph = toolContract("get_call_graph");
  const swiftTypes = toolContract("analyze_swift_types");
  const xrefsToName = toolContract("find_xrefs_to_name");
  const binaryOverview = toolContract("binary_overview");
  const analyzeFunction = toolContract("analyze_function");
  const inspectNativeApi = toolContract("inspect_native_api");
  const traceFeature = toolContract("trace_feature");
  const traceCallPath = toolContract("trace_call_path");
  const traceNativeUiAction = toolContract("trace_native_ui_action");
  const traceNativeValues = toolContract("trace_native_values");
  server.registerTool(
    traceNativeValues.name,
    toolRegistrationOptions(traceNativeValues),
    (input, context) =>
      executeEnhancedTool(registration, traceNativeValues, {
        validatedCall: { name: "trace_native_values", input },
        context,
      }),
  );
  server.registerTool(
    nativeDispatchMetadata.name,
    toolRegistrationOptions(nativeDispatchMetadata),
    (input, context) =>
      executeEnhancedTool(registration, nativeDispatchMetadata, {
        validatedCall: { name: "inspect_native_dispatch_metadata", input },
        context,
      }),
  );
  server.registerTool(
    objcClasses.name,
    toolRegistrationOptions(objcClasses),
    (input, context) =>
      executeEnhancedTool(registration, objcClasses, {
        validatedCall: { name: "get_objc_classes", input },
        context,
      }),
  );
  server.registerTool(
    objcProtocols.name,
    toolRegistrationOptions(objcProtocols),
    (input, context) =>
      executeEnhancedTool(registration, objcProtocols, {
        validatedCall: { name: "get_objc_protocols", input },
        context,
      }),
  );
  server.registerTool(
    batchDecompile.name,
    toolRegistrationOptions(batchDecompile),
    (input, context) =>
      executeEnhancedTool(registration, batchDecompile, {
        validatedCall: { name: "batch_decompile", input },
        context,
      }),
  );
  server.registerTool(
    callGraph.name,
    toolRegistrationOptions(callGraph),
    (input, context) =>
      executeEnhancedTool(registration, callGraph, {
        validatedCall: { name: "get_call_graph", input },
        context,
      }),
  );
  server.registerTool(
    swiftTypes.name,
    toolRegistrationOptions(swiftTypes),
    (input, context) =>
      executeEnhancedTool(registration, swiftTypes, {
        validatedCall: { name: "analyze_swift_types", input },
        context,
      }),
  );
  server.registerTool(
    xrefsToName.name,
    toolRegistrationOptions(xrefsToName),
    (input, context) =>
      executeEnhancedTool(registration, xrefsToName, {
        validatedCall: { name: "find_xrefs_to_name", input },
        context,
      }),
  );
  server.registerTool(
    binaryOverview.name,
    toolRegistrationOptions(binaryOverview),
    (input, context) =>
      executeEnhancedTool(registration, binaryOverview, {
        validatedCall: { name: "binary_overview", input },
        context,
      }),
  );
  server.registerTool(
    analyzeFunction.name,
    toolRegistrationOptions(analyzeFunction),
    (input, context) =>
      executeEnhancedTool(registration, analyzeFunction, {
        validatedCall: { name: "analyze_function", input },
        context,
      }),
  );
  server.registerTool(
    inspectNativeApi.name,
    toolRegistrationOptions(inspectNativeApi),
    (input, context) =>
      executeEnhancedTool(registration, inspectNativeApi, {
        validatedCall: { name: "inspect_native_api", input },
        context,
      }),
  );
  server.registerTool(
    traceFeature.name,
    toolRegistrationOptions(traceFeature),
    (input, context) =>
      executeEnhancedTool(registration, traceFeature, {
        validatedCall: { name: "trace_feature", input },
        context,
      }),
  );
  server.registerTool(
    traceCallPath.name,
    toolRegistrationOptions(traceCallPath),
    (input, context) =>
      executeEnhancedTool(registration, traceCallPath, {
        validatedCall: { name: "trace_call_path", input },
        context,
      }),
  );
  server.registerTool(
    traceNativeUiAction.name,
    toolRegistrationOptions(traceNativeUiAction),
    (input, context) =>
      executeEnhancedTool(registration, traceNativeUiAction, {
        validatedCall: { name: "trace_native_ui_action", input },
        context,
      }),
  );
};

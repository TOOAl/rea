import type { ToolResultDelivery } from "./toolResult.js";
import type {
  EvidenceWriter,
  UnknownRegistryPort,
} from "../application/investigation/InvestigationRecordPort.js";
import type {
  CallToolResult,
  ServerContext,
} from "@modelcontextprotocol/server";

import type { AnalysisOperationPort } from "../application/AnalysisProvider.js";
import { EnhancedTools } from "../application/EnhancedTools.js";
import type { ValidatedEnhancedCall } from "../application/EnhancedToolTypes.js";
import {
  executeComposedWorkflow,
  createWorkflowEvidence,
  workflowSnapshotRecord,
  recordWorkflowUnknowns,
} from "../application/WorkflowEvidence.js";
import type { ToolContract } from "../contracts/toolContractTypes.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import type { JsonValue } from "../domain/jsonValue.js";
import { mcpProgressReporter } from "./mcpProgress.js";
import { logToolExecution } from "./toolLogging.js";
import { executeFunctionAnalysisEvidence } from "../application/FunctionAnalysisEvidence.js";

/** Optional session services used by enhanced tool registration. */

const executeEnhancedTool = async (
  registration: EnhancedToolRegistration & {
    readonly delivery: ToolResultDelivery;
  },
  contract: ToolContract,
  request: {
    readonly validatedCall: ValidatedEnhancedCall;
    readonly context: ServerContext;
  },
): Promise<CallToolResult> => {
  const admitted = await registration.withAdmittedAnalysis(
    request.validatedCall.name,
    request.context.mcpReq.signal,
    async (admittedAnalysis) => {
      const { validatedCall, context } = request;
      const name = validatedCall.name;
      const progress = mcpProgressReporter(context);
      await progress.report({
        phase: name,
        completed: 0,
        total: 1,
        message: "started",
      });
      const parsedInput = validatedCall.input;
      const parameters = jsonParameters(parsedInput);
      if (name === "analyze_function")
        return executeFunctionTool(admittedAnalysis, registration, contract, {
          context,
          parameters,
        });
      const analysis: AnalysisOperationPort = {
        execute: (operation, operationParameters, executionOptions) =>
          admittedAnalysis.execute(operation, operationParameters, {
            ...executionOptions,
            progress,
          }),
      };
      const result = await logToolExecution(registration.logger, name, () =>
        executeComposedWorkflow(analysis, (observed) =>
          new EnhancedTools(observed).executeValidated(
            validatedCall,
            context.mcpReq.signal,
          ),
        ),
      );
      await progress.report({
        phase: name,
        completed: 1,
        total: 1,
        message: result.ok ? "completed" : "failed",
        terminal: true,
      });
      if (result.ok) {
        const evidence = createWorkflowEvidence({
          target: registration.activeTarget?.(),
          operation: name,
          parameters,
          result: result.value.result,
          upstreamProfile: registration.analysisProfile?.(),
          upstreamLimitations: result.value.limitations,
        });
        const recorded = registration.recordEvidence?.(evidence);
        if (recorded !== undefined && !recorded.ok)
          return registration.delivery.toCallToolResult(recorded, contract);
        if (
          name !== "trace_native_ui_action" &&
          registration.allowsSnapshotReplay?.(name) === true
        ) {
          const workflowRecord = workflowSnapshotRecord(evidence, name);
          if (workflowRecord !== undefined) {
            const snapshot =
              registration.recordWorkflowSnapshot?.(workflowRecord);
            if (snapshot !== undefined && !snapshot.ok)
              return registration.delivery.toCallToolResult(snapshot, contract);
          }
        }
        const unknowns = recordWorkflowUnknowns({
          name,
          result: result.value.result,
          evidenceId: evidence.evidence_id,
          recordUnknown: registration.recordUnknown,
        });
        if (!unknowns.ok)
          return registration.delivery.toCallToolResult(unknowns, contract);
        return registration.delivery.toEvidenceToolResult(
          evidence,
          contract,
          recorded,
        );
      }
      return registration.delivery.toCallToolResult(result, contract);
    },
  );
  return admitted.ok
    ? admitted.value
    : registration.delivery.toCallToolResult(admitted, contract);
};

const executeFunctionTool = async (
  analysis: AnalysisOperationPort,
  registration: EnhancedToolRegistration & {
    readonly delivery: ToolResultDelivery;
  },
  contract: ToolContract,
  request: {
    readonly context: ServerContext;
    readonly parameters: Readonly<Record<string, JsonValue>>;
  },
): Promise<CallToolResult> => {
  const { context, parameters } = request;
  const progress = mcpProgressReporter(context);
  const result = await logToolExecution(
    registration.logger,
    "analyze_function",
    () =>
      executeFunctionAnalysisEvidence(
        analysis,
        parameters,
        registration.activeTarget?.(),
        {
          signal: context.mcpReq.signal,
          progress,
        },
      ),
  );
  await progress.report({
    phase: "analyze_function",
    completed: 1,
    total: 1,
    message: result.ok ? "completed" : "failed",
    terminal: true,
  });
  if (!result.ok)
    return registration.delivery.toCallToolResult(result, contract);
  return registration.delivery.toEvidenceToolResult(
    result.value,
    contract,
    registration.recordEvidence?.(result.value),
  );
};

const jsonParameters = (
  input: Readonly<Record<string, JsonValue | undefined>>,
): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, JsonValue] => entry[1] !== undefined,
    ),
  );

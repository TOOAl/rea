import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
import type { ElectronSenderValidationFinding } from "../../domain/javascript/electronStaticAnalysisTypes.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  artifactLocalIdentity,
  javascriptAnalysisCoverage,
  type JavaScriptArtifactGraphContext,
  type JavaScriptArtifactGraphCoverage,
} from "./JavaScriptArtifactGraphContext.js";
import {
  astObservationEvidence,
  staticInferenceEvidence,
} from "./JavaScriptArtifactGraphEvidence.js";
import {
  collectElectronIpcRecords,
  unambiguousElectronIpcPairings,
  type ElectronIpcRecord,
} from "./ElectronBoundaryAnalysis.js";
import {
  addElectronAstEdge,
  addElectronInferenceEdge,
  electronFindingSourceNode,
  electronObservationIdentity,
  electronRangeContains,
  electronRangeKey,
} from "./ElectronBoundaryGraphContext.js";

interface IpcGraphState {
  readonly context: JavaScriptArtifactGraphContext;
  readonly records: readonly ElectronIpcRecord[];
  readonly channels: Map<string, ApplicationNode>;
  readonly handlers: Map<string, ApplicationNode>;
  readonly sources: Map<string, ApplicationNode>;
}

interface IpcHandlerInput {
  readonly context: JavaScriptArtifactGraphContext;
  readonly record: ElectronIpcRecord;
  readonly source: ApplicationNode;
  readonly channel: ApplicationNode;
  readonly coverage: JavaScriptArtifactGraphCoverage;
}

interface ValidationObservationInput {
  readonly context: JavaScriptArtifactGraphContext;
  readonly file: JavaScriptArtifactFile;
  readonly validation: ElectronSenderValidationFinding;
  readonly target: ApplicationNode;
  readonly coverage: JavaScriptArtifactGraphCoverage;
}

/** Project IPC syntax, handler locations, validations, and exact pairings. */
export const addElectronIpcBoundaries = (
  context: JavaScriptArtifactGraphContext,
): void => {
  const state: IpcGraphState = {
    context,
    records: collectElectronIpcRecords(context.analysis),
    channels: new Map(),
    handlers: new Map(),
    sources: new Map(),
  };
  for (const record of state.records) addIpcRecord(state, record);
  addValidationObservations(state);
  addLiteralPairings(state);
};

const addIpcRecord = (
  state: IpcGraphState,
  record: ElectronIpcRecord,
): void => {
  const { context } = state;
  const coverage = coverageFor(context, record.file);
  if (coverage === undefined) return;
  const source = electronFindingSourceNode(
    context,
    record.file,
    record.finding.module_key,
    record.finding.module_runtime,
  );
  if (source === undefined) return;
  state.sources.set(record.key, source);
  const channel = addChannelNode(context, record, coverage);
  state.channels.set(record.key, channel);
  if (record.finding.mode === "listen" || record.finding.mode === "handle") {
    const handler = addHandlerNode({
      context,
      record,
      source,
      channel,
      coverage,
    });
    state.handlers.set(record.key, handler);
    return;
  }
  addElectronInferenceEdge(context, {
    source,
    target: channel,
    file: record.file,
    range: record.finding.location,
    coverage,
    relation: record.finding.mode === "invoke" ? "invokes" : "sends",
    operation: "map-ipc-transmission",
    properties: {
      side: record.finding.side,
      operation: record.finding.operation,
      channel: record.finding.channel,
      channel_expression: record.finding.channel_expression,
      resolution: record.finding.channel === null ? "dynamic" : "literal",
    },
  });
};

const addChannelNode = (
  context: JavaScriptArtifactGraphContext,
  record: ElectronIpcRecord,
  coverage: JavaScriptArtifactGraphCoverage,
): ApplicationNode => {
  const { finding, file } = record;
  const identityKey =
    finding.channel === null
      ? `dynamic:${record.key}`
      : `literal:${finding.channel}`;
  return context.accumulator.addNode({
    kind: "ipc-channel",
    identity:
      finding.resolution_basis === "wrapper-substitution"
        ? artifactLocalIdentity(
            file.sha256,
            "electron-inferred-ipc-channel",
            identityKey,
          )
        : electronObservationIdentity(
            context,
            "electron-ipc-channel",
            identityKey,
          ),
    observations: [
      {
        label: finding.channel ?? finding.channel_expression,
        properties: {
          side: finding.side,
          operation: finding.operation,
          mode: finding.mode,
          channel: finding.channel,
          channel_expression: finding.channel_expression,
          resolution: finding.channel === null ? "dynamic" : "literal",
          ...(finding.invocation_location === undefined
            ? {}
            : { invocation_location: finding.invocation_location }),
        },
        evidence: (finding.resolution_basis === "wrapper-substitution"
          ? staticInferenceEvidence
          : astObservationEvidence)({
          sha256: file.sha256,
          path: file.path,
          range: finding.location,
          operation: "observe-ipc-channel-expression",
          coverage,
          limitations:
            finding.resolution_basis === "wrapper-substitution"
              ? [
                  "The channel is inferred through lexical wrapper substitution; runtime registration and dispatch remain unverified.",
                ]
              : finding.channel === null
                ? [
                    "The channel expression is dynamic; its runtime value and pairings remain unknown.",
                  ]
                : [],
        }),
      },
    ],
  });
};

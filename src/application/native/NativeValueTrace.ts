import { functionDossierSchema } from "../../domain/hopperValues.js";
import { nativeCallTargetsSchema } from "../../domain/native/nativeInstruction.js";
import {
  nativeValueTraceInputSchema,
  nativeValueTraceSchema,
} from "../../domain/native/nativeValueTrace.js";
import { createEvidence } from "../../domain/evidence.js";
import {
  AnalysisCancelledError,
  AnalysisOutputError,
} from "../../domain/analysisErrorCore.js";
import { err, ok } from "../../domain/result.js";
import type { AnalysisOperationPort } from "../AnalysisProvider.js";
import type { EnhancedResult } from "../EnhancedToolTypes.js";
import { jsonParts } from "../../domain/jsonSerialization.js";
import {
  renderSourceLimitations,
  type SourceLimitation,
} from "../SourceLimitations.js";

const NODE_PAYLOAD_BYTES = 8 * 1024 * 1024;

type TraceNode = (typeof nativeValueTraceSchema._output.nodes)[number];
type TraceEdge = (typeof nativeValueTraceSchema._output.edges)[number];
type TraceContext = {
  readonly input: ReturnType<typeof nativeValueTraceInputSchema.parse>;
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
  readonly unknowns: (typeof nativeValueTraceSchema._output.unknowns)[number][];
  readonly sourceLimitations: SourceLimitation[];
  readonly callBindings: {
    caller: string;
    callee: string;
    call: string;
    argument_count: number;
    output: boolean;
    evidence_id: string;
  }[];
  readonly procedures: (typeof nativeValueTraceSchema._output.procedures);
  truncated: boolean;
  decompilations: number;
  callSites: number;
  bytes: number;
  nodeBudgetReached: boolean;
};

const createNodeRetainer = (ctx: TraceContext) => {
  return (value: TraceNode): boolean => {
    if (ctx.nodeBudgetReached) return false;
    if (ctx.nodes.length >= ctx.input.max_nodes) {
      ctx.truncated = true;
      ctx.nodeBudgetReached = true;
      return false;
    }
    let size = 0;
    for (const part of jsonParts(value)) {
      size += Buffer.byteLength(part);
      if (size > NODE_PAYLOAD_BYTES - ctx.bytes) {
        ctx.truncated = true;
        ctx.nodeBudgetReached = true;
        return false;
      }
    }
    ctx.bytes += size;
    ctx.nodes.push(value);
    return true;
  };
};

const appendOperationNodes = (input: {
  readonly flow: NonNullable<ReturnType<typeof functionDossierSchema.parse>["native_value_flow"]>;
  readonly address: string;
  readonly evidenceId: string;
  readonly retainNode: (value: TraceNode) => boolean;
  readonly ids: Set<string>;
}): Set<string> => {
  const operationIds = new Set<string>();
  for (const operation of input.flow.operations) {
    if (
      operation.block_membership === "detached" ||
      (operation.block_membership === "unavailable" && operation.is_dead)
    )
      continue;
    const node: TraceNode = {
      id: `${input.address}/${operation.id}`,
      procedure: input.address,
      evidence_id: input.evidenceId,
      operation,
      kind: "operation" as const,
      parameter: null,
    };
    if (!input.retainNode(node)) break;
    input.ids.add(operation.id);
    operationIds.add(operation.id);
  }
  return operationIds;
};

const appendParameterNodes = (input: {
  readonly flow: NonNullable<ReturnType<typeof functionDossierSchema.parse>["native_value_flow"]>;
  readonly address: string;
  readonly evidenceId: string;
  readonly retainNode: (value: TraceNode) => boolean;
  readonly operationIds: Set<string>;
  readonly parameterIds: Map<number, string>;
}): void => {
  for (const parameter of input.flow.parameters) {
    const parameterId = `parameter:${parameter.ordinal}`;
    let localId = parameterId;
    for (let suffix = 1; input.operationIds.has(localId); suffix++) localId = `${parameterId}#${suffix}`;
    const id = `${input.address}/${localId}`;
    if (
      !input.retainNode({
        id,
        procedure: input.address,
        evidence_id: input.evidenceId,
        kind: "parameter",
        operation: null,
        parameter,
      })
    )
      break;
    input.parameterIds.set(parameter.ordinal, id);
  }
};

const appendParameterUseEdges = (input: {
  readonly flow: NonNullable<ReturnType<typeof functionDossierSchema.parse>["native_value_flow"]>;
  readonly address: string;
  readonly evidenceId: string;
  readonly parameterIds: Map<number, string>;
  readonly ids: Set<string>;
  readonly ctx: TraceContext;
}): void => {
  for (const use of input.flow.parameter_uses) {
    const source = input.parameterIds.get(use.ordinal);
    if (!input.ids.has(use.use) || source === undefined) continue;
    if (input.ctx.edges.length >= input.ctx.input.max_edges) {
      input.ctx.truncated = true;
      break;
    }
    input.ctx.edges.push({
      source,
      target: `${input.address}/${use.use}`,
      input_index: use.input_index,
      kind: "parameter-use",
      status: "derived",
      evidence_id: input.evidenceId,
    });
  }
};

const appendDefUseEdges = (input: {
  readonly flow: NonNullable<ReturnType<typeof functionDossierSchema.parse>["native_value_flow"]>;
  readonly address: string;
  readonly evidenceId: string;
  readonly ids: Set<string>;
  readonly ctx: TraceContext;
}): void => {
  for (const edge of input.flow.def_use) {
    if (!input.ids.has(edge.definition) || !input.ids.has(edge.use)) continue;
    if (input.ctx.edges.length >= input.ctx.input.max_edges) {
      input.ctx.truncated = true;
      break;
    }
    input.ctx.edges.push({
      source: `${input.address}/${edge.definition}`,
      target: `${input.address}/${edge.use}`,
      input_index: edge.input_index,
      kind: "def-use",
      status: "derived",
      evidence_id: input.evidenceId,
    });
  }
};

const resolveCallTargets = async (input: {
  readonly flow: NonNullable<ReturnType<typeof functionDossierSchema.parse>["native_value_flow"]>;
  readonly address: string;
  readonly evidenceId: string;
  readonly ids: Set<string>;
  readonly ctx: TraceContext;
  readonly analysis: AnalysisOperationPort;
  readonly next: { procedure: string; depth: number };
  readonly pending: { procedure: string; depth: number }[];
  readonly visited: Set<string>;
  readonly signal: AbortSignal | undefined;
}): Promise<EnhancedResult | undefined> => {
  for (const operation of input.flow.operations) {
    if (!input.ids.has(operation.id) || !["CALL", "CALLIND"].includes(operation.opcode))
      continue;
    if (input.ctx.callSites >= input.ctx.input.max_call_sites) {
      input.ctx.truncated = true;
      input.ctx.unknowns.push({
        procedure: input.address,
        address: operation.address,
        reason: "Call-site resolution budget reached",
      });
      break;
    }
    input.ctx.callSites++;
    const resolved = await input.analysis.execute(
      "resolve_native_call_targets",
      { address: operation.address },
      input.signal === undefined ? {} : { signal: input.signal },
    );
    if (!resolved.ok) {
      if (resolved.error._tag === "AnalysisCancelledError") return err(resolved.error);
      input.ctx.unknowns.push({
        procedure: input.address,
        address: operation.address,
        reason: resolved.error.message,
      });
      continue;
    }
    const targets = nativeCallTargetsSchema.safeParse(resolved.value.result);
    if (!targets.success)
      return err(new AnalysisOutputError("resolve_native_call_targets", "Invalid static call resolution"));
    input.ctx.sourceLimitations.push(
      ...targets.data.limitations.map((limitation) => ({
        provider: resolved.value.provider,
        operation: "resolve_native_call_targets" as const,
        limitation,
      })),
    );
    if (targets.data.targets.length === 0)
      input.ctx.unknowns.push({
        procedure: input.address,
        address: operation.address,
        reason: `Call target ${targets.data.status}`,
      });
    for (const target of targets.data.targets) {
      if (input.ctx.edges.length >= input.ctx.input.max_edges) {
        input.ctx.truncated = true;
        break;
      }
      const destination = target.procedure ?? target.address;
      input.ctx.edges.push({
        source: `${input.address}/${operation.id}`,
        target: destination,
        input_index: null,
        kind: "call",
        status: target.status,
        evidence_id: input.evidenceId,
      });
      if (target.status !== "candidate")
        input.ctx.callBindings.push({
          caller: input.address,
          callee: destination,
          call: `${input.address}/${operation.id}`,
          argument_count: Math.max(0, operation.inputs.length - 1),
          output: operation.output !== null,
          evidence_id: input.evidenceId,
        });
      if (input.next.depth < input.ctx.input.max_depth && target.status !== "candidate")
        input.pending.push({ procedure: destination, depth: input.next.depth + 1 });
      else if (!input.visited.has(destination)) {
        input.ctx.truncated = true;
        input.ctx.unknowns.push({
          procedure: input.address,
          address: operation.address,
          reason: target.status === "candidate" ? "Ambiguous call candidates were not traversed" : "Call depth budget reached",
        });
      }
    }
  }
  return undefined;
};

/** Compose bounded high-p-code def-use graphs across exactly referenced call destinations. */
export const traceNativeValues = async (
  analysis: AnalysisOperationPort,
  parameters: unknown,
  signal?: AbortSignal,
): EnhancedResult => {
  const input = nativeValueTraceInputSchema.parse(parameters);
  const ctx: TraceContext = {
    input,
    nodes: [],
    edges: [],
    procedures: [],
    unknowns: [],
    sourceLimitations: [],
    callBindings: [],
    truncated: false,
    decompilations: 0,
    callSites: 0,
    bytes: 0,
    nodeBudgetReached: false,
  };
  const procedures = ctx.procedures;
  const pending = [{ procedure: input.procedure, depth: 0 }];
  const attempted = new Set<string>();
  const visited = new Set<string>();
  let targetSha256: string | undefined;
  const retainNode = createNodeRetainer(ctx);
  while (pending.length > 0) {
    if (signal?.aborted) return err(new AnalysisCancelledError("trace_native_values"));
    const next = pending.shift();
    if (next === undefined || attempted.has(next.procedure) || visited.has(next.procedure)) continue;
    if (ctx.decompilations >= input.max_functions) {
      ctx.truncated = true;
      ctx.unknowns.push({ procedure: next.procedure, address: null, reason: "decompilation budget reached" });
      break;
    }
    attempted.add(next.procedure);
    const execution = await analysis.execute("analyze_function", { procedure: next.procedure }, { ...(signal === undefined ? {} : { signal }), ...(next.depth > 0 ? { selectorOrigin: "provider" as const } : {}) });
    ctx.decompilations++;
    if (!execution.ok) {
      if (execution.error._tag === "AnalysisCancelledError") return err(execution.error);
      ctx.unknowns.push({ procedure: next.procedure, address: null, reason: execution.error.message });
      continue;
    }
    const parsed = functionDossierSchema.safeParse(execution.value.result);
    if (!parsed.success || execution.value.subject === null)
      return err(new AnalysisOutputError("trace_native_values", "Function dossier lacks validated facts or artifact identity"));
    const dossier = parsed.data;
    const address = dossier.procedure.address;
    if (visited.has(address)) continue;
    visited.add(next.procedure);
    visited.add(address);
    targetSha256 ??= execution.value.subject.sha256;
    if (execution.value.subject.sha256 !== targetSha256) return err(new AnalysisOutputError("trace_native_values", "Cross-function target digest mismatch"));
    const evidence = createEvidence(execution.value.subject, execution.value.provider, { operation: "analyze_function", parameters: { procedure: next.procedure }, result: execution.value.result, rawResult: execution.value.rawResult, limitations: execution.value.limitations, locations: execution.value.locations, ...(execution.value.analysisProfile === undefined ? {} : { analysisProfile: execution.value.analysisProfile }) });
    const evidenceId = evidence.evidence_id;
    procedures.push({ address, depth: next.depth, evidence_id: evidenceId, provider: execution.value.provider.id, analysis_profile_digest: execution.value.analysisProfile?.digest ?? null });
    const flow = dossier.native_value_flow;
    if (flow === null || !flow.available) {
      ctx.unknowns.push({ procedure: address, address: null, reason: flow?.reason ?? "Provider has no native def-use model" });
      continue;
    }
    if (flow.truncated) {
      ctx.truncated = true;
      ctx.unknowns.push({ procedure: address, address: null, reason: "Provider p-code was truncated" });
    }
    const ids = new Set<string>();
    const operationIds = appendOperationNodes({ flow, address, evidenceId, retainNode, ids });
    const parameterIds = new Map<number, string>();
    appendParameterNodes({ flow, address, evidenceId, retainNode, operationIds, parameterIds });
    appendParameterUseEdges({ flow, address, evidenceId, parameterIds, ids, ctx });
    appendDefUseEdges({ flow, address, evidenceId, ids, ctx });
    const callResult = await resolveCallTargets({ flow, address, evidenceId, ids, ctx, analysis, next, pending, visited, signal });
    if (callResult !== undefined) return callResult;
    if (ctx.truncated && (ctx.nodeBudgetReached || ctx.nodes.length >= input.max_nodes || ctx.edges.length >= input.max_edges || ctx.bytes >= NODE_PAYLOAD_BYTES)) break;
  }
  if (targetSha256 === undefined) return err(new AnalysisOutputError("trace_native_values", "No seed function could be analyzed"));
  const parametersByProcedure = new Map<string, typeof ctx.nodes>();
  const returnsByProcedure = new Map<string, typeof ctx.nodes>();
  for (const node of ctx.nodes) {
    if (node.kind === "parameter") {
      const parameters = parametersByProcedure.get(node.procedure) ?? [];
      parameters.push(node);
      parametersByProcedure.set(node.procedure, parameters);
    } else if (node.operation?.opcode === "RETURN" && node.operation.inputs.length > 1) {
      const returns = returnsByProcedure.get(node.procedure) ?? [];
      returns.push(node);
      returnsByProcedure.set(node.procedure, returns);
    }
  }
  for (const binding of ctx.callBindings) {
    const parameters = parametersByProcedure.get(binding.callee) ?? [];
    if (parameters.length === 0) ctx.unknowns.push({ procedure: binding.caller, address: null, reason: `Parameter bindings for ${binding.callee} are unavailable or omitted` });
    for (const node of parameters) {
      const ordinal = node.parameter?.ordinal;
      if (ordinal === undefined || ordinal >= binding.argument_count) {
        ctx.unknowns.push({ procedure: binding.caller, address: null, reason: `Argument ${ordinal ?? "unknown"} for ${binding.callee} was not recovered` });
        continue;
      }
      if (ctx.edges.length >= input.max_edges) { ctx.truncated = true; break; }
      ctx.edges.push({ source: binding.call, target: node.id, input_index: ordinal + 1, kind: "argument-binding", status: "derived", evidence_id: binding.evidence_id });
    }
    if (binding.output) for (const node of returnsByProcedure.get(binding.callee) ?? []) {
      if (ctx.edges.length >= input.max_edges) { ctx.truncated = true; break; }
      ctx.edges.push({ source: node.id, target: binding.call, input_index: 1, kind: "return-binding", status: "derived", evidence_id: node.evidence_id });
    }
  }
  const page = ctx.nodes.slice(input.offset, input.offset + input.limit);
  const pageIds = new Set(page.map(({ id }) => id));
  const result = nativeValueTraceSchema.parse({ seed: input.procedure, target_sha256: targetSha256, nodes: page, edges: ctx.edges.filter(({ source }) => pageIds.has(source)), procedures, unknowns: ctx.unknowns, total_nodes: ctx.nodes.length, total_edges: ctx.edges.length, decompilations: ctx.decompilations, next_offset: input.offset + page.length < ctx.nodes.length ? input.offset + page.length : null, truncated: ctx.truncated || page.length !== ctx.nodes.length, limitations: ["Static decompiler def-use graphs cover recovered block members; when membership is unavailable they exclude operations marked dead. Logical CALL argument positions bind to recovered HighParam ordinals and RETURN values bind to recovered CALL outputs; these are decompiler-derived dependencies, not original source or runtime observations. Missing parameters, variadic arguments and alias dependencies remain unknown.", "LOAD and STORE are memory operations; object fields, persistent state and RNG semantics are not inferred from names or pseudocode.", "Traversal caps depth, decompilations, call-site resolutions, nodes, edges and node payloads (8 MiB). Complete serialized output is bounded to 32 MiB. Pagination reruns analysis and returns edges whose source is on the node page; endpoints outside the page retain stable identities.", ...renderSourceLimitations(ctx.sourceLimitations)] });
  if (Buffer.byteLength(JSON.stringify(result)) > 32 * 1024 * 1024) return err(new AnalysisOutputError("trace_native_values", "Graph output exceeds 32 MiB; lower max_nodes, max_edges or page limit"));
  return ok(result);
};

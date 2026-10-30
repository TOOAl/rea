import { z } from "zod";

import type { AnalysisOperationPort } from "../AnalysisProvider.js";
import {
  nativeInvestigationGraphSchema,
  nativeInvestigationTraceSchema,
  joinInterfaceBuilderDispatch,
} from "../../domain/native/nativeInvestigationGraph.js";
import { readNativeCallRoutes } from "./NativeCallRoutes.js";
import type { SourceLimitation } from "../SourceLimitations.js";

// src/application/native/NativeUiActionTracePart2.ts

const addDirectCallees = async (input: {
  readonly analysis: AnalysisOperationPort;
  readonly graph: z.infer<typeof nativeInvestigationGraphSchema>;
  readonly initial: z.infer<typeof nativeInvestigationTraceSchema>;
  readonly input: Input;
  readonly targetSha256: string;
  readonly signal: AbortSignal | undefined;
}) => {
  const nodes = new Map(input.initial.nodes.map((node) => [node.id, node]));
  const edges = new Map(
    [...input.initial.edges, ...input.initial.unresolved].map((edge) => [
      edge.id,
      edge,
    ]),
  );
  const addressNames = new Map<string, string>();
  const depthByNode = graphNodeDepths(
    input.initial.start,
    input.initial.nodes,
    input.initial.edges,
  );
  for (const node of nodes.values()) {
    if (node.kind === "function" && node.location?.address !== null)
      addressNames.set(node.location?.address ?? "", node.name);
  }
  const queue = input.initial.nodes.flatMap((node) =>
    node.kind === "function" && node.location?.address != null
      ? [
          {
            node,
            address: node.location.address,
            depth: depthByNode.get(node.id) ?? input.initial.reached_depth,
          },
        ]
      : [],
  );
  const visited = new Set<string>();
  let queueIndex = 0;
  let examined = 0;
  let omitted = 0;
  let truncated = false;
  const sourceLimitations: SourceLimitation[] = [];
  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];
    if (current === undefined || visited.has(current.address)) continue;
    visited.add(current.address);
    if (current.depth >= input.input.max_depth) {
      truncated = true;
      omitted += 1;
      continue;
    }
    if (nodes.size >= input.input.max_nodes) {
      truncated = true;
      omitted += queue.length - queueIndex + 1;
      break;
    }
    const execution = await readNativeCallRoutes(
      input.analysis,
      current.address,
      input.signal,
      "provider",
    );
    examined += 1;
    sourceLimitations.push(
      ...(execution.ok ? execution.value.limitations : execution.limitations),
    );
    if (!execution.ok && execution.error._tag === "AnalysisCancelledError")
      return { error: execution.error };
    const unknowns = execution.ok
      ? execution.value.unknowns
      : execution.unknowns;
    for (const [index, unknown] of unknowns.entries()) {
      if (edges.size >= input.input.max_edges) {
        truncated = true;
        omitted += unknowns.length - index;
        break;
      }
      const id = `unknown-dispatch:${current.address}:${unknown.address}`;
      edges.set(id, {
        id,
        from: current.node.id,
        to: null,
        relation: "indirect_call",
        resolution: "unresolved",
        reason: unknown.reason,
        evidence: [
          {
            kind: "reference",
            provider: unknown.provider,
            description: `${unknown.provider.name} reported an unresolved call: ${unknown.reason}`,
            location: { address: unknown.address, file_offset: null },
            artifact_path: null,
            artifact_sha256: input.targetSha256,
          },
        ],
        limitations: [],
      });
    }
    if (!execution.ok) {
      if (edges.size >= input.input.max_edges) {
        truncated = true;
        omitted += 1;
        continue;
      }
      const id = `unknown-callees:${current.address}`;
      edges.set(id, {
        id,
        from: current.node.id,
        to: null,
        relation: "direct_call",
        resolution: "unresolved",
        reason: projectAnalysisError(execution.error).message,
        evidence: [],
        limitations: [
          "The provider could not enumerate resolved direct callees.",
        ],
      });
      continue;
    }
    for (const [index, route] of execution.value.routes.entries()) {
      const address = route.address;
      if (edges.size >= input.input.max_edges) {
        truncated = true;
        omitted += execution.value.routes.length - index;
        break;
      }
      const targetId = `native:function:${address}`;
      const evidence = [
        {
          kind: "reference" as const,
          provider: execution.value.provider,
          description: `${execution.value.provider.name} reported ${route.relation} from ${current.address} to ${address}`,
          location: { address: route.site, file_offset: null },
          artifact_path: null,
          artifact_sha256: input.targetSha256,
        },
      ];
      if (!nodes.has(targetId)) {
        if (nodes.size >= input.input.max_nodes) {
          truncated = true;
          omitted += 1;
          const id = `unknown-node-bound:${current.address}:${address}`;
          edges.set(id, {
            id,
            from: current.node.id,
            to: null,
            relation: "direct_call",
            resolution: "unresolved",
            reason: "native_trace_node_bound_reached",
            evidence,
            limitations: [],
          });
          continue;
        }
        const name = addressNames.get(address) ?? address;
        const node = {
          id: targetId,
          kind: "function" as const,
          name,
          location: { address, file_offset: null },
          attributes: { resolved_by: execution.value.provider.id },
          evidence,
        };
        nodes.set(targetId, node);
        queue.push({ node, address, depth: current.depth + 1 });
      }
      const edgeId = `call:${current.address}:${route.site}:${address}`;
      edges.set(edgeId, {
        id: edgeId,
        from: current.node.id,
        to: targetId,
        relation: route.relation,
        resolution: route.resolution,
        evidence,
        limitations: [
          "A resolved static call edge does not establish runtime reachability.",
        ],
      });
    }
  }
  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    examined,
    omitted,
    truncated,
    limitations: sourceLimitations,
  };
};

const graphNodeDepths = (
  start: string,
  nodes: readonly z.infer<
    typeof nativeInvestigationGraphSchema
  >["nodes"][number][],
  edges: readonly z.infer<
    typeof nativeInvestigationGraphSchema
  >["edges"][number][],
): ReadonlyMap<string, number> => {
  const known = new Set(nodes.map(({ id }) => id));
  const depths = new Map([[start, 0]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === undefined) continue;
    const depth = depths.get(current) ?? 0;
    for (const edge of edges) {
      if (
        edge.resolution === "unresolved" ||
        edge.from !== current ||
        edge.to === null ||
        !known.has(edge.to) ||
        depths.has(edge.to)
      )
        continue;
      depths.set(edge.to, depth + 1);
      queue.push(edge.to);
    }
  }
  return depths;
};

export const __stub = 1;
//     graph.nodes.length - nodes.length + graph.edges.length - edges.length;
//   const truncated = omitted > 0;
//   return {
//     graph: nativeInvestigationGraphSchema.parse({
//       ...graph,
//       nodes,
//       edges,
//       truncated: graph.truncated || truncated,
//     }),
//     truncated,
//     omitted,
//   };
// };
//
// const resolveUiAction = (
//   graph: z.infer<typeof nativeInvestigationGraphSchema>,
//   query: string,
// ): {
//   readonly nodeId: string | null;
//   readonly candidates: z.infer<typeof nativeInvestigationGraphSchema>["nodes"];
//   readonly reason: string | null;
// } => {
//   const exactId = graph.nodes.find((node) => node.id === query);
//   if (exactId?.kind === "action")
//     return { nodeId: exactId.id, candidates: [], reason: null };
//
//   const actions = graph.nodes.filter(
//     (node) =>
//       node.kind === "action" &&
//       (node.name === query || node.attributes.selector === query),
//   );
//   if (actions.length === 1)
//     return { nodeId: actions[0]?.id ?? null, candidates: [], reason: null };
//   if (actions.length > 1)
//     return {
//       nodeId: null,
//       candidates: actions,
//       reason: "action_selector_matches_multiple_ui_connections",
//     };
//
//   const objectMatches = graph.nodes.filter(
//     (node) =>
//       ["control", "view", "view_controller", "scene"].includes(node.kind) &&
//       (node.id === query ||
//         node.attributes.interface_builder_object_id === query),
//   );
//   const actionIds = new Set(
//     graph.edges.flatMap((edge) =>
//       edge.resolution === "observed" &&
//       edge.relation === "target_action" &&
//       objectMatches.some(({ id }) => edge.from === id) &&
//       graph.nodes.some(({ id, kind }) => id === edge.to && kind === "action")
//         ? [edge.to]
//         : [],
//     ),
//   );
//   if (actionIds.size === 1)
//     return { nodeId: [...actionIds][0] ?? null, candidates: [], reason: null };
//   if (actionIds.size > 1)
//     return {
//       nodeId: null,
//       candidates: graph.nodes.filter(({ id }) => actionIds.has(id)),
//       reason: "interface_object_has_multiple_action_connections",
//     };
//   return {
//     nodeId: null,
//     candidates: [],
//     reason: "ui_action_or_object_not_found",
//   };
// };
//
// const addDirectCallees = async (input: {
//   readonly analysis: AnalysisOperationPort;
//   readonly graph: z.infer<typeof nativeInvestigationGraphSchema>;
//   readonly initial: z.infer<typeof nativeInvestigationTraceSchema>;
//   readonly input: Input;
//   readonly targetSha256: string;
//   readonly signal: AbortSignal | undefined;
// }) => {
//   const nodes = new Map(input.initial.nodes.map((node) => [node.id, node]));
//   const edges = new Map(
//     [...input.initial.edges, ...input.initial.unresolved].map((edge) => [
//       edge.id,
//       edge,
//     ]),
//   );
//   const addressNames = new Map<string, string>();
//   const depthByNode = graphNodeDepths(
//     input.initial.start,
//     input.initial.nodes,
//     input.initial.edges,
//   );
//   for (const node of nodes.values()) {
//     if (node.kind === "function" && node.location?.address !== null)
//       addressNames.set(node.location?.address ?? "", node.name);
//   }
//   const queue = input.initial.nodes.flatMap((node) =>
//     node.kind === "function" && node.location?.address != null
//       ? [
//           {
//             node,
//             address: node.location.address,
//             depth: depthByNode.get(node.id) ?? input.initial.reached_depth,
//           },
//         ]
//       : [],
//   );
//   const visited = new Set<string>();
//   let queueIndex = 0;
//   let examined = 0;
//   let omitted = 0;
//   let truncated = false;
//   const sourceLimitations: SourceLimitation[] = [];
//   while (queueIndex < queue.length) {
//     const current = queue[queueIndex++];
//     if (current === undefined || visited.has(current.address)) continue;
//     visited.add(current.address);
//     if (current.depth >= input.input.max_depth) {
//       truncated = true;
//       omitted += 1;
//       continue;
//     }
//     if (nodes.size >= input.input.max_nodes) {
//       truncated = true;
//       omitted += queue.length - queueIndex + 1;
//       break;
//     }
//     const execution = await readNativeCallRoutes(
//       input.analysis,
//       current.address,
//       input.signal,
//       "provider",
//     );
//     examined += 1;
//     sourceLimitations.push(
//       ...(execution.ok ? execution.value.limitations : execution.limitations),
//     );
//     if (!execution.ok && execution.error._tag === "AnalysisCancelledError")
//       return { error: execution.error };
//     const unknowns = execution.ok
//       ? execution.value.unknowns
//       : execution.unknowns;
//     for (const [index, unknown] of unknowns.entries()) {
//       if (edges.size >= input.input.max_edges) {
//         truncated = true;
//         omitted += unknowns.length - index;
//         break;
//       }
export const _l = 148;

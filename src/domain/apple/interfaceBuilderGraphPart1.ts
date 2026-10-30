export const __stub = 1;
// import { z } from "zod";
//
// import {
//   firstString,
//   parseInterfaceBuilderRecords,
//   record,
// } from "./interfaceBuilderKeyedArchive.js";
// import {
//   nativeInvestigationEdgeSchema,
//   nativeInvestigationGraphSchema,
//   nativeInvestigationNodeSchema,
//   nativeInvestigationTraceLimitsSchema,
// } from "../native/nativeInvestigationGraph.js";
//
// /** One compiled Interface Builder document projected from ibtool output. */
// export const interfaceBuilderDocumentSchema = z.strictObject({
//   relative_path: z.string().min(1),
//   archive_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//   document_kind: z.enum(["nib", "storyboard_scene"]),
//   object_count: z.number().int().nonnegative(),
//   connection_count: z.number().int().nonnegative(),
//   hierarchy_complete: z.boolean(),
// });
//
// /** Normalized read-only Interface Builder graph with archive provenance. */
// export const interfaceBuilderAnalysisSchema = z.strictObject({
//   target_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//   documents: z.array(interfaceBuilderDocumentSchema).max(64),
//   graph: nativeInvestigationGraphSchema,
//   limitations: z.array(z.string()),
// });
//
// export interface InterfaceBuilderDocumentInput {
//   readonly relativePath: string;
//   readonly archiveSha256: string;
//   readonly documentKind: "nib" | "storyboard_scene";
//   readonly raw: unknown;
//   /** Serialized hierarchy links omitted before normalized graph projection. */
//   readonly omittedSerializedHierarchyReferences?: number;
// }
//
// type InvestigationNode = z.infer<typeof nativeInvestigationNodeSchema>;
// type InvestigationEdge = z.infer<typeof nativeInvestigationEdgeSchema>;
//
// /** Build the graph returned by the static Interface Builder archive decoder. */
// export const buildInterfaceBuilderAnalysis = (input: {
//   readonly targetSha256: string;
//   readonly toolVersion: string;
//   readonly documents: readonly InterfaceBuilderDocumentInput[];
//   readonly limits: z.output<typeof interfaceBuilderLimitsSchema>;
// }) => {
//   const nodes = new Map<string, InvestigationNode>();
//   const edges: InvestigationEdge[] = [];
//   const coverage = [] as Array<{
//     facet: string;
//     status: "complete" | "partial" | "unsupported" | "not_requested";
//     reason: string | null;
//     examined: number;
//     omitted: number;
//   }>;
//   const summaries: Array<z.infer<typeof interfaceBuilderDocumentSchema>> = [];
//   let truncated = false;
//   let omittedObjects = 0;
//   let omittedConnections = 0;
//   let omittedGraphNodes = 0;
//   let omittedHierarchyReferences = 0;
//   for (const document of input.documents.slice(0, input.limits.max_documents)) {
//     const parsed = parseInterfaceBuilderRecords(document.raw);
//     const prefix = `ib:${JSON.stringify(document.relativePath)}:`;
//     const graphId = (kind: string, parts: readonly unknown[] = []): string =>
//       `${prefix}${kind}:${JSON.stringify(parts)}`;
//     const rootId = `${prefix}root`;
//     const objectIds = new Set(parsed.objects.map(({ id }) => id));
//     const evidenceFor = (description: string) => [
//       {
//         kind: "interface_builder_resource" as const,
//         // artifact_path names the archive; repeating it here cost a path per
//         // node and edge.
//         description,
//         location: { address: null, file_offset: null },
//         artifact_path: document.relativePath,
//         artifact_sha256: document.archiveSha256,
//       },
//     ];
//     const addNode = (node: InvestigationNode): boolean => {
//       if (nodes.has(node.id)) return true;
//       if (nodes.size >= input.limits.max_objects) {
//         truncated = true;
//         omittedGraphNodes += 1;
//         return false;
//       }
//       nodes.set(node.id, node);
//       return true;
//     };
//     const rootNode = {
//       id: rootId,
//       kind:
//         document.documentKind === "nib"
//           ? ("scene" as const)
//           : ("storyboard" as const),
//       name: document.relativePath,
//       location: null,
//       attributes: { document_kind: document.documentKind },
//       evidence: evidenceFor("compiled document"),
//     };
//     addNode(rootNode);
//     let documentObjectCount = 0;
//     for (const object of parsed.objects.slice(0, input.limits.max_objects)) {
//       const id = graphId("object", [object.id]);
//       const kind = object.kind === "other" ? "unknown" : object.kind;
//       if (
//         !addNode({
//           id,
//           kind,
//           name: object.name,
//           location: null,
//           attributes: {
//             ...object.attributes,
//             interface_builder_object_id: object.id,
//             class_name: object.class_name,
//           },
//           evidence: evidenceFor(`object ${object.id}`),
//         })
//       ) {
//         break;
//       }
//       documentObjectCount += 1;
//     }
//     let connectionEdgeCount = 0;
//     let hierarchyEdgeCount = 0;
//     let documentOmittedConnections = 0;
//     let documentOmittedHierarchyEdges = 0;
//     let hierarchyTruncated = false;
//     const objectNodeId = (objectId: string): string =>
//       graphId("object", [objectId]);
//     const addEdge = (
//       edge: (typeof edges)[number],
//       isHierarchy: boolean,
//     ): void => {
//       if (
//         isHierarchy
//           ? hierarchyEdgeCount >= input.limits.max_objects
//           : connectionEdgeCount >= input.limits.max_connections * 3
//       ) {
//         truncated = true;
//         if (isHierarchy) {
export const _l = 146;

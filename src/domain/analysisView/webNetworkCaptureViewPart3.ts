export const __stub = 1;
//  * is never promoted even if it is still present (imported or caller-supplied
//  * Evidence). A scalar is also inconsistent when a numeric sidecar or byte
//  * descriptor sits on an ancestor (the producer held a scalar there) or any
//  * facet sits beneath it (the producer held a container at it).
//  */
// const usableScalar = (index: FacetIndex, pointer: string): boolean => {
//   const ancestors = ancestorsOf(pointer);
//   return (
//     !index.omittedNames.has(pointer) &&
//     !index.containers.has(pointer) &&
//     !index.withheld.has(pointer) &&
//     !ancestors.some(
//       (ancestor) => index.withheld.has(ancestor) || index.scalars.has(ancestor),
//     )
//   );
// };
// /**
//  * The container format alone does not make a flow HTTP; its own type does,
//  * when the producer supplied that type as text rather than a number or bytes.
//  */
// const textualFlowType = (index: FacetIndex): boolean =>
//   usableScalar(index, "/type") && !index.scalars.has("/type");
// /** Shape checks run first, so the representation check only sees bounded values. */
// const mitmproxyHeadline = (
//   index: FacetIndex,
//   pointer: string,
//   field: string,
//   value: JsonValue,
// ): boolean =>
//   usableScalar(index, pointer) &&
//   headlineShape(field, value) &&
//   representationMatches(
//     field,
//     value,
//     index.sidecars.get(pointer) ?? [],
//     index.bytes.get(pointer) ?? [],
//   );
//
// /** Copy one message side's headlines; mitmproxy fields need the record's facet index. */
// const selectHeadlines = (
//   fields: Readonly<Record<string, JsonValue>>,
//   key: string,
//   facets: FacetIndex | null,
//   selectedPointers: Set<string>,
// ): Record<string, JsonValue> => {
//   const selected: Record<string, JsonValue> = {};
//   const candidates = [
//     ...HEADLINE_FIELDS.map((field) => [field, null] as const),
//     ...(facets === null ? [] : (MITMPROXY_HEADLINE_FIELDS[key] ?? [])).map(
//       (field) => [field, facets] as const,
//     ),
//   ];
//   for (const [field, index] of candidates) {
//     const value = fields[field];
//     if (
//       !Object.hasOwn(fields, field) ||
//       value === undefined ||
//       (index !== null &&
//         !mitmproxyHeadline(index, `/${key}/${field}`, field, value))
//     )
//       continue;
//     selected[field] = value;
//     selectedPointers.add(`/${key}/${field}`);
//   }
//   return selected;
// };
//
// /** Select already parsed producer facts without interpreting HTTP or payload bytes again. */
// const preview = (record: WebNetworkCaptureRecord, format: string) => {
//   const source = object(record.reported);
//   const reported: Record<string, JsonValue> = {};
//   const selectedPointers = new Set<string>();
//   if (source !== null) {
//     const index =
//       format === "mitmproxy" && source.type === "http"
//         ? indexFacets(record)
//         : null;
//     const mitmproxyFacets =
//       index !== null && textualFlowType(index) ? index : null;
//     for (const key of ["session_id", "name", "time", "startedDateTime", "type"])
//       if (Object.hasOwn(source, key) && source[key] !== undefined) {
//         reported[key] = source[key];
//         selectedPointers.add(`/${key}`);
//       }
//     for (const key of ["request", "response"]) {
//       const value = source[key];
//       if (!Object.hasOwn(source, key) || value === undefined) continue;
//       const fields = object(value);
//       if (fields === null) {
//         // Preserve a reported null/scalar instead of inventing HTTP fields.
//         reported[key] = value;
//         continue;
//       }
//       reported[key] = selectHeadlines(
//         fields,
//         key,
//         mitmproxyFacets,
//         selectedPointers,
//       );
//     }
//   }
//   return {
//     ...record,
//     reported: source === null ? record.reported : reported,
//     binary_fields: record.binary_fields.map(
//       ({ content_base64: _content, ...field }) => field,
//     ),
//     numeric_literals:
//       source === null
//         ? record.numeric_literals
//         : record.numeric_literals.filter(({ pointer }) =>
//             selectedPointers.has(pointer),
//           ),
//   };
// };
//
// /** Authenticate the retained report and its subject at one owning boundary. */
// const parseCaptureParent = (
//   parent: AnalysisViewParent,
// ): Result<WebNetworkCapture, AnalysisError> => {
//   const parsed = webNetworkCaptureSchema.safeParse(parent.normalizedResult);
//   if (!parsed.success)
//     return err(
//       analysisInputErrorFromIssues(
//         "inspect_analysis_view",
//         parsed.error.issues.map((issue) => ({
//           ...issue,
//           path: ["source", "normalized_result", ...issue.path],
//         })),
//         { source: { normalized_result: parent.normalizedResult } },
//         { cause: parsed.error },
//       ),
//     );
//   const report = parsed.data;
//   if (
export const _l = 135;

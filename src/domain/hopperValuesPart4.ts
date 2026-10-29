export const __stub = 1;
//   .strict();
//
// /** Strict analyzed-function dossier shared by provider and comparison boundaries. */
// export type FunctionDossier = z.infer<typeof functionDossierSchema>;
//
// /** Strictly parse a complete provider-neutral function dossier. */
// export const parseFunctionDossier = (
//   value: JsonValue,
// ): Result<JsonValue, AnalysisOutputError> => {
//   const parsed = functionDossierSchema.safeParse(value);
//   return parsed.success
//     ? ok(parsed.data)
//     : err(
//         new AnalysisOutputError(
//           "analyze_function",
//           "provider output did not match the dossier contract",
//           { cause: parsed.error },
//         ),
//       );
// };
//
// /** Parse a provider's direct or wrapped procedure map into stable entries. */
// export const parseProcedures = (
//   value: JsonValue,
//   operation = "list_procedures",
// ): Result<readonly AddressedName[], AnalysisOutputError> => {
//   const parsed = procedureMapSchema.safeParse(
//     unwrapProperty(value, "procedures"),
//   );
//   return parsed.success
//     ? ok(
//         Object.entries(parsed.data).map(([address, name]) => ({
//           address,
//           name,
//         })),
//       )
//     : invalid(operation, "procedure map", parsed.error);
// };
//
// /** Parse a provider's direct or wrapped list of address/name records. */
// export const parseNames = (
//   value: JsonValue,
//   operation = "list_names",
// ): Result<readonly AddressedName[], AnalysisOutputError> => {
//   const unwrapped = unwrapProperty(value, "names");
//   const records = addressedNamesSchema.safeParse(unwrapped);
//   if (records.success) return ok(records.data);
//   const map = addressedNameMapSchema.safeParse(unwrapped);
//   return map.success
//     ? ok(Object.entries(map.data).map(([address, name]) => ({ address, name })))
//     : invalid(operation, "name list", map.error);
// };
//
// /** Parse callee/caller strings from direct or wrapped provider results. */
// export const parseRelatedAddresses = (
//   value: JsonValue,
//   relation: "callees" | "callers",
//   operation = relation === "callees"
//     ? "procedure_callees"
//     : "procedure_callers",
// ): Result<readonly string[], AnalysisOutputError> => {
//   const parsed = z.array(z.string()).safeParse(unwrapProperty(value, relation));
//   return parsed.success
//     ? ok(parsed.data)
//     : invalid(operation, `${relation} list`, parsed.error);
// };
//
// /** Preserve reported address context in direct or wrapped provider segments. */
// export const parseSegments = (
//   value: JsonValue,
//   operation = "list_segments",
// ): Result<readonly SegmentSummary[], AnalysisOutputError> => {
//   const parsed = z
//     .array(segmentSchema)
//     .safeParse(unwrapProperty(value, "segments"));
//   return parsed.success
//     ? ok(parsed.data)
//     : invalid(operation, "segment list", parsed.error);
// };
//
// /** Return a reported overview base only when every parsed segment agrees. */
// export const parseSegmentImageBase = (
//   segments: readonly SegmentSummary[],
// ): string | undefined => {
//   const base = segments[0]?.image_base;
//   return base !== undefined &&
//     segments.every((segment) => segment.image_base === base)
//     ? base
//     : undefined;
// };
//
// /** Parse direct or wrapped provider document names. */
// export const parseDocuments = (
//   value: JsonValue,
//   operation = "list_documents",
// ): Result<readonly string[], AnalysisOutputError> => {
//   const parsed = z
//     .array(z.string())
//     .safeParse(unwrapProperty(value, "documents"));
//   return parsed.success
//     ? ok(parsed.data)
//     : invalid(operation, "document list", parsed.error);
// };
//
// /** Parse a direct or wrapped list when only its cardinality is required. */
// export const parseListCount = (
//   value: JsonValue,
//   property: string,
//   operation = property === "procedures" ? "list_procedures" : "list_strings",
// ): Result<number, AnalysisOutputError> => {
//   const unwrapped = unwrapProperty(value, property);
//   const list = z.array(z.unknown()).safeParse(unwrapped);
//   if (list.success) return ok(list.data.length);
//   const map = z.record(z.string(), z.unknown()).safeParse(unwrapped);
//   return map.success
//     ? ok(Object.keys(map.data).length)
//     : invalid(operation, `${property} list`, map.error);
// };
//
// const unwrapProperty = (value: JsonValue, property: string): JsonValue => {
//   if (
//     typeof value === "object" &&
//     value !== null &&
//     !Array.isArray(value) &&
//     property in value
//   ) {
//     return value[property] ?? null;
//   }
//   return value;
// };
//
// const invalid = <T>(
//   operation: string,
//   expected: string,
//   cause: z.ZodError,
// ): Result<T, AnalysisOutputError> =>
//   err(
//     new AnalysisOutputError(
//       operation,
//       `Provider returned an invalid ${expected}`,
//       {
//         cause,
//       },
//     ),
//   );
export const _l = 145;

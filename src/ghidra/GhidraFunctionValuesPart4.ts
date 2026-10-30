export const __stub = 1;
//   procedure_info: procedureInfo,
//   procedure_pseudo_code: z.string().nullable(),
//   read_function_instructions: ghidraFunctionInstructionWindow,
//   inspect_native_instruction: nativeInstructionSchema,
//   inspect_native_data_type: nativeDataTypeSchema,
//   resolve_native_call_targets: nativeCallTargetsSchema,
//   procedure_references: procedureReferences,
//   xrefs: z.array(ghidraCanonicalAddressSchema),
// } satisfies Readonly<Record<GhidraFunctionOperation, z.ZodType>>;
//
// const functionBoundaryObservationOperations: ReadonlySet<GhidraFunctionOperation> =
//   new Set([
//     "analyze_function",
//     "procedure_assembly",
//     "procedure_callees",
//     "procedure_callers",
//     "procedure_info",
//     "procedure_pseudo_code",
//     "procedure_references",
//     "read_function_instructions",
//   ]);
//
// const functionObservationEnvelope = z.strictObject({
//   value: z.unknown(),
//   limitations: z.array(z.string()),
//   relationship_coverage: relationshipCoverageSchema.exactOptional(),
//   selection: z
//     .strictObject({
//       file_offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//       mapped_address: ghidraCanonicalAddressSchema,
//       procedure_address: ghidraCanonicalAddressSchema,
//     })
//     .exactOptional(),
// });
//
// export interface ParsedGhidraFunctionResult {
//   readonly value: JsonValue;
//   readonly limitations: readonly string[];
//   readonly locations?: readonly EvidenceLocation[];
//   readonly relationshipCoverage?: RelationshipCoverage;
// }
//
// /** Require exact, bounded Java-bridge function output before creating Evidence. */
// export const parseGhidraFunctionResult = (
//   operation: GhidraFunctionOperation,
//   value: JsonValue,
// ): Result<ParsedGhidraFunctionResult, AnalysisOutputError> => {
//   let observation: {
//     readonly value: unknown;
//     readonly limitations: readonly string[];
//     readonly relationship_coverage?: RelationshipCoverage;
//     readonly selection?: z.infer<
//       typeof functionObservationEnvelope
//     >["selection"];
//   };
//   if (functionBoundaryObservationOperations.has(operation)) {
//     const envelope = functionObservationEnvelope.safeParse(value);
//     if (
//       !envelope.success ||
//       (operation !== "analyze_function" &&
//         operation !== "procedure_callers" &&
//         operation !== "procedure_callees" &&
//         envelope.data.relationship_coverage !== undefined) ||
//       (operation !== "procedure_pseudo_code" &&
//         envelope.data.selection !== undefined)
//     )
//       return err(
//         new AnalysisOutputError(
//           operation,
//           "Ghidra bridge returned an invalid function observation envelope for this operation",
//           envelope.success ? undefined : { cause: envelope.error },
//         ),
//       );
//     observation = envelope.data;
//   } else {
//     observation = { value, limitations: [] };
//   }
//   const parsed = resultSchemas[operation].safeParse(observation.value);
//   return parsed.success
//     ? ok({
//         value: jsonValueSchema.parse(parsed.data),
//         limitations: observation.limitations,
//         ...(observation.relationship_coverage === undefined
//           ? {}
//           : { relationshipCoverage: observation.relationship_coverage }),
//         ...(observation.selection === undefined
//           ? {}
//           : {
//               locations: [
//                 {
//                   kind: "file-offset" as const,
//                   offset: observation.selection.file_offset,
//                 },
//                 {
//                   kind: "address" as const,
//                   address: observation.selection.mapped_address,
//                 },
//                 {
//                   kind: "address" as const,
//                   address: observation.selection.procedure_address,
//                 },
//               ],
//             }),
//       })
//     : err(
//         new AnalysisOutputError(
//           operation,
//           "Ghidra bridge output did not match the function-analysis contract",
//           { cause: parsed.error },
//         ),
//       );
// };
//
// const referenceAddresses = (
//   edge: FunctionDossier["incoming_references"][number],
// ): readonly string[] => [
//   edge.source_address,
//   edge.target_address,
//   ...(edge.source_procedure === null ? [] : [edge.source_procedure.address]),
//   ...(edge.target_procedure === null ? [] : [edge.target_procedure.address]),
// ];
//
// const referenceProcedures = (
//   edge: FunctionDossier["incoming_references"][number],
// ): readonly NonNullable<
//   FunctionDossier["incoming_references"][number]["source_procedure"]
// >[] => [
//   ...(edge.source_procedure === null ? [] : [edge.source_procedure]),
//   ...(edge.target_procedure === null ? [] : [edge.target_procedure]),
// ];
export const _l = 130;

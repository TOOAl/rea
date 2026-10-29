export const __stub = 1;
//       ) ||
//       value.effects.some(({ operation }) => !operationIds.has(operation))
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra p-code relationship references a missing operation",
//       });
//     if (
//       value.truncated !==
//       (value.omitted_operations_lower_bound > 0 ||
//         value.known_omitted_inputs > 0 ||
//         value.known_omitted_edges > 0)
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra p-code truncation flag contradicts omitted counts",
//       });
//   },
// );
//
// const ghidraFunctionDossier = functionDossierSchema
//   .extend({
//     procedure: functionDossierSchema.shape.procedure.safeExtend({
//       classification,
//       body: ghidraFunctionBody,
//     }),
//     native_api: ghidraNativeApiBoundary,
//     native_value_flow: ghidraNativeValueFlow,
//   })
//   .strict()
//   .superRefine((value, context) => {
//     if (
//       (value.swift_string_literals === undefined) !==
//       (value.swift_string_literal_omissions === undefined)
//     )
//       context.addIssue({
//         code: "custom",
//         message:
//           "Ghidra dossier must record Swift literals and their omissions together",
//       });
//     const addresses = [
//       value.procedure.address,
//       ...value.comments.map(({ address }) => address),
//       ...value.callers.map(({ address }) => address),
//       ...value.callees.map(({ address }) => address),
//       ...(value.unresolved_calls ?? []).map(({ address }) => address),
//       ...value.incoming_references.flatMap(referenceAddresses),
//       ...value.outgoing_references.flatMap(referenceAddresses),
//       ...value.referenced_strings.flatMap(({ address, source_address }) => [
//         address,
//         source_address,
//       ]),
//       ...value.referenced_names.flatMap(({ address, source_address }) => [
//         address,
//         source_address,
//       ]),
//       ...(value.swift_string_literals ?? []).flatMap(
//         ({ address, source_address }) =>
//           address === null ? [source_address] : [address, source_address],
//       ),
//       ...(value.swift_string_literal_omissions ?? []).flatMap(
//         ({ address, source_address }) =>
//           address === null ? [source_address] : [address, source_address],
//       ),
//       ...value.basic_blocks.flatMap(({ start, end, successors }) => [
//         start,
//         end,
//         ...successors,
//       ]),
//     ];
//     if (
//       addresses.some(
//         (address) => !ghidraCanonicalAddressSchema.safeParse(address).success,
//       )
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra dossier contains a non-canonical address",
//       });
//     const identities = [
//       value.procedure,
//       ...value.callers,
//       ...value.callees,
//       ...value.incoming_references.flatMap(referenceProcedures),
//       ...value.outgoing_references.flatMap(referenceProcedures),
//     ];
//     if (
//       identities.some(
//         (identity) =>
//           !classification.safeParse(identity.classification).success ||
//           !ghidraFunctionBody.safeParse(identity.body).success ||
//           !functionBodyEntryAgrees(identity.body, identity.address) ||
//           (identity.body.available &&
//             identity.classification?.external === false &&
//             !identity.body.contains_entry),
//       )
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra dossier omitted function classification",
//       });
//     if (
//       value.procedure.locals.some(
//         (variable) => !localVariable.safeParse(variable).success,
//       ) ||
//       [...value.incoming_references, ...value.outgoing_references].some(
//         ({ kind }) => !referenceKind.safeParse(kind).success,
//       )
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra dossier contains invalid provenance",
//       });
//     if (
//       !value.limitations.some((item) => /indirect|computed/u.test(item)) ||
//       !value.limitations.some((item) => /provider|Ghidra|Hopper/u.test(item))
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra dossier omitted required uncertainty limitations",
//       });
//   });
// const ghidraFunctionInstructionWindow = functionInstructionWindowSchema
//   .extend({ procedure: procedureIdentity })
//   .strict();
//
// const resultSchemas = {
//   annotate_native_function: nativeFunctionAnnotationsSchema.safeExtend({
//     dossier: ghidraFunctionDossier,
//   }),
//   analyze_function: ghidraFunctionDossier,
//   procedure_assembly: z.string(),
//   procedure_callees: z.array(ghidraCanonicalAddressSchema),
//   procedure_callers: z.array(ghidraCanonicalAddressSchema),
export const _l = 134;

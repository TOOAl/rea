export const __stub = 1;
// const localVariable = z
//   .object({
//     description: z.string(),
//     provenance: z.literal("ghidra-function-database"),
//   })
//   .strict();
// const referenceKind = z
//   .object({
//     available: z.literal(true),
//     provenance: z.literal("ghidra-reference-manager"),
//     type: z.string().min(1),
//     flow: z.boolean(),
//     call: z.boolean(),
//     jump: z.boolean(),
//     data: z.boolean(),
//     read: z.boolean(),
//     write: z.boolean(),
//     indirect: z.boolean(),
//     computed: z.boolean(),
//     conditional: z.boolean(),
//     terminal: z.boolean(),
//     primary: z.boolean(),
//     operand_index: z.number().int(),
//     external: z.boolean(),
//   })
//   .strict();
// const referenceEdge = z
//   .object({
//     source_address: ghidraCanonicalAddressSchema,
//     target_address: ghidraCanonicalAddressSchema,
//     source_procedure: procedureIdentity.nullable(),
//     target_procedure: procedureIdentity.nullable(),
//     kind: referenceKind,
//   })
//   .strict();
// const procedureReferences = z
//   .object({
//     procedure: procedureIdentity,
//     direction: z.enum(["incoming", "outgoing"]),
//     references: z.array(referenceEdge),
//     reference_kinds_available: z.boolean(),
//     unresolved_calls: z.array(
//       z.strictObject({
//         address: ghidraCanonicalAddressSchema,
//         reason: z.string(),
//       }),
//     ),
//   })
//   .strict();
// const procedureInfo = z
//   .object({
//     name: z.string().min(1),
//     entrypoint: ghidraCanonicalAddressSchema,
//     basicblock_count: z.number().int().min(0),
//     length: z.number().int().min(0),
//     signature: z.string().nullable(),
//     locals: z.array(localVariable),
//     classification,
//     body: ghidraFunctionBody,
//   })
//   .strict()
//   .superRefine((value, context) => {
//     if (
//       !functionBodyEntryAgrees(value.body, value.entrypoint) ||
//       (value.body.available &&
//         (value.length !== value.body.total_bytes ||
//           (!value.classification.external && !value.body.contains_entry)))
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra function body disagrees with entry point or length",
//       });
//   });
//
// const ghidraNativeApiBoundary = nativeApiBoundarySchema.superRefine(
//   (value, context) => {
//     if (!value.available) return;
//     if (value.provenance !== "ghidra-high-function")
//       context.addIssue({
//         code: "custom",
//         message:
//           "Ghidra native API observations require HighFunction provenance",
//       });
//     const addresses = value.jump_tables.flatMap((table) => [
//       table.dispatch_address,
//       ...table.data_sources.map(({ address }) => address),
//       ...table.mappings.map(({ target_address }) => target_address),
//       ...table.default_targets.map(({ target_address }) => target_address),
//     ]);
//     if (
//       addresses.some(
//         (address) => !ghidraCanonicalAddressSchema.safeParse(address).success,
//       )
//     )
//       context.addIssue({
//         code: "custom",
//         message:
//           "Ghidra native API observation contains a non-canonical address",
//       });
//   },
// );
//
// const ghidraNativeValueFlow = nativeValueFlowSchema.superRefine(
//   (value, context) => {
//     if (!value.available) return;
//     const operations = value.operations;
//     const addresses = operations.flatMap((operation) => [
//       operation.address,
//       ...operation.inputs.flatMap(({ location }) =>
//         location === null ? [] : [location],
//       ),
//       ...(operation.output?.location == null
//         ? []
//         : [operation.output.location]),
//     ]);
//     if (
//       addresses.some(
//         (address) => !ghidraCanonicalAddressSchema.safeParse(address).success,
//       )
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra p-code flow contains a non-canonical address",
//       });
//     const operationIds = new Set(operations.map(({ id }) => id));
//     if (operationIds.size !== operations.length)
//       context.addIssue({
//         code: "custom",
//         message: "Ghidra p-code operation identifiers are not unique",
//       });
//     if (
//       value.def_use.some(
//         ({ definition, use }) =>
//           !operationIds.has(definition) || !operationIds.has(use),
export const _l = 134;

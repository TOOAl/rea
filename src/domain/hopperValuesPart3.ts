export const __stub = 1;
//   ),
// };
//
// /** A Swift String literal decoded from the two words of its ABI value, not a data reference. */
// export const swiftStringLiteralSchema = z.discriminatedUnion("representation", [
//   z.strictObject({
//     ...swiftStringLiteralFields,
//     representation: z
//       .literal("small")
//       .describe("The UTF-8 bytes are inside the two words."),
//     address: z.null().describe("A small literal has no storage of its own."),
//   }),
//   z.strictObject({
//     ...swiftStringLiteralFields,
//     representation: z
//       .literal("large")
//       .describe(
//         "An immortal literal whose words hold its count and a pointer to its bytes.",
//       ),
//     address: z.string().describe("Address of a large literal's bytes."),
//   }),
// ]);
//
// const swiftStringLiteralOmissionFields = {
//   source_address: swiftStringLiteralFields.source_address,
//   byte_length: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//   reason: z
//     .enum(["capacity", "unresolved_jump"])
//     .describe(
//       "Why this candidate is omitted: capacity stopped decoding, or an unresolved jump left its use unknown.",
//     ),
//   registers: swiftStringLiteralFields.registers,
//   words: swiftStringLiteralFields.words,
// };
//
// /** A Swift literal candidate omitted because decoding capacity or control flow left it unknown. */
// export const swiftStringLiteralOmissionSchema = z.discriminatedUnion(
//   "representation",
//   [
//     z.strictObject({
//       ...swiftStringLiteralOmissionFields,
//       representation: z.literal("small"),
//       address: z.null(),
//     }),
//     z.strictObject({
//       ...swiftStringLiteralOmissionFields,
//       representation: z.literal("large"),
//       address: z.string().describe("Address of the literal's bytes."),
//     }),
//   ],
// );
//
// /** Observed endpoints with complete or partial reference classification evidence. */
// export const referenceEdgeSchema = z
//   .object({
//     source_address: z.string(),
//     target_address: z.string(),
//     source_procedure: procedureIdentitySchema.nullable(),
//     target_procedure: procedureIdentitySchema.nullable(),
//     kind: referenceKindSchema,
//     call: z
//       .strictObject({
//         classification: z.enum(["none", "unknown", "direct", "objective_c"]),
//         provider_type: z.number().int(),
//         provenance: z.string().min(1),
//       })
//       .exactOptional(),
//   })
//   .strict();
// const facetAvailabilitySchema = z.discriminatedUnion("available", [
//   z.object({ available: z.literal(true) }).strict(),
//   z.object({ available: z.literal(false), reason: z.string().min(1) }).strict(),
// ]);
//
// export const functionDossierSchema = z
//   .object({
//     procedure: procedureIdentitySchema.safeExtend({
//       signature: z.string().nullable(),
//       locals: z.array(localVariableSchema),
//     }),
//     pseudocode: z.string(),
//     assembly: z.array(z.string()),
//     comments: z.array(
//       z
//         .object({
//           address: z.string(),
//           kind: z.enum(["comment", "inline"]),
//           text: z.string(),
//         })
//         .strict(),
//     ),
//     callers: z.array(procedureIdentitySchema),
//     callees: z.array(procedureIdentitySchema),
//     incoming_references: z.array(referenceEdgeSchema),
//     outgoing_references: z.array(referenceEdgeSchema),
//     unresolved_calls: z.array(unresolvedCallSchema).exactOptional(),
//     referenced_strings: z.array(
//       analysisStringSchema.extend({ source_address: z.string() }),
//     ),
//     referenced_names: z.array(
//       z
//         .object({
//           address: z.string(),
//           value: z.string(),
//           source_address: z.string(),
//         })
//         .strict(),
//     ),
//     swift_string_literals: z
//       .array(swiftStringLiteralSchema)
//       .exactOptional()
//       .describe(
//         "Swift String literals decoded from constant register values. Absent when the provider does not decode them for this target.",
//       ),
//     swift_string_literal_omissions: z
//       .array(swiftStringLiteralOmissionSchema)
//       .exactOptional()
//       .describe(
//         "Literal candidates omitted for capacity or unresolved control flow. Present exactly when swift_string_literals is present; empty when all examined use sites were classified.",
//       ),
//     basic_blocks: z.array(
//       z
//         .object({
//           start: z.string(),
//           end: z.string(),
//           successors: z.array(z.string()),
//         })
//         .strict(),
//     ),
//     native_api: nativeApiBoundarySchema.nullable(),
//     native_value_flow: nativeValueFlowSchema.nullable(),
//     facet_availability: z
//       .object({
//         pseudocode: facetAvailabilitySchema.exactOptional(),
//         assembly: facetAvailabilitySchema.exactOptional(),
//         comments: facetAvailabilitySchema.exactOptional(),
//         callers: facetAvailabilitySchema.exactOptional(),
//         callees: facetAvailabilitySchema.exactOptional(),
//         references: facetAvailabilitySchema.exactOptional(),
//         strings_names: facetAvailabilitySchema.exactOptional(),
//         cfg: facetAvailabilitySchema.exactOptional(),
//       })
//       .strict()
//       .exactOptional(),
//     limitations: z.array(z.string()),
//   })
export const _l = 146;

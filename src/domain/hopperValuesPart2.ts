export const __stub = 1;
//               "Function body ranges must be ordered, disjoint and maximal within each address space",
//           });
//           return;
//         }
//         bounds.set(start.space, {
//           start: previous?.start ?? start.offset,
//           end: end.offset,
//         });
//         previousSpace = start.space;
//         total += end.offset - start.offset + 1n;
//       }
//       const onlyBounds =
//         bounds.size === 1 ? [...bounds.values()][0] : undefined;
//       const span =
//         bounds.size === 0
//           ? 0n
//           : onlyBounds === undefined
//             ? null
//             : onlyBounds.end - onlyBounds.start + 1n;
//       const reportedSpan =
//         body.span_bytes === null ? null : BigInt(body.span_bytes);
//       if (
//         total !== BigInt(body.total_bytes) ||
//         span !== reportedSpan ||
//         body.non_contiguous !== body.ranges.length > 1
//       )
//         context.addIssue({
//           code: "custom",
//           message:
//             "Function body counts, enclosing span or contiguity disagree with inclusive ranges",
//         });
//     }),
// ]);
//
// /** Check the declared entry membership against complete, inclusive body ranges. */
// export const functionBodyEntryAgrees = (
//   body: z.infer<typeof functionBodySchema>,
//   address: string,
// ): boolean => {
//   if (!body.available) return true;
//   const entry = addressCoordinate(address);
//   if (entry === null) return false;
//   const contains = body.ranges.some((range) => {
//     const start = addressCoordinate(range.start);
//     const end = addressCoordinate(range.end);
//     return (
//       start !== null &&
//       end !== null &&
//       start.space === entry.space &&
//       entry.offset >= start.offset &&
//       entry.offset <= end.offset
//     );
//   });
//   return contains === body.contains_entry;
// };
//
// export const procedureClassificationSchema = z
//   .object({
//     external: z.boolean(),
//     thunk: z.boolean(),
//     thunk_target: z.string().nullable(),
//     provenance: z.string().min(1),
//   })
//   .strict();
// export const procedureIdentitySchema = z
//   .object({
//     address: z.string(),
//     name: z.string(),
//     classification: procedureClassificationSchema.nullable(),
//     body: functionBodySchema,
//   })
//   .strict()
//   .superRefine((identity, context) => {
//     if (!functionBodyEntryAgrees(identity.body, identity.address))
//       context.addIssue({
//         code: "custom",
//         message:
//           "Function body entry membership disagrees with procedure identity",
//       });
//   });
// export const localVariableSchema = z
//   .object({
//     description: z.string(),
//     provenance: z.string().min(1),
//     name: z.string().nullable().exactOptional(),
//     stack_displacement: z
//       .string()
//       .regex(/^-?\d+$/u)
//       .nullable()
//       .exactOptional()
//       .describe(
//         "Observed signed stack byte displacement, encoded as decimal to preserve precision.",
//       ),
//   })
//   .strict();
// /** Provider-neutral complete raw-instruction list for one analyzed function. */
// export const functionInstructionWindowSchema = z
//   .object({
//     procedure: procedureIdentitySchema,
//     instructions: z.array(z.string()),
//     limitations: z.array(z.string()),
//   })
//   .strict();
//
// const availableReferenceKindSchema = z
//   .object({
//     available: z.literal(true),
//     provenance: z.string().min(1),
//     type: z.string(),
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
// export const referenceKindSchema = z.discriminatedUnion("available", [
//   unavailableAnalysisFactSchema,
//   availableReferenceKindSchema,
// ]);
// /** Reported call sites without resolved targets; unreported dispatch stays unknown. */
// export const unresolvedCallSchema = z.strictObject({
//   address: z.string(),
//   reason: z.string(),
// });
//
// const swiftStringLiteralFields = {
//   source_address: z
//     .string()
//     .describe(
//       "Instruction that consumes both words: a call, tail call, return, or paired store.",
//     ),
//   value: z
//     .string()
//     .describe("Decoded UTF-8 text, including the canonical empty string."),
//   registers: fixedTupleSchema([z.string(), z.string()]),
//   words: fixedTupleSchema([z.string(), z.string()]).describe(
//     "Observed constant register values, in register order.",
export const _l = 146;

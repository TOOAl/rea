export const __stub = 1;
//               group.effects.includes(name),
//             ]),
//           ),
//           limitations: [...set.shared_limitations, ...group.limitations],
//         }),
//         provider: set.provider,
//       })),
//     ),
//   );
//
// const processCoordinates = {
//   launcher_pid: z.number().int().min(1),
//   process_group_id: z.number().int().min(1),
// };
//
// const processLineageObservation = z.discriminatedUnion("status", [
//   z.object({
//     status: z.literal("unavailable"),
//     observed_at: z.iso.datetime(),
//     ...processCoordinates,
//     reason: z.string().min(1),
//   }),
//   z.object({
//     status: z.literal("verified"),
//     observed_at: z.iso.datetime(),
//     ...processCoordinates,
//     launcher_parent_pid: z.number().int().min(0),
//     descendants: z.array(
//       z.object({
//         pid: z.number().int().min(1),
//         parent_pid: z.number().int().min(0),
//         process_group_id: z.number().int().min(1),
//       }),
//     ),
//   }),
// ]);
//
// const analysisRun = z
//   .object({
//     run_id: z.string().uuid(),
//     process_lineage: z.discriminatedUnion("status", [
//       z.object({ status: z.literal("not_observed") }),
//       z.object({
//         status: z.literal("snapshots"),
//         snapshots: z.array(
//           z.object({
//             provider: providerIdentity,
//             observation: processLineageObservation,
//           }),
//         ),
//       }),
//     ]),
//   })
//   .nullable();
//
// export const analysisActivity = z.object({
//   status: z.enum(["not_observed", "idle", "busy"]),
//   providers: z.array(
//     z.object({
//       provider: providerIdentity,
//       active: z
//         .object({
//           request_id: z.number().int().min(1),
//           operation: z.string().min(1),
//           elapsed_ms: z.number().int().min(0),
//           caller_state: z.enum(["waiting", "cancelled"]),
//         })
//         .nullable(),
//       queued_requests: z.number().int().min(0),
//     }),
//   ),
// });
//
// const providerOperationRequest = z.object({
//   request_id: z.number().int().min(1),
//   operation: z.string().min(1),
//   stage: z.enum(PROVIDER_FAILURE_STAGES),
// });
//
// export const providerOperationHealth = z
//   .object({
//     state: z.enum(PROVIDER_OPERATION_STATES),
//     stage: z.enum(PROVIDER_FAILURE_STAGES).nullable(),
//     retry_action: z.enum(PROVIDER_RETRY_ACTIONS).nullable(),
//     exit_code: z.number().int().nullable(),
//     requests: z.array(providerOperationRequest),
//   })
//   .nullable();
//
// const providerRejectionCode: z.ZodType<ProviderRejectionCode> = z.enum(
//   PROVIDER_REJECTION_CODES,
// );
//
// const providerDiagnostics = z.record(z.string(), jsonValueSchema);
//
// const providerAvailability = z.discriminatedUnion("status", [
//   z.object({
//     status: z.literal("available"),
//     code: z.null(),
//     reason: z.null(),
//     diagnostics: providerDiagnostics,
//   }),
//   z.object({
//     status: z.literal("unavailable"),
//     code: providerRejectionCode,
//     reason: z.string().min(1),
//     diagnostics: providerDiagnostics,
//   }),
// ]);
//
// const providerTargetSupport = z.discriminatedUnion("status", [
//   z.object({
//     status: z.literal("unknown"),
//     code: z.null(),
//     reason: z.string().min(1),
//     diagnostics: providerDiagnostics,
//   }),
//   z.object({
//     status: z.literal("supported"),
//     code: z.null(),
//     reason: z.null(),
//     diagnostics: providerDiagnostics,
//   }),
//   z.object({
//     status: z.literal("unsupported"),
//     code: z.enum([
//       "target_kind_unsupported",
//       "target_format_unsupported",
//       "architecture_unsupported",
//       "target_role_unsupported",
//       "managed_target_unsupported",
//     ]),
//     reason: z.string().min(1),
//     diagnostics: providerDiagnostics,
//   }),
// ]);
//
// const clientFeatureNameSchema = z.enum([
//   "elicitation_form",
//   "elicitation_url",
//   "roots",
//   "sampling",
// ]);
//
// /** Negotiated MCP client features that affect REA workflow availability. */
// export const clientFeatureAvailabilitySchema = z.object({
//   elicitation_form: z.boolean(),
//   elicitation_url: z.boolean(),
//   roots: z.boolean(),
//   sampling: z.boolean(),
// });
// export type ClientFeatureAvailability = z.infer<
//   typeof clientFeatureAvailabilitySchema
// >;
//
// const toolAvailabilityMode = z.discriminatedUnion("available", [
//   z.object({
//     name: z.string(),
//     available: z.literal(true),
//     missing_operations: z.array(z.string()).length(0),
//     remediation: z.null(),
//   }),
//   z.object({
//     name: z.string(),
//     available: z.literal(false),
export const _l = 165;

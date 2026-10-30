export const __stub = 1;
//     missing_operations: z.array(z.string()).min(1),
//     remediation: z.string().nullable(),
//   }),
// ]);
// export type ToolAvailabilityMode = z.output<typeof toolAvailabilityMode>;
//
// const toolAvailabilityFacts = {
//   name: z.string(),
//   surface: z.string(),
//   default_mode_available: z.boolean().optional(),
//   modes: z.array(toolAvailabilityMode).optional(),
//   client_requirements: z.object({
//     required: z.array(clientFeatureNameSchema),
//     optional: z.array(clientFeatureNameSchema),
//     missing_required: z.array(clientFeatureNameSchema),
//     missing_optional: z.array(clientFeatureNameSchema),
//   }),
//   effects: z.strictObject({
//     mutatesTarget: z.boolean(),
//     mutatesSession: z.boolean(),
//     writesFilesystem: z.boolean(),
//     launchesProcess: z.boolean(),
//     accessesNetwork: z.boolean(),
//     changesUiState: z.boolean(),
//     mayDiscardData: z.boolean(),
//     executesForeignCode: z.boolean(),
//     mutatesDevice: z.boolean(),
//     idempotent: z.boolean(),
//   }),
//   annotations: z.object({
//     read_only: z.boolean(),
//     destructive: z.boolean(),
//     idempotent: z.boolean(),
//     open_world: z.boolean(),
//   }),
// };
//
// export const toolUnavailabilityReason = z.enum([
//   "client_capability_missing",
//   "target_required",
//   "provider_missing",
//   "provider_unavailable",
//   "target_unsupported",
//   "unsupported_host",
// ]);
//
// export const toolAvailability = z.discriminatedUnion("available", [
//   z.object({
//     ...toolAvailabilityFacts,
//     available: z.literal(true),
//     reason: z.literal("available"),
//     remediation: z.null(),
//   }),
//   z.object({
//     ...toolAvailabilityFacts,
//     available: z.literal(false),
//     reason: toolUnavailabilityReason,
//     remediation: z.string().nullable(),
//   }),
// ]);
// export type ToolAvailability = z.output<typeof toolAvailability>;
// export type ToolUnavailabilityReason = z.output<
//   typeof toolUnavailabilityReason
// >;
//
// export const TOOL_EFFECT_NAMES = Object.keys(
//   toolAvailabilityFacts.effects.shape,
// ) as (keyof z.output<typeof toolAvailabilityFacts.effects>)[];
// export const TOOL_ANNOTATION_NAMES = Object.keys(
//   toolAvailabilityFacts.annotations.shape,
// ) as (keyof z.output<typeof toolAvailabilityFacts.annotations>)[];
//
// const toolAvailabilityGroupFacts = {
//   names: z.array(z.string().min(1)).min(1),
//   surface: toolAvailabilityFacts.surface,
//   default_mode_available: toolAvailabilityFacts.default_mode_available,
//   modes: toolAvailabilityFacts.modes,
//   client_requirements: toolAvailabilityFacts.client_requirements.optional(),
//   effects: z.array(toolAvailabilityFacts.effects.keyof()),
//   annotations: z.array(toolAvailabilityFacts.annotations.keyof()),
// };
//
// const toolAvailabilityGroup = z.discriminatedUnion("available", [
//   z.strictObject({
//     ...toolAvailabilityGroupFacts,
//     available: z.literal(true),
//     reason: z.literal("available"),
//     remediation: z.null(),
//   }),
//   z.strictObject({
//     ...toolAvailabilityGroupFacts,
//     available: z.literal(false),
//     reason: toolUnavailabilityReason,
//     remediation: z.string().nullable(),
//   }),
// ]);
//
// /** Complete inventory with explicit inherited client requirements and enabled flags. */
// export const toolAvailabilityInventory = z.strictObject({
//   client_requirements: toolAvailabilityFacts.client_requirements,
//   groups: z.array(toolAvailabilityGroup),
// });
// export type ToolAvailabilityInventory = z.output<
//   typeof toolAvailabilityInventory
// >;
//
// /** Expand the wire representation once at the consuming boundary. */
// export const expandToolAvailability = (
//   inventory: ToolAvailabilityInventory,
// ): readonly ToolAvailability[] =>
//   inventory.groups.flatMap((group) =>
//     group.names.map((name) =>
//       toolAvailability.parse({
//         ...group,
//         name,
//         client_requirements:
//           group.client_requirements ?? inventory.client_requirements,
//         effects: Object.fromEntries(
//           TOOL_EFFECT_NAMES.map((effect) => [
//             effect,
//             group.effects.includes(effect),
//           ]),
//         ),
//         annotations: Object.fromEntries(
//           TOOL_ANNOTATION_NAMES.map((annotation) => [
//             annotation,
//             group.annotations.includes(annotation),
//           ]),
//         ),
//       }),
//     ),
//   );
//
// export const sessionProvider = z
//   .object({
//     capabilities: z.array(providerCapabilitySet),
//     analysis_run: analysisRun,
//     analysis_activity: analysisActivity,
//     provider_operation_health: providerOperationHealth,
//     analysis_provider_binding: z
//       .object({
//         provider: providerIdentity,
//         selection_source: z.enum([
//           "request",
//           "environment",
//           "auto-single-candidate",
//         ]),
//         analysis_profile: analysisProfileSchema,
//       })
//       .nullable(),
//     analysis_provider_candidates: z.array(
//       z.object({
//         provider: providerIdentity,
//         availability: providerAvailability,
//         target_support: providerTargetSupport,
//         selected: z.boolean(),
//         capabilities: z.array(providerCapabilitySet),
//       }),
//     ),
//     tool_availability: toolAvailabilityInventory,
//     client_features: z.object({
//       elicitation_form: z.boolean(),
//       elicitation_url: z.boolean(),
//       roots: z.boolean(),
//       sampling: z.boolean(),
export const _l = 165;

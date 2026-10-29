export const __stub = 1;
// import { z } from "zod";
//
// import {
//   procedureClassificationSchema,
//   procedureIdentitySchema,
//   localVariableSchema,
//   functionDossierSchema,
//   functionBodySchema,
// } from "../domain/hopperValues.js";
// import { analysisProfileSchema } from "../domain/analysisProfile.js";
// import {
//   evidenceSchema,
//   validateAnalysisProfileProvider,
// } from "../domain/evidence.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import {
//   PROVIDER_REJECTION_CODES,
//   type ProviderRejectionCode,
// } from "./providerSelection.js";
// import {
//   PROVIDER_FAILURE_STAGES,
//   PROVIDER_OPERATION_STATES,
//   PROVIDER_RETRY_ACTIONS,
// } from "../domain/providerOperationHealth.js";
// import { analysisErrorProjectionSchema } from "./errorSchemas.js";
// import { relationshipCoverageSchema } from "../domain/relationshipCoverage.js";
// import { ZIP_PACKAGE_FORMATS } from "../domain/zipPackageFormat.js";
//
// /** Specialize the single normalized result inside a complete Evidence record. */
// export const evidenceResultOf = <Schema extends z.ZodType>(schema: Schema) =>
//   z
//     .strictObject({ ...evidenceSchema.shape, normalized_result: schema })
//     .superRefine(validateAnalysisProfileProvider);
//
// /** Wrap a lifecycle result while preserving its exact schema type. */
// export const lifecycleResultOf = <Schema extends z.ZodType>(schema: Schema) =>
//   z.object({ result: schema });
//
// /** Resolve a required named output schema or reject contract drift. */
// export const requireOutputSchema = <
//   Schemas extends Readonly<Record<string, z.ZodObject>>,
//   Name extends keyof Schemas & string,
// >(
//   schemas: Schemas,
//   name: Name,
// ): Schemas[Name] => {
//   const schema = schemas[name];
//   if (schema === undefined)
//     throw new Error(`Missing output schema for ${name}`);
//   return schema;
// };
//
// export const targetFormatSchema = z.enum([
//   "hopper",
//   "analysis-database",
//   "mach-o",
//   "mach-o-universal",
//   "elf",
//   "pe",
//   "dos-mz",
//   "dos-com",
//   "raw-binary",
//   ...ZIP_PACKAGE_FORMATS,
//   "asar",
//   "dmg",
//   "pkg",
//   "plist",
//   "javascript",
//   "source-map",
// ]);
//
// export const targetKindSchema = z.enum([
//   "executable",
//   "database",
//   "archive",
//   "artifact",
// ]);
//
// const providerCapabilityFacts = {
//   operation: z.string(),
//   effects: z.object({
//     mutates_artifact: z.boolean(),
//     launches_process: z.boolean(),
//     may_show_ui: z.boolean(),
//     may_access_network: z.boolean(),
//     may_write_filesystem: z.boolean(),
//     changes_permissions: z.boolean(),
//     requires_root: z.boolean(),
//   }),
//   limitations: z.array(z.string()),
// };
//
// export const providerCapability = z.discriminatedUnion("available", [
//   z.object({
//     ...providerCapabilityFacts,
//     available: z.literal(true),
//     reason: z.null(),
//     availability_code: z.null(),
//   }),
//   z.object({
//     ...providerCapabilityFacts,
//     available: z.literal(false),
//     reason: z.string().nullable(),
//     availability_code: z.enum(PROVIDER_REJECTION_CODES).nullable(),
//   }),
// ]);
// export type ProviderCapability = z.output<typeof providerCapability>;
//
// /** Listed effects are true; all other members of this closed vocabulary are false. */
// export const PROVIDER_EFFECT_NAMES = Object.keys(
//   providerCapabilityFacts.effects.shape,
// ) as (keyof z.output<typeof providerCapabilityFacts.effects>)[];
//
// export const providerIdentity = z.object({
//   id: z.string(),
//   name: z.string(),
//   version: z.string().nullable(),
// });
//
// const providerCapabilityGroupFacts = {
//   operations: z.array(z.string().min(1)).min(1),
//   effects: z.array(providerCapabilityFacts.effects.keyof()),
//   limitations: z.array(z.string()),
// };
//
// const providerCapabilityGroup = z.discriminatedUnion("available", [
//   z.strictObject({
//     ...providerCapabilityGroupFacts,
//     available: z.literal(true),
//     reason: z.null(),
//     availability_code: z.null(),
//   }),
//   z.strictObject({
//     ...providerCapabilityGroupFacts,
//     available: z.literal(false),
//     reason: z.string().nullable(),
//     availability_code: z.enum(PROVIDER_REJECTION_CODES).nullable(),
//   }),
// ]);
//
// /** Shared limitations precede each group's suffix, preserving exact source order. */
// export const providerCapabilitySet = z.strictObject({
//   provider: providerIdentity,
//   shared_limitations: z.array(z.string()),
//   groups: z.array(providerCapabilityGroup),
// });
// export type ProviderCapabilitySet = z.output<typeof providerCapabilitySet>;
//
// /** Decode one status scope without losing provider identity or limitation order. */
// export const expandProviderCapabilities = (
//   sets: readonly ProviderCapabilitySet[],
// ): readonly (ProviderCapability & {
//   readonly provider: z.output<typeof providerIdentity>;
// })[] =>
//   sets.flatMap((set) =>
//     set.groups.flatMap((group) =>
//       group.operations.map((operation) => ({
//         ...providerCapability.parse({
//           operation,
//           available: group.available,
//           reason: group.reason,
//           availability_code: group.availability_code,
//           effects: Object.fromEntries(
//             PROVIDER_EFFECT_NAMES.map((name) => [
//               name,
export const _l = 165;

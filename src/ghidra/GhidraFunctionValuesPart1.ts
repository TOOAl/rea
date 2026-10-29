export const __stub = 1;
// import { z } from "zod";
// import {
//   nativeFunctionAnnotationsInputSchema,
//   nativeFunctionAnnotationsSchema,
// } from "../domain/native/nativeFunctionAnnotations.js";
// import { nativeDataTypeSchema } from "../domain/native/nativeDataType.js";
// import {
//   nativeInstructionSchema,
//   nativeCallTargetsSchema,
// } from "../domain/native/nativeInstruction.js";
//
// import {
//   type AnalysisInputError,
//   AnalysisOutputError,
// } from "../domain/analysisErrorCore.js";
// import {
//   functionBodyEntryAgrees,
//   functionInstructionWindowSchema,
//   functionDossierSchema,
//   type FunctionDossier,
// } from "../domain/hopperValues.js";
// import {
//   jsonObjectSchema,
//   jsonValueSchema,
//   type JsonValue,
// } from "../domain/jsonValue.js";
// import { nativeApiBoundarySchema } from "../domain/native/nativeApiBoundary.js";
// import { nativeValueFlowSchema } from "../domain/native/nativeValueFlow.js";
// import type { EvidenceLocation } from "../domain/evidence.js";
// import {
//   relationshipCoverageSchema,
//   type RelationshipCoverage,
// } from "../domain/relationshipCoverage.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
// import {
//   ghidraIdentifierSchema,
//   ghidraInputAddressSchema,
//   ghidraCanonicalAddressSchema,
//   ghidraFunctionClassificationSchema as classification,
//   ghidraFunctionBodySchema as ghidraFunctionBody,
//   ghidraProcedureIdentitySchema as procedureIdentity,
// } from "./GhidraInventoryValues.js";
//
// /** Function analysis and annotation operations admitted by the Ghidra adapter. */
// export const GHIDRA_FUNCTION_OPERATIONS = [
//   "annotate_native_function",
//   "inspect_native_data_type",
//   "inspect_native_instruction",
//   "resolve_native_call_targets",
//   "analyze_function",
//   "procedure_assembly",
//   "procedure_callees",
//   "procedure_callers",
//   "procedure_info",
//   "procedure_pseudo_code",
//   "read_function_instructions",
//   "procedure_references",
//   "xrefs",
// ] as const;
//
// /** One function-analysis operation implemented by the packaged Java bridge. */
// export type GhidraFunctionOperation =
//   (typeof GHIDRA_FUNCTION_OPERATIONS)[number];
//
// const operationSet: ReadonlySet<string> = new Set(GHIDRA_FUNCTION_OPERATIONS);
//
// /** Narrow an application operation to the Ghidra function-analysis surface. */
// export const isGhidraFunctionOperation = (
//   operation: string,
// ): operation is GhidraFunctionOperation => operationSet.has(operation);
//
// const document = ghidraIdentifierSchema.nullable().default(null);
// const procedure = ghidraIdentifierSchema;
// const directProcedure = { document, procedure };
//
// const inputSchemas = {
//   annotate_native_function: nativeFunctionAnnotationsInputSchema,
//   inspect_native_data_type: z
//     .object({
//       document,
//       type: z.string().min(1).nullable().default(null),
//       address: ghidraInputAddressSchema.nullable().default(null),
//     })
//     .strict()
//     .refine(
//       (value) => (value.type === null) !== (value.address === null),
//       "Supply exactly one of type or address",
//     ),
//   inspect_native_instruction: z
//     .object({ document, address: ghidraInputAddressSchema })
//     .strict(),
//   resolve_native_call_targets: z
//     .object({ document, address: ghidraInputAddressSchema })
//     .strict(),
//   analyze_function: z.object({ procedure }).strict(),
//   procedure_assembly: z.object(directProcedure).strict(),
//   procedure_callees: z.object(directProcedure).strict(),
//   procedure_callers: z.object(directProcedure).strict(),
//   procedure_info: z.object(directProcedure).strict(),
//   procedure_pseudo_code: z.object(directProcedure).strict(),
//   read_function_instructions: z.object(directProcedure).strict(),
//   procedure_references: z
//     .object({
//       ...directProcedure,
//       direction: z.enum(["incoming", "outgoing"]).default("outgoing"),
//     })
//     .strict(),
//   xrefs: z.object({ document, address: ghidraInputAddressSchema }).strict(),
// } satisfies Readonly<Record<GhidraFunctionOperation, z.ZodType>>;
//
// /** Validate and default one function request before it crosses the socket. */
// export const parseGhidraFunctionInput = (
//   operation: GhidraFunctionOperation,
//   value: Readonly<Record<string, JsonValue>>,
// ): Result<Readonly<Record<string, JsonValue>>, AnalysisInputError> => {
//   const parsed = inputSchemas[operation].safeParse(value);
//   return parsed.success
//     ? ok(
//         jsonObjectSchema.parse(
//           Object.fromEntries(
//             Object.entries(parsed.data).filter(
//               ([, value]) => value !== undefined,
//             ),
//           ),
//         ),
//       )
//     : err(
//         analysisInputErrorFromIssues(operation, parsed.error.issues, value, {
//           cause: parsed.error,
//         }),
//       );
// };
//
export const _l = 134;

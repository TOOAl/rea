export const __stub = 1;
// import { z } from "incur";
// import { stat } from "node:fs/promises";
//
// import { resolveCliAnalysisSelector } from "./analysisSelector.js";
// import type { DirectAnalysis } from "../composition/directAnalysis.js";
// import { CLI_COMMANDS } from "../cliCommandNames.js";
// import { logCliCommand } from "../cliLogging.js";
// import type { Logger } from "pino";
// import {
//   directAnalysisOptionsFromCli,
//   nativeOpenOptionFields,
// } from "./options.js";
// import type { CliInstance } from "./types.js";
// import { runCliJavaScriptApplicationAnalysis } from "./javascriptApplicationAnalysis.js";
// import { withCommandCancellation } from "./commandCancellation.js";
// import { javascriptApplicationOptions } from "../cliObservationOptions.js";
// import { AnalysisInputError } from "../domain/analysisErrorCore.js";
// import { absoluteCallerPath } from "../filesystem/callerPath.js";
//
// /** Register provider-neutral binary overview and procedure CLI commands. */
// export const registerCoreBinaryCommands = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   registerOverviewCommands(cli, logger, runDirectAnalysis);
//   registerDecompileCommand(cli, logger, runDirectAnalysis);
//   registerFunctionCommand(cli, logger, runDirectAnalysis);
//   registerInstructionsCommand(cli, logger, runDirectAnalysis);
//   registerSearchCommand(cli, logger, runDirectAnalysis);
//   registerXrefsCommand(cli, logger, runDirectAnalysis);
//   registerTraceCommand(cli, logger, runDirectAnalysis);
// };
//
// const registerOverviewCommands = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   const overviewOptions = z.object({
//     snapshot: z
//       .string()
//       .min(1)
//       .optional()
//       .describe("Load and update a local analysis snapshot"),
//     ...nativeOpenOptionFields,
//   });
//   // `analyze` declares the JavaScript integrity policy for its JavaScript
//   // lane. Preserve whether the caller supplied it until the target lane is
//   // known, then apply the JavaScript default only in that lane. The owner
//   // field fills an omission with that default, and an `.optional()` wrapper
//   // keeps reporting it, so every binary target would look like an explicit
//   // policy. Remove the owner's default before making the CLI option optional;
//   // reapply its metadata so help and `--schema` keep describing the option.
//   const ownerIntegrityPolicy =
//     javascriptApplicationOptions.shape.integrityPolicy;
//   const defaultIntegrityPolicy = ownerIntegrityPolicy.parse(undefined);
//   const policyMetadata = ownerIntegrityPolicy.meta();
//   const omittableIntegrityPolicy = ownerIntegrityPolicy
//     .removeDefault()
//     .optional();
//   const laneIntegrityPolicy =
//     policyMetadata === undefined
//       ? omittableIntegrityPolicy
//       : omittableIntegrityPolicy.meta(policyMetadata);
//   cli.command(CLI_COMMANDS.analyze, {
//     description: "Get an overview of an app",
//     args: z.object({
//       path: z
//         .string()
//         .min(1)
//         .describe("App, program, or analysis database path"),
//     }),
//     options: overviewOptions.extend({
//       integrityPolicy: laneIntegrityPolicy,
//       sourcePath: javascriptApplicationOptions.shape.sourcePath,
//     }),
//     run: async ({ args, options }) => {
//       // Route JavaScript targets exactly like analyze-javascript-application,
//       // including typed cancellation; cancellation wraps logging so its exit
//       // code is not replaced by the logged failure status.
//       if (await routesToJavaScriptAnalysis(args.path, options))
//         return withCommandCancellation((signal) =>
//           logCliCommand(logger, "analyze", () =>
//             runCliJavaScriptApplicationAnalysis(
//               {
//                 input_path: absoluteCallerPath(args.path),
//                 integrity_policy:
//                   options.integrityPolicy ?? defaultIntegrityPolicy,
//                 ...(options.sourcePath === undefined
//                   ? {}
//                   : { source_paths: options.sourcePath }),
//               },
//               signal,
//             ),
//           ),
//         );
//       return logCliCommand(logger, "analyze", () => {
//         if (options.sourcePath !== undefined)
//           throw new AnalysisInputError(
//             "analyze_javascript_application",
//             undefined,
//             [
//               {
//                 path: ["source_paths"],
//                 reason: "invalid_value",
//                 message:
//                   "Source selection requires the static JavaScript ASAR/directory analysis lane.",
//               },
//             ],
//           );
//         if (options.integrityPolicy !== undefined)
//           throw new AnalysisInputError(
//             "analyze_javascript_application",
//             undefined,
//             [
//               {
//                 path: ["integrity_policy"],
//                 reason: "invalid_value",
//                 message:
//                   "An integrity policy requires the static JavaScript ASAR/directory analysis lane; binary_overview accepts no input.",
//               },
//             ],
//           );
//         return runDirectAnalysis(
//           args.path,
//           "binary_overview",
export const _l = 127;

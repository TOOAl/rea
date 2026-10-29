export const __stub = 1;
//           {},
//           directAnalysisOptionsFromCli(logger, options),
//         );
//       });
//     },
//   });
//   cli.command(CLI_COMMANDS.inspect, {
//     description: "Inspect an app overview with evidence",
//     args: z.object({
//       path: z.string().describe("App, program, or analysis database path"),
//     }),
//     options: overviewOptions,
//     run: ({ args, options }) =>
//       logCliCommand(logger, "inspect", () =>
//         runDirectAnalysis(
//           args.path,
//           "binary_overview",
//           {},
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// const registerDecompileCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   cli.command(CLI_COMMANDS.decompile, {
//     description: "Read one part of an app as code",
//     args: z.object({
//       path: z.string().describe("App or program path"),
//       address: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Procedure name or address"),
//     }),
//     options: z.object({
//       procedure: z
//         .string()
//         .min(1)
//         .optional()
//         .describe(
//           "Procedure name or address; use --procedure=<value> for leading dashes",
//         ),
//       "file-offset": z
//         .string()
//         .regex(/^0x[0-9a-fA-F]+$/u)
//         .optional()
//         .describe(
//           "Ghidra source-file byte offset; mapped internally to an analysis address",
//         ),
//       snapshot: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Load and update a local analysis snapshot"),
//       ...nativeOpenOptionFields,
//     }),
//     run: ({ args, options }) =>
//       logCliCommand(logger, "decompile", () =>
//         runDirectAnalysis(
//           args.path,
//           "procedure_pseudo_code",
//           {
//             procedure: resolveCliAnalysisSelector(
//               args.address,
//               options["file-offset"] === undefined
//                 ? options.procedure
//                 : resolveCliAnalysisSelector(
//                     options.procedure,
//                     `file-offset:${options["file-offset"]}`,
//                     "file-offset",
//                     "procedure_pseudo_code",
//                   ),
//               options["file-offset"] === undefined
//                 ? "procedure"
//                 : "file-offset",
//               "procedure_pseudo_code",
//             ),
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// /** Select static JavaScript analysis only when no binary-analysis option applies. */
// const routesToJavaScriptAnalysis = async (
//   path: string,
//   options: {
//     readonly snapshot?: string | undefined;
//     readonly "target-format"?: "dos-com" | "raw-binary" | undefined;
//     readonly architecture?: string | undefined;
//     readonly "entry-point"?: string | undefined;
//     readonly provider?: string | undefined;
//   },
// ): Promise<boolean> =>
//   options.provider === undefined &&
//   options.snapshot === undefined &&
//   options["target-format"] === undefined &&
//   options.architecture === undefined &&
//   options["entry-point"] === undefined &&
//   (await isJavaScriptApplicationPath(path));
//
// const isJavaScriptApplicationPath = async (path: string): Promise<boolean> => {
//   const lower = path.toLowerCase();
//   if (lower.endsWith(".asar")) return true;
//   // `A.app/` and `A.app/.` name the same bundle as `A.app`.
//   if (lower.replace(/(?:\/\.?)+$/u, "").endsWith(".app")) return false;
//   try {
//     return (await stat(path)).isDirectory();
//   } catch (cause: unknown) {
//     // A missing or unreadable path is not a JavaScript application directory;
//     // the caller falls through to direct binary analysis instead.
//     void cause;
//     return false;
//   }
// };
//
// const registerXrefsCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
export const _l = 127;

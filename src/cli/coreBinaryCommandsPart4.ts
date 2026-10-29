export const __stub = 1;
//               args.address,
//               options.procedure,
//               "procedure",
//               "analyze_function",
//             ),
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// const registerInstructionsCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   cli.command(CLI_COMMANDS.instructions, {
//     description: "Read every raw instruction without decompiling",
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
//       snapshot: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Load and update a local analysis snapshot"),
//       ...nativeOpenOptionFields,
//     }),
//     run: ({ args, options }) =>
//       logCliCommand(logger, CLI_COMMANDS.instructions, () =>
//         runDirectAnalysis(
//           args.path,
//           "read_function_instructions",
//           {
//             procedure: resolveCliAnalysisSelector(
//               args.address,
//               options.procedure,
//               "procedure",
//               "read_function_instructions",
//             ),
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// const registerSearchCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   cli.command(CLI_COMMANDS.search, {
//     description: "Search every analyzed string or procedure name",
//     args: z.object({
//       path: z.string().describe("App or program path"),
//       pattern: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Literal text or regex pattern"),
//     }),
//     options: z.object({
//       pattern: z
//         .string()
//         .min(1)
//         .optional()
//         .describe(
//           "Complete literal text or regex pattern; use --pattern=<value> for leading dashes",
//         ),
//       kind: z
//         .enum(["strings", "procedures"])
//         .default("strings")
//         .describe("Analyzed item kind to search"),
//       mode: z
//         .enum(["literal", "regex"])
//         .default("literal")
//         .describe("Interpret the pattern as literal text or a regex"),
//       caseSensitive: z
//         .boolean()
//         .default(false)
//         .describe("Match the pattern with exact letter case"),
//       snapshot: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Load and update a local analysis snapshot"),
//       ...nativeOpenOptionFields,
//     }),
//     run: ({ args, options }) =>
//       logCliCommand(logger, "search", () =>
//         runDirectAnalysis(
//           args.path,
//           options.kind === "strings" ? "search_strings" : "search_procedures",
//           {
//             pattern: resolveCliAnalysisSelector(
//               args.pattern,
//               options.pattern,
//               "pattern",
//               options.kind === "strings"
//                 ? "search_strings"
//                 : "search_procedures",
//             ),
//             mode: options.mode,
//             case_sensitive: options.caseSensitive,
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
export const _l = 125;

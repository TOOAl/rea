export const __stub = 1;
//   cli.command(CLI_COMMANDS.xrefs, {
//     description: "List bounded references to an analyzed address",
//     args: z.object({
//       path: z.string().describe("App or program path"),
//       address: z.string().min(1).optional().describe("Address or symbol name"),
//     }),
//     options: z.object({
//       address: z
//         .string()
//         .min(1)
//         .optional()
//         .describe(
//           "Address or symbol name; use --address=<value> for leading dashes",
//         ),
//       snapshot: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Load and update a local analysis snapshot"),
//       ...nativeOpenOptionFields,
//     }),
//     run: ({ args, options }) =>
//       logCliCommand(logger, "xrefs", () =>
//         runDirectAnalysis(
//           args.path,
//           "xrefs",
//           {
//             address: resolveCliAnalysisSelector(
//               args.address,
//               options.address,
//               "address",
//               "xrefs",
//             ),
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// const registerTraceCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   cli.command(CLI_COMMANDS.trace, {
//     description: "Trace a literal feature through analyzed references",
//     args: z.object({
//       path: z.string().describe("App or program path"),
//       query: z.string().min(1).optional().describe("Literal feature query"),
//     }),
//     options: z.object({
//       query: z
//         .string()
//         .min(1)
//         .optional()
//         .describe(
//           "Complete literal feature query; use --query=<value> for leading dashes",
//         ),
//       caseSensitive: z
//         .boolean()
//         .default(false)
//         .describe("Match the query with exact letter case"),
//       snapshot: z
//         .string()
//         .min(1)
//         .optional()
//         .describe("Load and update a local analysis snapshot"),
//       ...nativeOpenOptionFields,
//     }),
//     run: ({ args, options }) =>
//       logCliCommand(logger, "trace", () =>
//         runDirectAnalysis(
//           args.path,
//           "trace_feature",
//           {
//             query: resolveCliAnalysisSelector(
//               args.query,
//               options.query,
//               "query",
//               "trace_feature",
//             ),
//             case_sensitive: options.caseSensitive,
//           },
//           directAnalysisOptionsFromCli(logger, options),
//         ),
//       ),
//   });
// };
//
// const registerFunctionCommand = (
//   cli: CliInstance,
//   logger: Logger,
//   runDirectAnalysis: DirectAnalysis["runDirectAnalysis"],
// ): void => {
//   cli.command(CLI_COMMANDS.function, {
//     description: "Analyze one complete function with evidence",
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
//       logCliCommand(logger, "function", () =>
//         runDirectAnalysis(
//           args.path,
//           "analyze_function",
//           {
//             procedure: resolveCliAnalysisSelector(
export const _l = 127;

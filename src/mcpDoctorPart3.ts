export const __stub = 1;
//       observed_catalog_digest: observedIdentity.catalogDigest,
//     },
//     request_flow: {
//       tool: "binary_session",
//       ok: requestFlow.ok && requestFlow.value.isError !== true,
//     },
//     checks,
//   };
// };
//
// /**
//  * Dispatcher entry for `rea mcp doctor`, kept separate from Incur MCP setup.
//  * @public
//  */
// export const runProductionMcpDoctorCli = async (
//   arguments_: readonly string[],
//   input: { readonly dispatcherPath: string; readonly packageRoot: string },
// ): Promise<{ readonly output: string; readonly exitCode: number }> => {
//   const started = performance.now();
//   const parsed = parseOutputArguments(arguments_);
//   if (!parsed.ok) {
//     if (parsed.help)
//       return { output: `${renderMcpDoctorHelp()}\n`, exitCode: 0 };
//     return {
//       output: `${Formatter.format(
//         { code: "VALIDATION_ERROR", message: parsed.message },
//         parsed.format,
//       )}\n`,
//       exitCode: 1,
//     };
//   }
//   const result = await runProductionMcpDoctor({
//     command: process.execPath,
//     args: [resolve(input.dispatcherPath), "mcp"],
//     cwd: input.packageRoot,
//     environment: process.env,
//   });
//   const outputValue = parsed.fullOutput
//     ? {
//         ok: result.healthy,
//         ...(result.healthy ? { data: result } : { error: result }),
//         meta: {
//           command: MCP_DOCTOR_COMMAND,
//           duration: `${Math.round(performance.now() - started)}ms`,
//         },
//       }
//     : result;
//   return {
//     output: `${Formatter.format(outputValue, parsed.format)}\n`,
//     exitCode: result.healthy ? 0 : 1,
//   };
// };
//
// /** Compare exact names while retaining actionable mismatch locations. */
// export const compareInventory = (
//   expectedNames: readonly string[],
//   observedNames: readonly string[],
// ): InventoryComparison => {
//   const expected = new Set(expectedNames);
//   const observed = new Set(observedNames);
//   return {
//     expected: expectedNames.length,
//     observed: observedNames.length,
//     missing: [...expected].filter((name) => !observed.has(name)).sort(),
//     unexpected: [...observed].filter((name) => !expected.has(name)).sort(),
//     duplicates: [...observed]
//       .filter(
//         (name) =>
//           observedNames.filter((candidate) => candidate === name).length > 1,
//       )
//       .sort(),
//   };
// };
//
// const inventoryCheck = (
//   name: string,
//   comparison: InventoryComparison,
// ): McpDoctorCheck => ({
//   name: `inventory:${name}`,
//   ok:
//     comparison.expected === comparison.observed &&
//     comparison.missing.length === 0 &&
//     comparison.unexpected.length === 0 &&
//     comparison.duplicates.length === 0,
//   detail: `expected=${String(comparison.expected)} observed=${String(comparison.observed)} missing=${comparison.missing.join(",") || "none"} unexpected=${comparison.unexpected.join(",") || "none"} duplicates=${comparison.duplicates.join(",") || "none"}`,
// });
//
// const parseIdentityToolResult = (
//   input: unknown,
// ): {
//   readonly packageVersion: string | null;
//   readonly catalogDigest: string | null;
// } => {
//   if (!isRecord(input) || !isRecord(input.result))
//     return { packageVersion: null, catalogDigest: null };
//   const identity = input.result.server_identity;
//   if (!isRecord(identity)) return { packageVersion: null, catalogDigest: null };
//   const packageIdentity = identity.package;
//   const catalog = identity.catalog;
//   const digests = isRecord(catalog) ? catalog.digests : undefined;
//   return {
//     packageVersion:
//       isRecord(packageIdentity) && typeof packageIdentity.version === "string"
//         ? packageIdentity.version
//         : null,
//     catalogDigest:
//       isRecord(digests) && typeof digests.combined_sha256 === "string"
//         ? digests.combined_sha256
//         : null,
//   };
// };
//
// /**
//  * Parsed `rea mcp doctor` arguments, including a help request. The `help`
//  * variant is the only success-independent early return; every other accepted
//  * flag is an output selector declared in `MCP_DOCTOR_OPTIONS`.
//  */
// type McpDoctorArguments =
//   | {
//       readonly ok: true;
//       readonly format: OutputFormat;
//       readonly fullOutput: boolean;
//     }
//   | { readonly ok: false; readonly help: true }
//   | {
//       readonly ok: false;
//       readonly help: false;
//       readonly format: OutputFormat;
//       readonly message: string;
//     };
//
// const parseOutputArguments = (
//   arguments_: readonly string[],
// ): McpDoctorArguments => {
//   // Help wins over output selection and validation errors, but only when it
//   // appears in option position. A token consumed as `--format`'s value is
export const _l = 136;

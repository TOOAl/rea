export const __stub = 1;
// import { Client } from "@modelcontextprotocol/client";
// import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
// import { Formatter, Help, z } from "incur";
// import { performance } from "node:perf_hooks";
// import { resolve } from "node:path";
// import { StringDecoder } from "node:string_decoder";
//
// import { createCatalogIdentity } from "./catalogIdentity.js";
// import {
//   compactPresentationForMcpInputSchemaProfile,
//   parseMcpInputSchemaProfile,
// } from "./config/mcpInputSchemaProfile.js";
// import { parseMcpOutputSchemaProfile } from "./config/mcpOutputSchemaProfile.js";
// import { PROMPT_CONTRACTS } from "./contracts/promptContracts.js";
// import { TOOL_CONTRACTS } from "./contracts/toolContracts.js";
// import { err, ok } from "./domain/result.js";
// import { PRODUCT_IDENTITY } from "./identity.js";
// import { MCP_STARTUP_POLICY } from "./mcpStartupPolicy.js";
//
// const OUTPUT_FORMATS = ["toon", "json", "yaml", "md", "jsonl"] as const;
// type OutputFormat = (typeof OUTPUT_FORMATS)[number];
//
// /**
//  * Canonical `rea mcp doctor` options. This schema is the single source of
//  * truth: the argument parser accepts exactly these options (plus the `-h`
//  * alias below) and the help renderer lists them. Keep them in sync by
//  * changing this schema, not either consumer.
//  */
// const MCP_DOCTOR_OPTIONS = z.object({
//   format: z.enum(OUTPUT_FORMATS).optional().describe("Output format"),
//   json: z.boolean().optional().describe("Emit the report as JSON"),
//   fullOutput: z.boolean().optional().describe("Show the full output envelope"),
//   help: z.boolean().optional().describe("Show help"),
// });
//
// const MCP_DOCTOR_ALIAS = { help: "h" } as const;
//
// const MCP_DOCTOR_COMMAND = "rea mcp doctor";
// const MCP_DOCTOR_DESCRIPTION = "Validate MCP server startup and tool listing";
//
// /** Help flags derived from `MCP_DOCTOR_OPTIONS` plus its alias. */
// const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"]);
//
// /**
//  * Answer an advertised help request without starting a diagnostic session.
//  * Global options are hidden because this dispatcher entry accepts only the
//  * options above; the hint says so explicitly instead of implying full
//  * Incur parity.
//  */
// const renderMcpDoctorHelp = (): string =>
//   Help.formatCommand(MCP_DOCTOR_COMMAND, {
//     description: MCP_DOCTOR_DESCRIPTION,
//     hideGlobalOptions: true,
//     options: MCP_DOCTOR_OPTIONS,
//     alias: MCP_DOCTOR_ALIAS,
//     hint: "This entry accepts only the options above.",
//   });
//
// interface McpDoctorOptions {
//   readonly command: string;
//   readonly args: readonly string[];
//   readonly cwd: string;
//   readonly environment: Readonly<Record<string, string | undefined>>;
//   readonly deadlineMs?: number;
// }
//
// interface InventoryComparison {
//   readonly expected: number;
//   readonly observed: number;
//   readonly missing: readonly string[];
//   readonly unexpected: readonly string[];
//   readonly duplicates: readonly string[];
// }
//
// interface McpDoctorCheck {
//   readonly name: string;
//   readonly ok: boolean;
//   readonly detail: string;
// }
//
// /** Diagnose the actual production stdio adapter with one startup-bounded SDK session. */
// export const runProductionMcpDoctor = async (options: McpDoctorOptions) => {
//   const catalog = catalogIdentityForEnvironment(options.environment);
//   const deadline =
//     performance.now() +
//     (options.deadlineMs ?? MCP_STARTUP_POLICY.doctorDeadlineMs);
//   const controller = new AbortController();
//   const timer = setTimeout(
//     () => controller.abort(new Error("Production MCP doctor deadline expired")),
//     Math.max(1, Math.ceil(deadline - performance.now())),
//   );
//   const stderr = captureStderr();
//   const transport = new OwnedStdioClientTransport({
//     command: options.command,
//     args: [...options.args],
//     cwd: options.cwd,
//     env: targetFreeEnvironment(options.environment),
//     stderr: "pipe",
//   });
//   transport.stderr?.on("data", stderr.append);
//   const client = new Client({ name: "rea-mcp-doctor", version: "1" });
//   let result: ProductionMcpDoctorResult;
//   let cleanupFailure: { readonly cause: unknown } | undefined;
//   try {
//     await client.connect(
//       transport,
//       requestOptions(deadline, controller.signal),
//     );
//     result = await inspectProductionMcpSession(
//       client,
//       deadline,
//       controller.signal,
//       catalog,
//     );
//   } catch (cause: unknown) {
//     result = {
//       healthy: false,
//       adapter: "production-stdio" as const,
//       server: null,
//       inventory: null,
//       identity: null,
//       request_flow: { tool: "binary_session", ok: false },
//       checks: [
//         {
//           name: "transport",
//           ok: false,
//           detail: errorMessage(cause),
//         },
//       ],
//     };
//   } finally {
//     clearTimeout(timer);
//     try {
//       await client.close();
//     } catch (cause: unknown) {
//       cleanupFailure = { cause };
export const _l = 136;

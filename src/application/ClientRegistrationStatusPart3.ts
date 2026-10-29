export const __stub = 1;
//         activation,
//       );
//     } catch (cause: unknown) {
//       record(
//         unavailableStatus(
//           client,
//           isMissing(cause) ? "missing" : "invalid",
//           selectedConfigPath,
//         ),
//       );
//     }
//   }
//   return inspections.sort((left, right) =>
//     compareUnicodeCodePoints(left.status.client, right.status.client),
//   );
// };
//
// const registrationActivation = (
//   registration: z.output<typeof registrationSchema>,
//   client: SetupClient,
//   parsed: ClientConfigurationDocument,
// ): "enabled" | "disabled" =>
//   (client.format !== "grok" && registration.disabled === true) ||
//   (registration.enabled === false &&
//     !clientServerForcedEnabled(parsed, PRODUCT_IDENTITY.mcpServerKey)) ||
//   ((parsed.dialect === "zcode" || parsed.dialect === "zcode_fallback") &&
//     registration.enable === false) ||
//   clientServerListedDisabled(parsed, PRODUCT_IDENTITY.mcpServerKey)
//     ? "disabled"
//     : "enabled";
//
// const registrationAligned = ({
//   registration,
//   client,
//   currentCommandPath,
//   platform,
//   kimiInputSchemaProfileSelected,
// }: {
//   readonly registration: z.output<typeof registrationSchema>;
//   readonly client: SetupClient;
//   readonly currentCommandPath: string | undefined;
//   readonly platform: NodeJS.Platform;
//   readonly kimiInputSchemaProfileSelected: boolean;
// }): "aligned" | "stale" | "unknown" => {
//   const command = [registration.command, ...registration.args];
//   const identity = classifyClientRegistrationCommand(
//     command,
//     currentCommandPath,
//   );
//   if (identity === "unknown") return "unknown";
//   if (identity === "foreign") return "stale";
//   if (
//     client.name === "grok_build" &&
//     registration.startup_timeout_sec !==
//       MCP_STARTUP_POLICY.codexStartupTimeoutSeconds
//   )
//     return "stale";
//   if (
//     client.name === "codex" &&
//     (registration.startup_timeout_sec === undefined ||
//       registration.tool_timeout_sec === undefined)
//   )
//     return "stale";
//   if (
//     client.name === "kimi" &&
//     (registration.startupTimeoutMs === undefined ||
//       registration.toolTimeoutMs === undefined)
//   )
//     return "stale";
//   if (client.name === "kimi" && !kimiInputSchemaProfileSelected) return "stale";
//   if (
//     (client.format === "kimi" ||
//       client.format === "omp" ||
//       client.format === "pi") &&
//     registration.type !== undefined &&
//     registration.type !== "stdio"
//   )
//     return "stale";
//   if (client.format === "vscode" && registration.type !== "stdio")
//     return "stale";
//   // A Harness registration only connects as the rea stdio server; another
//   // server name or transport leaves the session without REA tools.
//   if (
//     client.format === "dsh" &&
//     (registration.serverName !== "rea" || registration.transport !== "stdio")
//   )
//     return "stale";
//   if (
//     client.format === "copilot_cli" &&
//     (registration.type !== "stdio" ||
//       JSON.stringify(registration.tools) !== JSON.stringify(["*"]))
//   )
//     return "stale";
//   if (client.format === "commandcode" && registration.transport !== "stdio")
//     return "stale";
//   if (
//     (["npx", "bunx"] as const).some((runner) => {
//       const expected = packageRunnerRegistrationCommand(runner, platform);
//       return (
//         command.length === expected.length &&
//         command.every((argument, index) => argument === expected[index])
//       );
//     })
//   )
//     return "aligned";
//   if (
//     currentCommandPath !== undefined &&
//     currentCommandPath.length > 0 &&
//     command.length === 3 &&
//     command[2] === "mcp" &&
//     isAbsolute(command[0] ?? "") &&
//     isAbsolute(command[1] ?? "") &&
//     resolve(command[0] ?? "") === resolve(process.execPath) &&
//     resolve(command[1] ?? "") === currentCommandPath
//   )
//     return "aligned";
//   if (
//     currentCommandPath !== undefined &&
//     currentCommandPath.length > 0 &&
//     command.length === 2 &&
//     command[1] === "mcp" &&
//     isAbsolute(command[0] ?? "") &&
//     resolve(command[0] ?? "") === currentCommandPath
//   )
//     return "aligned";
//   return "stale";
// };
//
// const parseRegistration = (
//   value: unknown,
//   client: SetupClient,
// ): z.output<typeof registrationSchema> => {
//   if (client.format === "dsh")
//     return registrationSchema
//       .pick({ command: true, args: true, serverName: true, transport: true })
//       .strip()
//       .parse(value);
//   if (client.format === "opencode") {
//     const entry = z
//       .object({
//         type: z.literal("local"),
//         command: z.array(z.string()).min(1),
//         environment: z.record(z.string(), z.string()).optional(),
//       })
//       .passthrough()
//       .parse(value);
//     const [command = "", ...args] = entry.command;
//     return registrationSchema.parse({
//       ...entry,
//       command,
export const _l = 150;

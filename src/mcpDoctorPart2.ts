export const __stub = 1;
//     }
//     try {
//       // An interrupted connect can clear the client's transport reference
//       // before its startup child is closed. The transport retains that child.
//       await transport.close();
//     } catch (cause: unknown) {
//       cleanupFailure = {
//         cause:
//           cleanupFailure === undefined || cleanupFailure.cause === cause
//             ? cause
//             : new AggregateError(
//                 [cleanupFailure.cause, cause],
//                 `MCP client and transport cleanup failed: ${errorMessage(cleanupFailure.cause)}; ${errorMessage(cause)}`,
//               ),
//       };
//     }
//   }
//   if (cleanupFailure !== undefined)
//     result = {
//       ...result,
//       healthy: false,
//       checks: [
//         ...result.checks,
//         {
//           name: "cleanup",
//           ok: false,
//           detail: `MCP stdio cleanup failed: ${errorMessage(cleanupFailure.cause)}`,
//         },
//       ],
//     };
//   return { ...result, diagnostics: stderr.value() };
// };
//
// type ProductionMcpDoctorResult =
//   | Awaited<ReturnType<typeof inspectProductionMcpSession>>
//   | {
//       readonly healthy: false;
//       readonly adapter: "production-stdio";
//       readonly server: null;
//       readonly inventory: null;
//       readonly identity: null;
//       readonly request_flow: {
//         readonly tool: "binary_session";
//         readonly ok: false;
//       };
//       readonly checks: readonly McpDoctorCheck[];
//     };
//
// /** Join SDK-triggered and caller-triggered close calls for the same child. */
// class OwnedStdioClientTransport extends StdioClientTransport {
//   #closePromise: Promise<void> | undefined;
//
//   override close(): Promise<void> {
//     this.#closePromise ??= super.close();
//     return this.#closePromise;
//   }
// }
//
// const inspectProductionMcpSession = async (
//   client: Client,
//   deadline: number,
//   signal: AbortSignal,
//   catalog: ReturnType<typeof createCatalogIdentity>,
// ) => {
//   const request = requestOptions(deadline, signal);
//   const [tools, prompts] = await Promise.all([
//     client.listTools(undefined, request),
//     client.listPrompts(undefined, request),
//   ]);
//   const sessionTool = tools.tools.find(({ name }) => name === "binary_session");
//   const requestFlow = await client
//     .callTool(
//       { name: "binary_session", arguments: {} },
//       {
//         ...requestOptions(deadline, signal),
//         ...(sessionTool === undefined ? {} : { toolDefinition: sessionTool }),
//       },
//     )
//     .then(ok, (cause: unknown) =>
//       err({ kind: "request-flow" as const, detail: errorMessage(cause) }),
//     );
//   const inventory = {
//     tools: compareInventory(
//       TOOL_CONTRACTS.map(({ name }) => name),
//       tools.tools.map(({ name }) => name),
//     ),
//     prompts: compareInventory(
//       PROMPT_CONTRACTS.map(({ name }) => name),
//       prompts.prompts.map(({ name }) => name),
//     ),
//   };
//   const observedIdentity = parseIdentityToolResult(
//     requestFlow.ok ? requestFlow.value.structuredContent : undefined,
//   );
//   const serverVersion = client.getServerVersion();
//   const protocolVersion = client.getNegotiatedProtocolVersion();
//   const checks: McpDoctorCheck[] = [
//     {
//       name: "initialize",
//       ok:
//         serverVersion?.name === PRODUCT_IDENTITY.mcpServerKey &&
//         serverVersion.version === PRODUCT_IDENTITY.packageVersion &&
//         protocolVersion !== undefined,
//       detail: `${serverVersion?.name ?? "unknown"}@${serverVersion?.version ?? "unknown"}; protocol=${protocolVersion ?? "unknown"}`,
//     },
//     ...Object.entries(inventory).map(([name, comparison]) =>
//       inventoryCheck(name, comparison),
//     ),
//     {
//       name: "server-identity",
//       ok:
//         observedIdentity.packageVersion === PRODUCT_IDENTITY.packageVersion &&
//         observedIdentity.catalogDigest === catalog.digests.combined_sha256,
//       detail: `package=${observedIdentity.packageVersion ?? "missing"}; catalog=${observedIdentity.catalogDigest ?? "missing"}`,
//     },
//     {
//       name: "request-flow",
//       ok: requestFlow.ok && requestFlow.value.isError !== true,
//       detail: requestFlow.ok
//         ? "binary_session target-free request"
//         : requestFlow.error.detail,
//     },
//   ];
//   return {
//     healthy: checks.every(({ ok }) => ok),
//     adapter: "production-stdio" as const,
//     server: {
//       name: serverVersion?.name ?? null,
//       version: serverVersion?.version ?? null,
//       protocol_version: protocolVersion ?? null,
//     },
//     inventory,
//     identity: {
//       expected_package_version: PRODUCT_IDENTITY.packageVersion,
//       observed_package_version: observedIdentity.packageVersion,
//       expected_catalog_digest: catalog.digests.combined_sha256,
export const _l = 136;

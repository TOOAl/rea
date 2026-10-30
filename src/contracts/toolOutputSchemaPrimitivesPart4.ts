export const __stub = 1;
//     }),
//     server_identity: z.object({
//       package: z.object({
//         name: z.string(),
//         version: z.string(),
//         root_path: z.string(),
//         build_commit: z.string().nullable(),
//       }),
//       server: z.object({
//         name: z.string(),
//         version: z.string(),
//         started_at: z.string(),
//         command_path: z.string().nullable(),
//       }),
//       sdk: z.object({
//         server: z.string(),
//         client_test: z.string(),
//         core: z.string(),
//       }),
//       negotiated_protocol_version: z.string().nullable(),
//       client: z.object({ name: z.string(), version: z.string() }).nullable(),
//       skill: z.object({ name: z.string(), expected_version: z.string() }),
//       catalog: z.strictObject({
//         counts: z.strictObject({
//           cli_commands: z.number().int().min(0),
//           mcp_tools: z.number().int().min(0),
//           mcp_prompts: z.number().int().min(0),
//         }),
//         digests: z.strictObject({
//           tools_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//           prompts_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//           combined_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//         }),
//       }),
//       protocol_features: z.object({
//         progress: z.boolean(),
//         cancellation: z.boolean(),
//         elicitation: z.boolean(),
//       }),
//       alignment: z.object({
//         state: z.enum(["aligned", "mcp_server_restart_required", "unknown"]),
//         reasons: z.array(z.string()),
//         remediation: z.string().nullable(),
//       }),
//     }),
//   })
//   .passthrough();
//
// export const nullableText = z.string().nullable();
// export const addressList = z.array(z.string());
// export const addressedEntry = z.object({
//   address: z.string(),
//   name: z.string(),
// });
// export const containingProcedureResolution = z.discriminatedUnion("found", [
//   z.object({
//     query_address: z.string(),
//     found: z.literal(true),
//     procedure: procedureIdentitySchema,
//   }),
//   z.object({
//     query_address: z.string(),
//     found: z.literal(false),
//     procedure: z.null(),
//     reason: z.enum(["outside_segments", "not_in_procedure"]),
//   }),
// ]);
//
// const unavailable = z.object({
//   available: z.literal(false),
//   reason: z.string(),
// });
//
// const availableMemoryPermissions = z.object({
//   available: z.literal(true),
//   source: z.literal("ghidra-memory-block"),
// });
//
// export const addressedValue = z.object({
//   address: z.string(),
//   value: z.string(),
//   symbol: z
//     .object({
//       primary: z.boolean(),
//       dynamic: z.boolean(),
//       external: z.boolean(),
//       type: z.string(),
//       source: z.enum(["default", "analysis", "ai", "imported", "user_defined"]),
//     })
//     .optional(),
//   procedure: z
//     .object({
//       external: z.boolean(),
//       thunk: z.boolean(),
//       thunk_target: z.string().nullable(),
//     })
//     .optional(),
//   string: z
//     .object({
//       encoding: z.string(),
//       termination: z.enum(["missing", "present_or_not_required"]),
//       byte_length: z.number().int().min(0),
//     })
//     .optional(),
// });
//
// const memoryRegionOutput = z.object({
//   name: z.string(),
//   start: z.string(),
//   end: z.string(),
//   readable: z.boolean().nullable(),
//   writable: z.boolean().nullable(),
//   executable: z.boolean().nullable(),
//   permissions: z.union([unavailable, availableMemoryPermissions]),
//   provenance: z.enum(["hopper-public-python-api", "ghidra-memory-block"]),
//   address_space: z.string().optional(),
//   image_base: z.string().optional(),
//   initialized: z.boolean().optional(),
//   overlay: z.boolean().optional(),
// });
//
// export const segmentOutput = evidenceResultOf(
//   z.array(memoryRegionOutput.extend({ sections: z.array(memoryRegionOutput) })),
// );
//
// export const procedureInfoOutput = evidenceResultOf(
//   z.object({
//     name: z.string(),
//     entrypoint: z.string(),
//     basicblock_count: z.number().int().min(0),
//     length: z.number().min(0),
//     signature: nullableText,
//     locals: z.array(localVariableSchema),
//     classification: procedureClassificationSchema.nullable(),
//     body: functionBodySchema,
//   }),
// );
//
// export const symbolDiscoveryOutput = (property: "classes" | "protocols") =>
//   evidenceResultOf(
//     z.object({
//       count: z.number().int().min(0),
//       [property]: z.array(addressedEntry),
//     }),
//   );
//
// export const graphNode = z.discriminatedUnion("status", [
//   z.object({
//     address: z.string(),
//     status: z.literal("ok"),
//     calls: z.array(z.string()),
//     relationship_coverage: relationshipCoverageSchema,
//     limitations: z.array(z.string()).optional(),
//   }),
//   z.object({
//     address: z.string(),
//     status: z.literal("error"),
//     error: analysisErrorProjectionSchema,
//   }),
// ]);
//
// export const functionDossierOutput = evidenceResultOf(functionDossierSchema);
export const _l = 162;

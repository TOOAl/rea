export const __stub = 1;
//     if (client.format === "unsupported") {
//       if (manualRemediation !== undefined)
//         record({
//           client: client.name,
//           config_path: client.markerPath ?? client.configPath,
//           command: [],
//           state: "manual",
//           remediation: manualRemediation,
//         });
//       continue;
//     }
//     let selectedConfigPath = client.configPath;
//     try {
//       const configuration = await readEffectiveClientRegistrationConfiguration(
//         client,
//         options.resources,
//       );
//       if (!configuration.ok) {
//         record({
//           client: client.name,
//           config_path: configuration.error.path,
//           command: [],
//           state: "invalid",
//           remediation: configuration.error.detail,
//         });
//         continue;
//       }
//       const { document: parsed, configPath } = configuration.value;
//       selectedConfigPath = configPath;
//       if (parsed === undefined) {
//         record(unavailableStatus(client, "missing", configPath));
//         continue;
//       }
//       const policy = await readClientPolicyBlock(
//         client,
//         parsed,
//         undefined,
//         options.resources,
//       );
//       if (!policy.ok) {
//         record({
//           client: client.name,
//           config_path: configPath,
//           command: [],
//           state: "invalid",
//           remediation: policy.error.detail,
//         });
//         continue;
//       }
//       const policyBlock = policy.value;
//       const raw = effectiveClientServer(parsed, PRODUCT_IDENTITY.mcpServerKey);
//       if (raw === undefined) {
//         const editabilityError =
//           parsed.dialect === "dsh"
//             ? dshDocument(parsed.document).editabilityError
//             : undefined;
//         if (editabilityError !== undefined) {
//           record({
//             client: client.name,
//             config_path: configPath,
//             command: [],
//             state: "invalid",
//             remediation: editabilityError.message,
//           });
//           continue;
//         }
//         record(unavailableStatus(client, "missing", configPath));
//         continue;
//       }
//       const effectiveClient: SetupClient =
//         parsed.dialect === "zcode_fallback"
//           ? {
//               ...client,
//               configPath,
//               configPaths: [configPath],
//               format: "zcode_fallback",
//             }
//           : client;
//       const registration = parseRegistration(raw, effectiveClient);
//       const registrationEnvironment =
//         client.name === "kimi" || client.name === "codex"
//           ? clientRegistrationEnvironmentDetails(
//               parsed,
//               {},
//               "effective",
//               options.resolveProviderRequestBudget,
//             )
//           : undefined;
//       if (
//         registrationEnvironment !== undefined &&
//         !registrationEnvironment.ok
//       ) {
//         record({
//           client: client.name,
//           config_path: configPath,
//           command: [],
//           state: "invalid",
//           remediation: registrationEnvironment.error.message,
//         });
//         continue;
//       }
//       const command: RegistrationCommand = [
//         registration.command,
//         ...registration.args,
//       ];
//       const packageReference = clientRegistrationPackageReference(command);
//       const activation = registrationActivation(registration, client, parsed);
//       const packageVersion = exactRegisteredPackageVersion(packageReference);
//       const packageVersionDrift =
//         packageVersion !== undefined &&
//         packageVersion !== PRODUCT_IDENTITY.packageVersion;
//       const alignment = registrationAligned({
//         registration,
//         client: effectiveClient,
//         currentCommandPath,
//         platform: options.platform ?? process.platform,
//         kimiInputSchemaProfileSelected:
//           registrationEnvironment?.ok === true &&
//           registrationEnvironment.value.values.REA_MCP_INPUT_SCHEMA_PROFILE !==
//             undefined,
//       });
//       record(
//         configuredStatus(
//           effectiveClient,
//           command,
//           alignment === "unknown"
//             ? "unknown"
//             : activation === "enabled" &&
//                 !packageVersionDrift &&
//                 alignment === "aligned" &&
//                 (parsed.dialect !== "dsh" ||
//                   dshDocument(parsed.document).ready) &&
//                 policyBlock === undefined
//               ? "aligned"
//               : "stale",
//           policyBlock ??
//             (packageVersionDrift
//               ? packageVersionRemediation(packageReference ?? "", client)
//               : alignment === "unknown"
//                 ? unknownEntryPointRemediation()
//                 : undefined),
//           packageReference,
//           registrationEnvironment?.ok === true
//             ? timeoutAdvisory(
//                 client,
//                 registration,
//                 registrationEnvironment.value.timeoutInputs,
//               )
//             : undefined,
//         ),
export const _l = 150;

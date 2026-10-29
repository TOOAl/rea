export const __stub = 1;
//           request.operation,
//           admitted.message,
//         );
//       const engine = {
//         name: engineName,
//         version: admitted.version,
//         executable_path: command.command,
//         executable_sha256: command.sha256,
//         source_revision: null,
//         worker_count: 1 as const,
//       };
//       const reportPath = join(root.path, "report.json");
//       let result: unknown;
//       let raw: unknown;
//       if (request.operation === "inspect_firmware_regions") {
//         const processRun = await run([
//           "--quiet",
//           "--search-all",
//           "--threads",
//           "1",
//           "--log",
//           reportPath,
//           target.inputPath,
//         ]);
//         const report = await readFirmwareCommandReport({
//           path: reportPath,
//           engine: engineName,
//           operation: request.operation,
//           execution: processRun,
//         });
//         result = firmwareResultSchemas.inspect_firmware_regions.parse({
//           engine,
//           input_size: target.size,
//           regions: normalizeBinwalkReport(
//             report,
//             target.inputPath,
//             target.size,
//           ),
//           coverage: "signature_scan",
//         });
//         raw = { report, execution: processRun, version_execution: versionRun };
//       } else {
//         if (!isAbsolute(request.input.output_directory))
//           throw new AnalysisInputError(request.operation, undefined, [
//             {
//               path: ["output_directory"],
//               reason: "invalid_format",
//               message: "Extraction output directory must be absolute",
//             },
//           ]);
//         const outputRoot = join(root.path, "extracted");
//         const processRun = await run(
//           [
//             "--process-num",
//             "1",
//             "--depth",
//             String(request.input.max_depth),
//             "--randomness-depth",
//             "0",
//             "--report",
//             reportPath,
//             "--log",
//             join(root.path, "unblob.log"),
//             "--extract-dir",
//             outputRoot,
//             target.inputPath,
//           ],
//           {
//             root: outputRoot,
//             bytes: request.input.max_output_bytes,
//             entries: request.input.max_output_files,
//           },
//         );
//         const report = await readFirmwareCommandReport({
//           path: reportPath,
//           engine: engineName,
//           operation: request.operation,
//           execution: processRun,
//         });
//         const normalized = normalizeUnblobReport(report, {
//           inputPath: target.inputPath,
//           outputRoot,
//           ...target.selection,
//           maxDepth: request.input.max_depth,
//         });
//         if (processRun.exit_code === 1 && normalized.diagnostics.length === 0)
//           throw new AnalysisOutputError(
//             request.operation,
//             "Unblob failed without a reported extraction diagnostic",
//           );
//         const entries = await inventoryFirmwareOutput(
//           outputRoot,
//           request.input.max_output_bytes,
//           request.input.max_output_files,
//           request.operation,
//           signal,
//         );
//         result = await publishFirmwareExtraction({
//           outputDirectory: request.input.output_directory,
//           entries,
//           normalized,
//           selection: target.selection,
//           maxDepth: request.input.max_depth,
//           engine,
//           signal,
//           retainCleanup: (tree) => {
//             const pending: PendingFirmwareCleanup = this.#pendingCleanup.get(
//               ownedRoot.path,
//             ) ?? {
//               root: ownedRoot,
//               engine: engineName,
//               operation: request.operation,
//             };
//             pending.tree = tree;
//             this.#pendingCleanup.set(ownedRoot.path, pending);
//           },
//         });
//         raw = { report, execution: processRun, version_execution: versionRun };
//       }
//       const catalog =
//         engineName === "binwalk"
//           ? BINWALK_PROVIDER_IDENTITY
//           : UNBLOB_PROVIDER_IDENTITY;
//       outcome = ok(
//         createAnalysisExecution(
//           result,
//           { ...catalog, version: admitted.version },
//           {
//             subject: target.subject,
//             rawResult: raw,
//             limitations: [
//               ...limitations,
//               ...(admitted.status === "compatible"
//                 ? [admitted.limitation]
//                 : []),
//             ],
//             locations: [
//               {
//                 kind: "file-offset-range",
//                 start: target.selection.offset,
//                 end: target.selection.offset + target.selection.length,
export const _l = 141;

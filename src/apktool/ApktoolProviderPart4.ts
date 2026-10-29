export const __stub = 1;
//         ) {
//           copiedBytes += chunk.length;
//           if (copiedBytes > sourceSize) {
//             callback(
//               new AnalysisInputError(operation, {
//                 cause: new Error(
//                   `The selected APK changed while being copied: ${input.path}`,
//                 ),
//               }),
//             );
//             return;
//           }
//           sourceHash.update(chunk);
//           callback(null, chunk);
//         },
//       });
//       await pipeline(
//         source.createReadStream({
//           start: 0,
//           end: sourceSize,
//           autoClose: false,
//           ...(signal === undefined ? {} : { signal }),
//         }),
//         boundedSource,
//         createWriteStream(snapshot, { flags: "wx", mode: 0o600 }),
//         signal === undefined ? {} : { signal },
//       );
//       const finalSourceInfo = await source.stat();
//       if (
//         copiedBytes !== sourceSize ||
//         !sameRegularFileState(sourceInfo, finalSourceInfo)
//       )
//         throw new AnalysisInputError(operation, {
//           cause: new Error(
//             `The selected APK changed while being copied: ${input.path}`,
//           ),
//         });
//       const sha256 = sourceHash.digest("hex");
//       await source.close();
//       source = undefined;
//       await chmod(snapshot, 0o400);
//       throwIfCancelled(operation, signal);
//       const snapshotInfo = await stat(snapshot);
//       await mkdir(workspace);
//       await mkdir(framework);
//       const decoded = await runApktool(
//         operation,
//         selection,
//         [
//           "d",
//           "--no-src",
//           "-f",
//           "-o",
//           workspace,
//           "--frame-path",
//           framework,
//           snapshot,
//         ],
//         {
//           timeoutMs: DECODE_TIMEOUT_MS,
//           maxOutputBytes: DECODE_MAX_OUTPUT_BYTES,
//         },
//         signal,
//         environment,
//         (owner) => this.#pendingCommandOwners.set(owner, root),
//       );
//       if (!decoded.ok) {
//         await removeWorkspace();
//         return err(failureWithCleanup(decoded.error));
//       }
//       throwIfCancelled(operation, signal);
//       const yml = await readBoundedText(
//         join(workspace, "apktool.yml"),
//         MANIFEST_MAX_BYTES,
//         operation,
//         signal,
//       );
//       if (yml.text === null || yml.truncated) {
//         throw new AnalysisProtocolError(
//           `apktool produced missing or oversized apktool.yml: ${input.path}`,
//         );
//       }
//       const metadata = parseApktoolYml(yml.text);
//       const manifestRead = await readBoundedText(
//         join(workspace, "AndroidManifest.xml"),
//         MANIFEST_MAX_BYTES,
//         operation,
//         signal,
//       );
//       const manifest = manifestRead.text;
//       const packageName =
//         manifest === null || manifestRead.truncated
//           ? null
//           : parseManifestPackage(manifest);
//       const stringsDirectory =
//         input.locale === undefined
//           ? "values"
//           : `values-${localeQualifier(input.locale)}`;
//       const stringsRead = input.include_strings
//         ? await readBoundedText(
//             join(workspace, "res", stringsDirectory, "strings.xml"),
//             STRINGS_XML_MAX_BYTES,
//             operation,
//             signal,
//           )
//         : { text: null, truncated: false };
//       // Do not parse an incomplete XML document as though its projection were complete.
//       const stringsXml = stringsRead.truncated ? null : stringsRead.text;
//       const parsedStrings =
//         stringsXml === null
//           ? { entries: [], unparsedCount: 0 }
//           : parseDecodedStrings(stringsXml);
//       const bounded = parsedStrings.entries.slice(0, MAX_STRINGS);
//       const files = await countDecodedFiles(workspace, signal, operation);
//       throwIfCancelled(operation, signal);
//       const coverage =
//         (stringsXml !== null && parsedStrings.entries.length > MAX_STRINGS) ||
//         manifestRead.truncated ||
//         stringsRead.truncated ||
//         parsedStrings.unparsedCount > 0 ||
//         files.capped
//           ? "partial"
//           : "complete";
//       await removeWorkspace();
//       return ok(
//         createAnalysisExecution(
//           {
//             client,
//             target: { path: input.path, bytes: snapshotInfo.size, sha256 },
//             metadata: {
//               version_name: metadata.versionName,
//               version_code: metadata.versionCode,
//               min_sdk_version: metadata.minSdkVersion,
//               target_sdk_version: metadata.targetSdkVersion,
//               package_name: packageName,
//             },
//             manifest,
//             strings: bounded,
//             locale: input.locale ?? null,
//             locales: files.locales,
//             decoded_file_count: files.count,
//             coverage,
//           },
//           provider,
//           {
//             limitations: [
//               "Decoding skips smali (--no-src); Java-source recovery belongs to the JADX family",
//               ...(input.locale !== undefined &&
//               stringsRead.text === null &&
//               input.include_strings
//                 ? [`No strings.xml was found for locale ${input.locale}`]
//                 : []),
//               ...(input.include_strings &&
//               stringsRead.text === null &&
//               input.locale === undefined
//                 ? [
//                     "No default res/values/strings.xml was found in the decoded workspace",
//                   ]
//                 : []),
//               ...(parsedStrings.unparsedCount > 0
//                 ? [
//                     `String entries omitted due to malformed XML or unsupported markup: ${String(parsedStrings.unparsedCount)}`,
//                   ]
//                 : []),
//               ...(parsedStrings.entries.length > MAX_STRINGS
//                 ? [
//                     `strings reports the first ${String(MAX_STRINGS)} of ${String(parsedStrings.entries.length)} entries`,
//                   ]
//                 : []),
//               ...(manifestRead.truncated
//                 ? [
//                     `manifest is truncated at ${String(MANIFEST_MAX_BYTES)} bytes`,
//                   ]
//                 : []),
//               ...(stringsRead.truncated
//                 ? [
//                     `strings.xml exceeds the ${String(STRINGS_XML_MAX_BYTES)}-byte projection budget`,
//                   ]
//                 : []),
//               ...(files.capped
//                 ? [
//                     `Decoded workspace enumeration stopped after ${String(MAX_DECODED_ENTRIES_VISITED)} entries; decoded_file_count and locales may be partial`,
//                   ]
//                 : []),
//               ...(cleanupFailure === null ? [] : [cleanupFailure]),
//             ],
//           },
//         ),
//       );
//     } catch (cause) {
//       await removeWorkspace();
//       return err(
//         failureWithCleanup(
//           signal?.aborted === true
//             ? new AnalysisCancelledError(operation, { cause })
//             : sourceAdmissionFailed
//               ? new AnalysisInputError(operation, { cause })
//               : cause instanceof AnalysisInputError
//                 ? cause
//                 : cause instanceof AnalysisCancelledError ||
//                     cause instanceof AnalysisProtocolError
//                   ? cause
//                   : new AnalysisProtocolError(
//                       "Apktool resource projection failed",
//                       {
//                         cause,
//                       },
//                     ),
//         ),
//       );
//     } finally {
//       await source?.close().catch(() => undefined);
//     }
//   }
// }
export const _l = 215;

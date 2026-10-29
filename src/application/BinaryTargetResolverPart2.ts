export const __stub = 1;
//       }
//       // Probe WASM content before suffix-only database routing; an explicit
//       // database selection keeps the caller's chosen interpretation.
//       const artifactFormat =
//         targetKind === "database"
//           ? undefined
//           : await detectArtifactFormat(path, handle, signal);
//       if (
//         targetKind === "database" ||
//         (targetKind === undefined && path.toLowerCase().endsWith(".hop"))
//       )
//         return ok({
//           path,
//           sourcePath,
//           sha256: await sha256Handle(handle, path, metadata, signal),
//           kind: "database",
//           format: "analysis-database",
//         });
//       if (artifactFormat !== undefined) {
//         const identity = {
//           path,
//           sourcePath,
//           sha256: await sha256Handle(handle, path, metadata, signal),
//         };
//         return isArchiveFormat(artifactFormat)
//           ? ok({ ...identity, kind: "archive", format: artifactFormat })
//           : ok({ ...identity, kind: "artifact", format: artifactFormat });
//       }
//       const detected = await readExecutableMetadata(
//         handle,
//         hostArchitecture,
//         signal,
//       );
//       if (!detected.ok)
//         return err(
//           new BinaryTargetError(path, detected.error, {
//             constraint: "file_format_rejected",
//           }),
//         );
//       return ok({
//         path,
//         sourcePath,
//         ...bundle,
//         sha256: await sha256Handle(handle, path, metadata, signal),
//         kind: "executable",
//         ...detected.value,
//       });
//     } finally {
//       await handle.close();
//     }
//   } catch (cause: unknown) {
//     if (cause instanceof AnalysisCancelledError) return err(cause);
//     if (signal?.aborted === true && cause === signal.reason)
//       return err(
//         new AnalysisCancelledError("resolve_binary_target", { cause }),
//       );
//     if (cause instanceof BinaryTargetError) return err(cause);
//     if (!(cause instanceof Error)) throw cause;
//     const failure = classifyBinaryTargetFilesystemFailure(candidate, cause);
//     if (failure === undefined) throw cause;
//     return err(failure);
//   }
// };
//
// /** Classify a filesystem failure while reading a previously selected target. */
// export const classifyBinaryTargetFilesystemFailure = (
//   path: string,
//   cause: unknown,
// ): BinaryTargetError | undefined => {
//   if (!(cause instanceof Error)) return undefined;
//   const code = filesystemErrorCode(cause);
//   return code === undefined
//     ? undefined
//     : new BinaryTargetError(path, targetFailureReason(code, cause.message), {
//         cause,
//       });
// };
//
// const filesystemErrorCode = (cause: Error): string | undefined => {
//   const code: unknown = Reflect.get(cause, "code");
//   return typeof code === "string" ? code : undefined;
// };
//
// const targetFailureReason = (code: string, detail: string): string => {
//   switch (code) {
//     case "ENOENT":
//     case "ENOTDIR":
//       return `target does not exist or a path component is not a directory: ${detail}`;
//     case "EACCES":
//     case "EPERM":
//       return `permission denied while reading target: ${detail}`;
//     case "EISDIR":
//       return `target is a directory, not a readable file: ${detail}`;
//     case "ENOTFILE":
//       return "target is not a regular file";
//     case "ELOOP":
//       return `target changed while being opened: ${detail}`;
//     default:
//       return `target could not be read (${code}): ${detail}`;
//   }
// };
//
// const throwIfTargetResolutionCancelled = (signal?: AbortSignal): void => {
//   if (signal?.aborted === true)
//     throw new AnalysisCancelledError("resolve_binary_target");
// };
//
// const detectArtifactFormat = async (
//   path: string,
//   handle: FileHandle,
//   signal?: AbortSignal,
// ): Promise<
//   | Exclude<
//       BinaryTarget["format"],
//       | "analysis-database"
//       | "mach-o"
//       | "mach-o-universal"
//       | "elf"
//       | "pe"
//       | "dos-mz"
//       | "dos-com"
//       | "raw-binary"
//     >
//   | undefined
// > => {
//   throwIfTargetResolutionCancelled(signal);
//   const lower = path.toLowerCase();
//   const magic = Buffer.alloc(4096);
//   const observed = await handle.read(magic, 0, magic.length, 0);
//   throwIfTargetResolutionCancelled(signal);
//   if (
//     observed.bytesRead >= 8 &&
//     magic.subarray(0, 8).equals(Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]))
//   )
//     throw new BinaryTargetError(
//       path,
//       "WebAssembly v1 artifacts are not supported by the native opening route",
//       { constraint: "wasm_requires_static_inspection" },
//     );
//   if (hasZipSignature(magic.subarray(0, observed.bytesRead))) {
//     // The HarmonyOS App Pack suffix `.app` is a root-input concept; a nested
//     // ZIP member ending in `.app` keeps the generic zip classification.
//     if (lower.endsWith(".app")) return "app-pack";
//     return zipPackageFormatForPath(lower) ?? "zip";
//   }
//   // Binary plists, including keyed archives, often use other extensions.
//   if (hasBinaryPlistSignature(magic.subarray(0, observed.bytesRead)))
//     return "plist";
//   const named = namedArtifactFormat(lower);
//   if (named !== undefined) return named;
//   if (
//     lower.endsWith(".pkg") &&
//     observed.bytesRead >= 4 &&
//     magic.subarray(0, 4).equals(Buffer.from("xar!"))
//   )
//     return "pkg";
//   if (lower.endsWith(".dmg")) {
//     throwIfTargetResolutionCancelled(signal);
//     const size = (await handle.stat()).size;
//     throwIfTargetResolutionCancelled(signal);
//     if (size >= 512) {
//       const trailer = Buffer.alloc(4);
//       const read = await handle.read(trailer, 0, trailer.length, size - 512);
//       throwIfTargetResolutionCancelled(signal);
//       if (read.bytesRead === 4 && trailer.equals(Buffer.from("koly")))
//         return "dmg";
//     }
//   }
//   // XML property lists can use archive-specific suffixes such as .archive.
//   // The named-format check above keeps .js, .map, and .asar classifications.
//   const xmlProbe = createXmlPlistSignatureProbe();
//   let xmlState = xmlProbe.write(magic.subarray(0, observed.bytesRead));
//   if (xmlState === "matched") return "plist";
//   const chunk = Buffer.alloc(XML_PLIST_PROBE_CHUNK_BYTES);
export const _l = 174;

export const __stub = 1;
// ): {
//   readonly kind: ArtifactOccurrence["artifact_kind"];
//   readonly format: ArtifactOccurrence["artifact_format"];
// } => {
//   const lower = path.toLowerCase();
//   if (lower.endsWith(".map"))
//     return { kind: "source-map", format: "source-map" };
//   if (isJavaScriptSourcePath(path))
//     return { kind: "javascript", format: "javascript-bundle" };
//   if (/\.framework(?:\/|$)/u.test(lower))
//     return { kind: "framework", format: "file" };
//   if (/\.(?:node|dylib|so)$/u.test(lower))
//     return {
//       kind: lower.endsWith(".node") ? "native-addon" : "dynamic-library",
//       format: "file",
//     };
//   if (lower.endsWith(".plist")) return { kind: "plist", format: "plist" };
//   if (lower.endsWith(".entitlements"))
//     return { kind: "entitlements", format: "entitlements" };
//   return { kind: "resource", format: "file" };
// };
//
// /** Classify executable formats from bytes while retaining path-specific roles. */
// export const classifyArtifactContent = (
//   path: string,
//   prefix: Buffer,
//   fileSize = prefix.length,
// ): {
//   readonly kind: ArtifactOccurrence["artifact_kind"];
//   readonly format: ArtifactOccurrence["artifact_format"];
// } => {
//   const format = classifyArtifactBytes(prefix, fileSize);
//   const byPath = classifyArtifactPath(path);
//   if (
//     format === "plist" &&
//     !hasBinaryPlistSignature(prefix) &&
//     (["javascript", "source-map", "entitlements"].includes(byPath.kind) ||
//       path.toLowerCase().endsWith(".asar"))
//   )
//     return byPath;
//   if (
//     format === "file" &&
//     path.toLowerCase().endsWith(".asar") &&
//     hasAsarHeader(prefix)
//   )
//     return { kind: "container", format: "asar" };
//   return artifactRoleForFormat(path, format);
// };
//
// /**
//  * Electron ASAR starts with a size pickle whose payload is one uint32, then
//  * a header pickle whose payload begins with a JSON object.
//  */
// export const hasAsarHeader = (prefix: Buffer): boolean => {
//   if (prefix.length < 17 || prefix.readUInt32LE(0) !== 4) return false;
//   const headerSize = prefix.readUInt32LE(4);
//   const payloadSize = prefix.readUInt32LE(8);
//   if (headerSize < 16 || payloadSize !== headerSize - 4) return false;
//   const stringLength = prefix.readUInt32LE(12);
//   return (
//     stringLength >= 2 && stringLength <= payloadSize - 4 && prefix[16] === 0x7b
//   );
// };
//
// const artifactRoleForFormat = (
//   path: string,
//   format: ArtifactOccurrence["artifact_format"],
// ): ReturnType<typeof classifyArtifactPath> => {
//   const byPath = classifyArtifactPath(path);
//   if (format === "file" || format === byPath.format) return byPath;
//   if (format === "unknown") return { kind: "unknown", format };
//   if (format === "zip")
//     return {
//       kind: "container",
//       format: zipPackageFormatForPath(path) ?? format,
//     };
//   if (format === "plist") return { kind: "plist", format };
//   return {
//     kind: ["native-addon", "dynamic-library"].includes(byPath.kind)
//       ? byPath.kind
//       : ("executable" as const),
//     format,
//   };
// };
//
// /** Classify storage bytes independently of path names, roles, and permissions. */
// export const classifyArtifactBytes = (
//   prefix: Buffer,
//   fileSize = prefix.length,
// ): ArtifactNode["format"] => {
//   if (hasZipSignature(prefix)) return "zip";
//   if (hasBinaryPlistSignature(prefix)) return "plist";
//   if (hasXmlPlistSignature(prefix)) return "plist";
//   const fatFormat = classifyFatArtifact(prefix, fileSize);
//   if (fatFormat !== null) return fatFormat;
//   if (prefix.length >= 4) {
//     const magic = prefix.readUInt32BE(0);
//     if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic))
//       return "mach-o";
//     if (prefix.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])))
//       return "elf";
//   }
//   if (prefix.length >= 2 && prefix[0] === 0x4d && prefix[1] === 0x5a) {
//     if (
//       !Number.isSafeInteger(fileSize) ||
//       fileSize < prefix.length ||
//       prefix.length < Math.min(fileSize, 64)
//     )
//       return "unknown";
//     const windowsHeader = observeMzWindowsHeader(prefix, fileSize);
//     if (windowsHeader.state === "signature-needed") return "unknown";
//     if (windowsHeader.state === "declared") {
//       const windowsOffset = windowsHeader.offset;
//       if (
//         windowsHeader.signature === "PE" &&
//         windowsOffset >= 64 &&
//         windowsOffset <= prefix.length - 4
//       )
//         return "pe";
//       return "unknown";
//     }
//     if (parseDosMzHeader(prefix, fileSize).ok) return "dos-mz";
//     return "unknown";
//   }
//   return "file";
// };
//
// const classifyFatArtifact = (
//   prefix: Buffer,
//   fileSize: number,
// ): ArtifactNode["format"] | null => {
//   const fatHeader = readFatContainerHeader(prefix, fileSize);
//   if (fatHeader.state === "needs-data" || fatHeader.state === "malformed")
//     return "unknown";
//   if (fatHeader.state === "not-fat") return null;
//   const identity = classifyFatContainerIdentity(fatHeader, (offset) => {
//     if (offset >= prefix.length) return undefined;
//     if (offset + 4 > prefix.length) return null;
//     return prefix.readUInt32BE(offset);
//   });
//   return identity.state === "mach-o" ? "mach-o-universal" : "unknown";
// };
//
// /** Relation of a non-source-map occurrence to its parent. */
// const relationFor = (path: string): ArtifactEdge["relation"] =>
//   path.toLowerCase().includes(".framework/") ? "embeds" : "contains";
//
// const depth = (path: string): number => path.split("/").length;
export const _l = 148;

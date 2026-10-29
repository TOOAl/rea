export const __stub = 1;
// import { createHash } from "node:crypto";
// import { parseBinary } from "plist";
//
// import { appleResourceKeyFields } from "../../domain/apple/appleAssetCatalog.js";
// import {
//   interfaceBuilderConnectionFieldNames,
//   isUIKitRuntimeConnectionClass,
// } from "../../domain/apple/interfaceBuilderKeyedArchive.js";
// import { DirectoryArtifactReader } from "../DirectoryArtifactReader.js";
// import {
//   projectPlistValue,
//   unknownDateLimitation,
// } from "../../domain/apple/plistValue.js";
// import {
//   omittedPrototypeKeysLimitation,
//   parseXmlPropertyList,
// } from "../../domain/propertyListKeys.js";
// import { decodeNibArchive, type NibArchiveDocument } from "./NibArchive.js";
// import {
//   preflightPropertyListDecode,
//   InterfaceBuilderDecodeBudget,
//   InterfaceBuilderDecodeBudgetExceeded,
// } from "./InterfaceBuilderDecodeBudget.js";
// import type { ArtifactEntry } from "../ArtifactReader.js";
// import {
//   buildInterfaceBuilderAnalysis,
//   interfaceBuilderLimitsSchema,
//   type InterfaceBuilderDocumentInput,
// } from "../../domain/apple/interfaceBuilderGraph.js";
// import {
//   mergeNibHierarchies,
//   projectNibViewHierarchy,
//   type NibHierarchyNode,
// } from "./NibViewHierarchy.js";
// import { jsonValueSchema, type JsonValue } from "../../domain/jsonValue.js";
// import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
//
// import { decodeXmlPlistText } from "../../domain/propertyListXmlText.js";
// import {
//   hasBinaryPlistSignature,
//   hasNibArchiveSignature,
// } from "../../domain/apple/appleArchiveFormat.js";
//
// const MAX_AGGREGATE_INPUT_BYTES = 32 * 1024 * 1024;
// const MAX_AGGREGATE_DECODE_BYTES = 256 * 1024 * 1024;
// const MAX_REPORTED_OMITTED_ARCHIVES = 64;
//
// /** Decode compiled Interface Builder archives from a local app bundle. */
// export const analyzeInterfaceBuilderBundle = async (input: {
//   readonly bundlePath: string;
//   readonly targetSha256: string;
//   readonly limits?: unknown;
//   readonly signal?: AbortSignal;
// }) => {
//   const limits = interfaceBuilderLimitsSchema.parse(input.limits ?? {});
//   const reader = new DirectoryArtifactReader(input.bundlePath);
//   const documents: InterfaceBuilderDocumentInput[] = [];
//   const invalid: string[] = [];
//   const omittedArchives: Array<{ path: string; reason: string }> = [];
//   let unreportedOmittedArchives = 0;
//   const incompleteHierarchies = new Map<string, number>();
//   const unresolvedConnections = new Map<string, number>();
//   const prototypeKeyOmissions = new Map<string, number | null>();
//   const unknownDates = new Map<string, number>();
//   let omitted = 0;
//   let attempted = 0;
//   let aggregateInputBytes = 0;
//   const decodeBudget = new InterfaceBuilderDecodeBudget(
//     MAX_AGGREGATE_DECODE_BYTES,
//   );
//   const recordOmittedArchive = (path: string, reason: string): void => {
//     if (omittedArchives.length < MAX_REPORTED_OMITTED_ARCHIVES)
//       omittedArchives.push({ path, reason });
//     else unreportedOmittedArchives += 1;
//   };
//   try {
//     const selection = await selectInterfaceBuilderCandidates(
//       reader,
//       input.signal,
//       limits.max_documents,
//     );
//     omitted = selection.omitted;
//     for (const entry of selection.omittedSamples)
//       recordOmittedArchive(entry.path, "max_documents");
//     unreportedOmittedArchives += selection.unreportedOmitted;
//     for (const entry of selection.selected) {
//       // Plist representation reserved for this document before decoding.
//       let plistReservation = 0;
//       try {
//         const remainingInputBytes =
//           MAX_AGGREGATE_INPUT_BYTES - aggregateInputBytes;
//         if (
//           entry.declaredSize !== null &&
//           entry.declaredSize > remainingInputBytes
//         ) {
//           omitted += 1;
//           recordOmittedArchive(entry.path, "aggregate_decode_budget_exhausted");
//           continue;
//         }
//         attempted += 1;
//         const bytes = await readEntry(
//           reader,
//           entry,
//           input.signal,
//           remainingInputBytes,
//         );
//         aggregateInputBytes += bytes.length;
//         const isNibArchive = hasNibArchiveSignature(bytes);
//         let nib: ReturnType<typeof projectNibArchive> | null = null;
//         let xmlText: string | undefined;
//         let binaryPrototypeKeyObserved = false;
//         if (isNibArchive) {
//           const documentBudget = new InterfaceBuilderDecodeBudget(
//             decodeBudget.remainingBytes,
//           );
//           nib = projectNibArchive(
//             decodeNibArchive(bytes, documentBudget),
//             documentBudget,
//             limits.max_objects,
//           );
//           decodeBudget.reserve(
//             documentBudget.usedBytes,
//             "NIBArchive representation exceeds the aggregate Interface Builder decode budget",
//           );
//         } else {
//           if (!hasBinaryPlistSignature(bytes))
//             xmlText = decodeXmlPlistText(bytes);
//           const decodedReservation = preflightPropertyListDecode(
//             bytes,
//             decodeBudget.remainingBytes,
//             xmlText,
//           );
//           decodeBudget.reserve(
//             decodedReservation.estimatedBytes,
//             "plist representation exceeds the aggregate Interface Builder decode budget",
//           );
//           plistReservation = decodedReservation.estimatedBytes;
//           binaryPrototypeKeyObserved =
//             decodedReservation.binaryPrototypeKeyObserved;
//         }
//         const {
//           value: raw,
//           omittedPrototypeKeys,
//           unknownDateCount,
//         } = nib === null
//           ? decodePlist(bytes, xmlText, binaryPrototypeKeyObserved)
//           : { value: nib.raw, omittedPrototypeKeys: 0, unknownDateCount: 0 };
//         if (nib !== null && nib.omitted > 0)
//           incompleteHierarchies.set(entry.path, nib.omitted);
//         if (nib !== null && nib.unresolvedConnections > 0)
//           unresolvedConnections.set(entry.path, nib.unresolvedConnections);
//         if (omittedPrototypeKeys !== 0)
//           prototypeKeyOmissions.set(entry.path, omittedPrototypeKeys);
//         if (unknownDateCount !== 0)
//           unknownDates.set(entry.path, unknownDateCount);
//         const documentHash = createHash("sha256").update(bytes).digest("hex");
//         documents.push({
//           relativePath: entry.path,
//           archiveSha256: documentHash,
//           documentKind: entry.path.includes(".storyboardc/")
//             ? "storyboard_scene"
//             : "nib",
//           raw,
//           ...(nib === null || nib.omitted === 0
//             ? {}
//             : { omittedSerializedHierarchyReferences: nib.omitted }),
//         });
//       } catch (cause: unknown) {
//         if (input.signal?.aborted === true) throw cause;
//         if (cause instanceof InterfaceBuilderDecodeBudgetExceeded) {
//           // A document rejected while decoding, e.g. beyond the shared depth
//           // limit, retains no representation; later documents keep its share.
//           decodeBudget.release(plistReservation);
//           omitted += 1;
//           recordOmittedArchive(entry.path, cause.reason);
//           continue;
//         }
//         invalid.push(
//           `${entry.path}: ${cause instanceof Error ? cause.message : "archive decode failed"}`,
//         );
//       }
//     }
//   } finally {
//     await reader.close();
//   }
//   const result = buildInterfaceBuilderAnalysis({
//     targetSha256: input.targetSha256,
//     toolVersion: "rea-interface-builder/1",
export const _l = 188;

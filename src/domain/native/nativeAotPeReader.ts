export const __stub = 1;
//           if (!budget.consumeWork(payload * 4))
//             throw new Error("NativeAOT parser work budget is exhausted");
//           if (
//             payload > Math.floor((first.length - cursor) / 4) ||
//             payload > Math.floor((outputLimit - outputLength) / 4)
//           )
//             throw new Error("Inline relative fixups leave DEHYDRATED_DATA");
//           for (let i = 0; i < payload; i++) {
//             const target = readRelativePointer(
//               image,
//               dehydrated.start + BigInt(cursor),
//             );
//             if (target === null)
//               throw new Error("Invalid inline relative pointer");
//             cursor += 4;
//             appendRel(target);
//           }
//           break;
//         case 5:
//           if (!budget.consumeWork(payload * 4))
//             throw new Error("NativeAOT parser work budget is exhausted");
//           if (
//             payload > Math.floor((first.length - cursor) / 4) ||
//             payload > Math.floor((outputLimit - outputLength) / 8)
//           )
//             throw new Error("Inline pointer fixups leave DEHYDRATED_DATA");
//           for (let i = 0; i < payload; i++) {
//             const target = readRelativePointer(
//               image,
//               dehydrated.start + BigInt(cursor),
//             );
//             if (target === null) throw new Error("Invalid inline pointer");
//             cursor += 4;
//             appendPtr(target);
//           }
//           break;
//         default:
//           throw new Error(`Unsupported DEHYDRATED_DATA command ${command}`);
//       }
//     }
//   } catch (cause: unknown) {
//     budget.releaseWorkingMemory(output.byteLength);
//     throw cause;
//   }
//   const hydrated = output.subarray(0, outputLength);
//   const sha256 = createHash("sha256").update(hydrated).digest("hex");
//   image.addOverlay({ base, sizeBytes: outputLength, sha256, bytes: hydrated });
//   return { base, sizeBytes: outputLength, sha256 };
// };
//
// const discoverTables = (
//   image: PeImage,
//   hydrated: { readonly base: bigint; readonly sizeBytes: number } | null,
//   budget: NativeAotParserBudget,
// ): {
//   tables: MethodTableIndex;
//   pointerCount: number;
//   pointerSlotsExamined: number;
//   scanBytesExamined: number;
//   scanBytesOmitted: number;
//   methodTableValidationItemsExamined: number;
//   workBytesExamined: number;
//   truncated: boolean;
// } => {
//   const ranges: { start: bigint; end: bigint }[] = [];
//   for (const section of image.sections) {
//     if (
//       (section.characteristics & 0x40000000) === 0 ||
//       (section.characteristics & 0x20000000) !== 0
//     )
//       continue;
//     const extent = fileBackedVirtualExtent(section);
//     if (extent > 0) {
//       ranges.push({
//         start: image.addressForRva(section.rva),
//         end: image.addressForRva(section.rva + extent),
//       });
//     }
//   }
//   if (hydrated !== null) {
//     const section = image.sections.find(
//       (candidate) =>
//         (candidate.characteristics & 0x40000000) !== 0 &&
//         (candidate.characteristics & 0x20000000) === 0 &&
//         hydrated.base >= image.addressForRva(candidate.rva) &&
//         hydrated.base + BigInt(hydrated.sizeBytes) <=
//           image.addressForRva(candidate.rva + virtualExtent(candidate)),
//     );
//     if (section !== undefined)
//       ranges.push({
//         start: hydrated.base,
//         end: hydrated.base + BigInt(hydrated.sizeBytes),
//       });
//   }
//   ranges.sort((left, right) => (left.start < right.start ? -1 : 1));
//   const merged: { start: bigint; end: bigint }[] = [];
//   for (const range of ranges) {
//     const previous = merged.at(-1);
//     if (previous !== undefined && range.start <= previous.end) {
//       if (range.end > previous.end) previous.end = range.end;
//     } else {
//       merged.push({ ...range });
//     }
//   }
//   const totalScanBytes = merged.reduce(
//     (total, range) => total + Number(range.end - range.start),
//     0,
//   );
//   let pointerCount = 0,
//     pointerSlotsExamined = 0,
//     scanBytesExamined = 0,
//     validationItems = 0,
//     workBytesExamined = 0,
//     truncated = false;
//   const candidates = new MethodTableIndex(budget);
//   scan: for (const range of merged) {
//     let address = (range.start + 7n) & ~7n;
//     while (address + 8n <= range.end) {
//       if (!budget.consumeWork(8)) {
//         truncated = true;
//         break scan;
//       }
//       const value = readU64(image.read(address, 8));
//       pointerSlotsExamined++;
//       scanBytesExamined += 8;
//       workBytesExamined += 8;
//       if (value !== null && value !== 0n) pointerCount++;
//       const candidateAddress = address - 8n;
//       const header =
//         candidateAddress >= image.imageBase
//           ? image.read(candidateAddress, 24)
//           : null;
//       if (header !== null) {
//         const flags = header.readUInt32LE(0);
//         const elementType = (flags & 0x7c000000) >>> 26;
//         const baseSize = header.readUInt32LE(4);
//         const related = header.readBigUInt64LE(8);
//         const plausibleHeader =
//           (elementType === 0x14 || elementType === 0x15) &&
//           baseSize >= 16 &&
//           baseSize <= 0x10000000 &&
//           (related === 0n || image.read(related, 24) !== null);
//         if (!plausibleHeader) {
//           address += 8n;
//           continue;
//         }
//         const counts = image.read(candidateAddress + 16n, 4);
//         if (counts === null) {
//           address += 8n;
//           continue;
//         }
//         const itemCount = counts.readUInt16LE(0) + counts.readUInt16LE(2);
//         if (!budget.consumeWork(itemCount * 8)) {
//           truncated = true;
//           break scan;
//         }
//         validationItems += itemCount;
//         workBytesExamined += itemCount * 8;
//         const candidate = parseMethodTable(image, candidateAddress, itemCount);
//         if (candidate !== null) {
//           if (!candidates.append(candidate)) {
//             truncated = true;
//             break scan;
//           }
//         }
//       }
//       address += 8n;
//     }
//   }
//   let objectRoot = -1;
//   let objectCount = 0;
//   candidates.forEach((candidate, index) => {
//     if (
//       candidate.flags !== 0x50000000 ||
//       candidate.baseSize !== 0x18 ||
//       candidate.related !== 0n ||
//       candidate.slotsCount !== 3 ||
//       candidate.interfacesCount !== 0
//     )
//       return;
//     if (!budget.consumeWork(32)) {
//       truncated = true;
//       return;
//     }
//     const vtable = image.read(candidate.address + 24n, 32);
//     if (
//       vtable !== null &&
//       image.isExecutable(vtable.readBigUInt64LE(0)) &&
//       image.isExecutable(vtable.readBigUInt64LE(8)) &&
//       image.isExecutable(vtable.readBigUInt64LE(16)) &&
//       !image.isExecutable(vtable.readBigUInt64LE(24))
//     ) {
//       objectRoot = index;
//       objectCount++;
//     }
//   });
//   if (objectCount !== 1 || objectRoot < 0 || truncated)
//     return {
//       tables: candidates,
//       pointerCount,
//       pointerSlotsExamined,
//       scanBytesExamined,
//       scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
//       methodTableValidationItemsExamined: validationItems,
//       workBytesExamined,
//       truncated,
//     };
//   candidates.include(objectRoot);
//   let changed = true;
//   while (changed && !truncated) {
//     changed = false;
//     candidates.forEach((base, baseIndex) => {
//       if (truncated || !candidates.isIncluded(baseIndex)) return;
//       for (
//         let candidateIndex = 0;
//         candidateIndex < candidates.count;
//         candidateIndex++
//       ) {
//         if (!budget.consumeWork(8)) {
//           truncated = true;
//           return;
//         }
//         const candidate = candidates.at(candidateIndex);
//         if (
//           candidate !== undefined &&
//           candidate.related === base.address &&
//           !candidates.isIncluded(candidateIndex)
//         ) {
//           candidates.include(candidateIndex);
//           changed = true;
//         }
//       }
//       for (let index = 0; index < base.interfacesCount; index++) {
//         if (!budget.consumeWork(8)) {
//           truncated = true;
//           return;
//         }
//         const ifaceAddress = readU64(
//           image.read(
//             base.address + 24n + BigInt((base.slotsCount + index) * 8),
//             8,
//           ),
//         );
//         if (ifaceAddress === null) continue;
//         const interfaceIndex = candidates.find(ifaceAddress, budget);
//         if (budget.truncationReason !== undefined) {
//           truncated = true;
//           return;
//         }
//         if (interfaceIndex >= 0 && !candidates.isIncluded(interfaceIndex)) {
//           candidates.include(interfaceIndex);
//           changed = true;
//         }
//       }
//     });
//   }
//   return {
//     tables: candidates,
//     pointerCount,
//     pointerSlotsExamined,
//     scanBytesExamined,
//     scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
//     methodTableValidationItemsExamined: validationItems,
//     workBytesExamined,
//     truncated,
//   };
// };
//
// /** Parse only the captured x64 PE snapshot. No file reads or Ghidra database writes occur here. */
// export const parseNativeAotPe = (
//   bytes: Buffer,
//   expectedSha256: string,
//   maximumSummaryBytes: number,
//   loadedImageBase?: string,
//   limits = DEFAULT_NATIVE_AOT_PARSER_LIMITS,
// ): NativeAotPeResult => {
//   if (!Number.isSafeInteger(maximumSummaryBytes) || maximumSummaryBytes < 0)
//     throw new Error(
//       "NativeAOT summary budget must be a non-negative safe integer",
//     );
//   for (const limit of Object.values(limits))
//     if (!Number.isSafeInteger(limit) || limit < 0)
//       throw new Error(
//         "NativeAOT parser limits must be non-negative safe integers",
//       );
//   if (bytes.byteLength > limits.sourceBytes)
//     return parsedSummary(
//       nativeAotSnapshotOverCapacity(
//         expectedSha256,
//         bytes.byteLength,
//         maximumSummaryBytes,
//         limits,
//       ),
//       maximumSummaryBytes,
//     );
//   const sha256 = createHash("sha256").update(bytes).digest("hex");
//   if (sha256 !== expectedSha256)
//     throw new Error(
//       "NativeAOT snapshot digest does not match the admitted artifact identity",
//     );
//   let image: PeImage;
//   try {
//     image = new PeImage(bytes);
//   } catch (cause: unknown) {
//     return parsedSummary(
//       notApplicable(
//         sha256,
//         cause instanceof Error ? cause.message : "Unsupported PE image",
//         "unsupported-layout",
//       ),
//       maximumSummaryBytes,
//     );
//   }
//   if (
//     loadedImageBase !== undefined &&
//     BigInt(loadedImageBase) !== image.imageBase
//   )
//     return parsedSummary(
//       notApplicable(
//         sha256,
//         "Ghidra loaded the PE at a base different from its preferred image base; relocation-aware metadata mapping is not implemented.",
//         "unsupported-layout",
//       ),
//       maximumSummaryBytes,
//     );
//   const budget = new NativeAotParserBudget(limits);
//   image.setBudget(budget);
//   const directorySearch = findDirectory(image, bytes, budget);
//   if (directorySearch.truncated)
//     return parsedSummary(
//       {
//         ...notApplicable(
//           sha256,
//           "RTR signature scanning reached the NativeAOT parser work budget; a unique ReadyToRun directory was not established.",
//           "no-rtr-header",
//         ),
//         status: "partial",
//         truncated: true,
//         output_budget_bytes: maximumSummaryBytes,
//         coverage: {
//           pointer_candidates_examined: 0,
//           pointer_slots_examined: 0,
//           scan_bytes_examined: directorySearch.scanBytesExamined,
//           scan_bytes_omitted: directorySearch.scanBytesOmitted,
//           rtr_signature_scan_bytes_examined: directorySearch.scanBytesExamined,
//           rtr_signature_scan_bytes_omitted: directorySearch.scanBytesOmitted,
//           method_tables_recovered: 0,
//           frozen_string_candidates: 0,
//           work_units_examined: budget.workUnits,
//           work_budget_units: budget.limits.workUnits,
//           source_byte_budget_bytes: budget.limits.sourceBytes,
//           working_memory_budget_bytes: budget.limits.workingMemoryBytes,
//           working_memory_bytes_peak: budget.workingMemoryBytesPeak,
//           ...(budget.truncationReason === undefined
//             ? {}
//             : { truncation_reason: budget.truncationReason }),
//           basis: "no-rtr-header",
//         },
//         diagnostics: [
//           "No metadata hydration was attempted because signature coverage was incomplete.",
//         ],
//       },
//       maximumSummaryBytes,
//     );
//   if (directorySearch.directory === null && directorySearch.matches === 0)
//     return parsedSummary(
//       notApplicable(
//         sha256,
//         "No supported ReadyToRun directory signature was found in initialized non-executable PE sections.",
//         "no-rtr-header",
//       ),
//       maximumSummaryBytes,
//     );
//   if (directorySearch.matches !== 1 || directorySearch.directory === null)
//     return parsedSummary(
//       notApplicable(
//         sha256,
//         "Multiple plausible ReadyToRun directories were found; metadata identity is ambiguous.",
//         "unsupported-layout",
//       ),
//       maximumSummaryBytes,
//     );
//   const directory = directorySearch.directory;
//   if (directory.major !== 9 || directory.minor !== 1)
//     return parsedSummary(
//       {
//         ...notApplicable(
//           sha256,
//           `RTR ${directory.major}.${directory.minor} is detected but this parser supports only the .NET 8 RTR 9.1 method-table layout.`,
//           "unsupported-layout",
//         ),
//         status: "partial",
//         header_address: hex(directory.address),
//         discovery: "signature-heuristic",
//         format_major: directory.major,
//         format_minor: directory.minor,
//       },
//       maximumSummaryBytes,
//     );
//   const dehydrated = directory.sections.filter(
//     (section) => section.type === DEHYDRATED_DATA,
//   );
//   if (dehydrated.length !== 1)
//     return parsedSummary(
//       {
//         ...notApplicable(
//           sha256,
//           "RTR 9.1 directory does not contain exactly one DEHYDRATED_DATA section; metadata recovery is incomplete.",
//           "unsupported-layout",
//         ),
//         status: "partial",
//         header_address: hex(directory.address),
//         discovery: "signature-heuristic",
//         format_major: directory.major,
//         format_minor: directory.minor,
//       },
//       maximumSummaryBytes,
//     );
//   let overlay: ReturnType<typeof hydrate> = null;
//   let hydrationError: string | null = null;
//   try {
//     overlay = hydrate(image, dehydrated[0] as RtrSection, budget);
//   } catch (cause: unknown) {
//     hydrationError =
//       cause instanceof Error
//         ? cause.message
//         : "DEHYDRATED_DATA could not be hydrated";
//   }
//   const discovered = discoverTables(image, overlay, budget);
//   const frozen = directory.sections.find(
//     (section) => section.type === FROZEN_OBJECT_REGION,
//   );
//   const isRecoveredStringTable = (address: bigint): boolean => {
//     const index = discovered.tables.find(address, budget);
//     if (
//       budget.truncationReason !== undefined ||
//       index < 0 ||
//       !discovered.tables.isIncluded(index)
//     )
//       return false;
//     const table = discovered.tables.at(index);
//     if (
//       table === undefined ||
//       (table.flags & 0x7c000000) >>> 26 !== 0x14 ||
//       table.baseSize !== 0x16 ||
//       table.related === 0n
//     )
//       return false;
//     const related = discovered.tables.find(table.related, budget);
//     if (budget.truncationReason !== undefined) return false;
export const _l = 450;

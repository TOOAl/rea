export const __stub = 1;
//         : { status: "not-mach-o" };
//     const view = viewOf(head);
//     const magic = view.getUint32(0, false);
//     let header: ReturnType<typeof readFatContainerHeader>;
//     if (magic === FAT_MAGIC && size <= MAX_LOAD_COMMAND_BYTES) {
//       const complete = await readAt(0, size);
//       header =
//         complete.byteLength === size
//           ? readFatContainerHeader(complete, size)
//           : readFatContainerHeader(head, size);
//     } else header = readFatContainerHeader(head, size);
//     if (header.state !== "not-fat") {
//       if (header.state === "needs-data") {
//         header = readFatContainerHeader(
//           await readAt(0, header.requiredBytes),
//           size,
//         );
//       }
//       if (header.state === "not-fat") return { status: "not-mach-o" };
//       if (header.state === "needs-data")
//         throw new MachoFormatIssue("malformed", "FAT table is truncated");
//       if (header.state === "malformed")
//         throw new MachoFormatIssue("malformed", header.reason);
//       let identity = classifyFatContainerIdentity(header, () => undefined);
//       if (identity.state === "needs-slice-header") {
//         const sliceHeaders = new Map<number, number | null>();
//         for (const offset of identity.offsets) {
//           const bytes = await readAt(offset, 4);
//           sliceHeaders.set(
//             offset,
//             bytes.byteLength < 4 ? null : viewOf(bytes).getUint32(0, false),
//           );
//         }
//         identity = classifyFatContainerIdentity(header, (offset) =>
//           sliceHeaders.get(offset),
//         );
//       }
//       if (identity.state === "not-mach-o") return { status: "not-mach-o" };
//       if (identity.state === "malformed") {
//         // A large CAFEBABE input whose bounded prefix resembles an invalid
//         // known-CPU FAT table remains unknown until its JVM identity can be
//         // checked; do not turn the resource limit into a malformed claim.
//         if (magic === FAT_MAGIC && size > MAX_LOAD_COMMAND_BYTES)
//           throw new MachoFormatIssue(
//             "unsupported",
//             "FAT/JVM identity is unresolved because the class identity scan exceeds the 16 MiB limit",
//           );
//         throw new MachoFormatIssue(identity.category, identity.reason);
//       }
//       if (identity.state === "needs-slice-header")
//         return { status: "not-mach-o" };
//       return {
//         status: "parsed",
//         slices: await readFatSlices(readAt, header.slices),
//       };
//     }
//     if (magic === MH_CIGAM || magic === MH_CIGAM_64)
//       return { status: "parsed", slices: [await readSlice(readAt, 0, size)] };
//     if (magic === MH_MAGIC || magic === MH_MAGIC_64)
//       throw new MachoFormatIssue(
//         "unsupported",
//         "big-endian Mach-O images are not supported",
//       );
//     return { status: "not-mach-o" };
//   } catch (cause: unknown) {
//     if (cause instanceof MachoFormatIssue)
//       return { status: cause.status, reason: cause.message };
//     throw cause;
//   }
// };
//
// const readFatSlices = async (
//   readAt: ReadAt,
//   declarations: readonly FatSliceDeclaration[],
// ): Promise<MachoSlice[]> => {
//   const slices: MachoSlice[] = [];
//   // Keep validating after an unsupported slice so a later malformed slice is
//   // reported as malformed whatever the slice order.
//   let unsupported: MachoFormatIssue | undefined;
//   for (const declaration of declarations) {
//     const { offset, size: length, cpuType, cpuSubtype } = declaration;
//     let slice: MachoSlice;
//     try {
//       slice = await readSlice(readAt, offset, length, {
//         fatCpuType: cpuType,
//         fatCpuSubtype: cpuSubtype,
//         alignmentExponent: declaration.alignmentExponent,
//       });
//     } catch (cause: unknown) {
//       if (
//         !(cause instanceof MachoFormatIssue) ||
//         cause.status !== "unsupported"
//       )
//         throw cause;
//       unsupported ??= cause;
//       continue;
//     }
//     const identityIssue = validateFatSliceIdentity(declaration, {
//       cpuType: slice.cpu_type,
//       cpuSubtype: slice.cpu_subtype,
//     });
//     if (identityIssue !== null)
//       throw new MachoFormatIssue("malformed", identityIssue);
//     slices.push(slice);
//   }
//   if (unsupported !== undefined) throw unsupported;
//   return slices;
// };
//
// const readSlice = async (
//   readAt: ReadAt,
//   base: number,
//   length: number,
//   fat: {
//     readonly fatCpuType: number;
//     readonly fatCpuSubtype: number;
//     readonly alignmentExponent: number;
//   } | null = null,
// ): Promise<MachoSlice> => {
//   const header = viewOf(await readExact(readAt, base, 28, "Mach-O header"));
//   const magic = header.getUint32(0, true);
//   if (magic === MH_MAGIC_64 || magic === MH_MAGIC) {
//     const wide = magic === MH_MAGIC_64;
//     const headerSize = wide ? 32 : 28;
//     const commandCount = header.getUint32(16, true);
//     const commandBytes = header.getUint32(20, true);
//     if (commandBytes > MAX_LOAD_COMMAND_BYTES)
//       throw new MachoFormatIssue(
//         "unsupported",
//         `load commands occupy ${commandBytes} bytes, above the ${MAX_LOAD_COMMAND_BYTES}-byte limit`,
//       );
//     if (headerSize + commandBytes > length)
//       throw new MachoFormatIssue(
//         "malformed",
//         "load commands extend beyond the Mach-O slice",
//       );
//     const commands = await readExact(
//       readAt,
//       base + headerSize,
//       commandBytes,
export const _l = 140;

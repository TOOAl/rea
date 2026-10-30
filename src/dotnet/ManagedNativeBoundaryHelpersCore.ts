import type {
  ManagedNativeBoundaryInspection,
  ManagedParseIssue,
} from "../domain/managed/managedArtifact.js";
import type { ManagedMetadataLayout } from "./ManagedMetadataLayout.js";
import {
  metadataRowCursor,
  metadataCodedToken,
  metadataCodedTokenInvalidReason,
  metadataToken,
  readMetadataString,
} from "./ManagedMetadataHeaps.js";
import { readManagedValue } from "./ManagedReaderFailure.js";

type ModuleRef = ManagedNativeBoundaryInspection["module_refs"][number];
type NativeImport = ManagedNativeBoundaryInspection["pinvoke_imports"][number];
type NativeImplementation =
  ManagedNativeBoundaryInspection["native_implementations"][number];

interface MemberCore {
  readonly token: string;
  readonly rowOffset: number;
  readonly kind: NativeImport["member_kind"];
  readonly name: string;
  readonly flags: number;
  readonly implFlags: number | null;
  readonly rva: number | null;
}

const flagsHex = (value: number): string =>
  `0x${value.toString(16).padStart(4, "0")}`;

export const parseModuleRefs = (
  bytes: Buffer,
  layout: ManagedMetadataLayout,
  heapExtent: number,
  issues: ManagedParseIssue[],
): readonly ModuleRef[] => {
  const refs: ModuleRef[] = [];
  const table = layout.table(26);
  for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
    readManagedValue(() => {
      const cursor = metadataRowCursor(bytes, layout, 26, row);
      refs.push({
        token: metadataToken(26, row),
        row_offset: cursor.start,
        name: readMetadataString(
          bytes,
          layout,
          cursor.readIndex(layout.stringIndexSize),
          heapExtent,
        ),
      });
    }, issues);
  }
  return refs;
};

export const parseFields = (
  bytes: Buffer,
  layout: ManagedMetadataLayout,
  heapExtent: number,
  issues: ManagedParseIssue[],
): ReadonlyMap<string, MemberCore> => {
  const fields = new Map<string, MemberCore>();
  const table = layout.table(4);
  for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
    readManagedValue(() => {
      const cursor = metadataRowCursor(bytes, layout, 4, row);
      const flags = cursor.readUInt16();
      const name = readMetadataString(
        bytes,
        layout,
        cursor.readIndex(layout.stringIndexSize),
        heapExtent,
      );
      cursor.readIndex(layout.blobIndexSize);
      const token = metadataToken(4, row);
      fields.set(token, {
        token,
        rowOffset: cursor.start,
        kind: "field",
        name,
        flags,
        implFlags: null,
        rva: null,
      });
    }, issues);
  }
  return fields;
};

export const parseMethods = (
  bytes: Buffer,
  layout: ManagedMetadataLayout,
  heapExtent: number,
  issues: ManagedParseIssue[],
): ReadonlyMap<string, MemberCore> => {
  const methods = new Map<string, MemberCore>();
  const table = layout.table(6);
  for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
    readManagedValue(() => {
      const cursor = metadataRowCursor(bytes, layout, 6, row);
      const rva = cursor.readUInt32();
      const implFlags = cursor.readUInt16();
      const flags = cursor.readUInt16();
      const name = readMetadataString(
        bytes,
        layout,
        cursor.readIndex(layout.stringIndexSize),
        heapExtent,
      );
      cursor.readIndex(layout.blobIndexSize);
      cursor.readIndex(layout.tableIndexSize(8));
      const token = metadataToken(6, row);
      methods.set(token, {
        token,
        rowOffset: cursor.start,
        kind: "method",
        name,
        flags,
        implFlags,
        rva,
      });
    }, issues);
  }
  return methods;
};

interface ParseImplMapsContext {
  readonly bytes: Buffer;
  readonly layout: ManagedMetadataLayout;
  readonly heapExtent: number;
  readonly modules: readonly ModuleRef[];
  readonly members: ReadonlyMap<string, MemberCore>;
  readonly issues: ManagedParseIssue[];
}

export const parseImplMaps = ({
  bytes,
  layout,
  heapExtent,
  modules,
  members,
  issues,
}: ParseImplMapsContext): readonly NativeImport[] => {
  const moduleNames = new Map(modules.map((module) => [module.token, module]));
  const imports: NativeImport[] = [];
  const table = layout.table(28);
  for (let row = 1; row <= (table?.rowCount ?? 0); row += 1) {
    readManagedValue(() => {
      const cursor = metadataRowCursor(bytes, layout, 28, row);
      const mappingFlags = cursor.readUInt16();
      const memberForwardedOffset = cursor.offset;
      const memberForwardedRaw = cursor.readIndex(
        layout.codedIndexSize("MemberForwarded"),
      );
      const memberForwardedReason = metadataCodedTokenInvalidReason(
        memberForwardedRaw,
        1,
        [4, 6],
        layout.rowCounts,
      );
      if (memberForwardedReason !== null || memberForwardedRaw === 0)
        issues.push({
          code: "invalid-row",
          scope: `metadata.ImplMap:${metadataToken(28, row)}`,
          offset: memberForwardedOffset,
          detail:
            memberForwardedReason === null
              ? "ImplMap MemberForwarded coded index 0x0 is null, but the column must reference a Field or MethodDef row"
              : `ImplMap MemberForwarded coded index 0x${memberForwardedRaw.toString(16)} is invalid: ${memberForwardedReason}`,
        });
      const memberToken = metadataCodedToken(
        memberForwardedRaw,
        1,
        [4, 6],
        layout.rowCounts,
      );
      const importName = readMetadataString(
        bytes,
        layout,
        cursor.readIndex(layout.stringIndexSize),
        heapExtent,
      );
      const importScopeOffset = cursor.offset;
      const importScopeRow = cursor.readIndex(layout.tableIndexSize(26));
      const moduleCount = layout.table(26)?.rowCount ?? 0;
      const validImportScope =
        importScopeRow > 0 && importScopeRow <= moduleCount;
      if (!validImportScope)
        issues.push({
          code: "invalid-row",
          scope: `metadata.ImplMap:${metadataToken(28, row)}`,
          offset: importScopeOffset,
          detail: `ImplMap ImportScope row ${String(importScopeRow)} must reference a ModuleRef row between 1 and ${String(moduleCount)}`,
        });
      const importScopeToken = validImportScope
        ? metadataToken(26, importScopeRow)
        : null;
      const member =
        memberToken === null ? undefined : members.get(memberToken);
      imports.push({
        token: metadataToken(28, row),
        row_offset: cursor.start,
        mapping_flags: mappingFlags,
        mapping_flags_hex: flagsHex(mappingFlags),
        member_token: memberToken,
        member_kind: member?.kind ?? "unknown",
        member_name: member?.name ?? null,
        import_name: importName,
        import_scope_token: importScopeToken,
        import_scope_name:
          importScopeToken === null
            ? null
            : (moduleNames.get(importScopeToken)?.name ?? null),
        no_mangle: (mappingFlags & 0x0001) !== 0,
        char_set: charSet(mappingFlags),
        call_convention: callConvention(mappingFlags),
        supports_last_error: (mappingFlags & 0x0040) !== 0,
        best_fit: bestFit(mappingFlags),
        throw_on_unmappable_char: throwOnUnmappable(mappingFlags),
        verification: "managed-declaration-only",
      });
    }, issues);
  }
  return imports;
};

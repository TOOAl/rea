import {
  admitManagedProjection,
  managedDecodeBudget,
} from "./ManagedDecodeBudget.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import {
  managedMemberInspectionSchema,
  type ManagedMemberInspection,
  type ManagedParseIssue,
} from "../domain/managed/managedArtifact.js";
import {
  readManagedPeLayout,
  type ManagedPeLayout,
} from "./ManagedPeReader.js";
import {
  readManagedResourceDirectory,
  managedTableRowCounts,
  readManagedMetadataInventory,
} from "./ManagedMetadataInventory.js";
import { readManagedMetadataLayout } from "./ManagedMetadataLayout.js";
import {
  appendManagedParseIssues,
  ManagedReaderFailure,
  uniqueManagedParseIssues,
} from "./ManagedReaderFailure.js";
import {
  parseTypes,
  typeRanges,
  type TypeRange,
} from "./ManagedMemberInspectorCore.js";
import { edgeTargets } from "./ManagedMethodSpecs.js";
import { managedTypeNameDigests } from "./ManagedTypeNameDigests.js";
import { typeNameLookup } from "./ManagedTypeNames.js";
import { managedTypeReferences } from "./ManagedTypeReferences.js";
import { parseUserStrings } from "./ManagedUserStrings.js";
import { readTypeMemberListFacts } from "./ManagedTypeMemberLists.js";
import {
  edges,
  parseExportedTypes,
  parseFields,
  parseMemberRefs,
  parseMethods,
  type SelectedTypeTokens,
} from "./ManagedMemberRows.js";

const unavailable = (
  target: BinaryTarget,
  bytes: Buffer,
  issue: ManagedParseIssue | null,
  typeNames: readonly string[] | undefined,
): ManagedMemberInspection =>
  managedMemberInspectionSchema.parse(
    admitManagedProjection({
      artifact: {
        path: target.path,
        sha256: target.sha256,
        byte_length: bytes.length,
        format: "pe",
      },
      module: null,
      metadata: {
        status:
          issue === null
            ? "absent"
            : issue.code === "resource-limit"
              ? "partial"
              : "malformed",
        version: null,
        table_row_counts: {},
      },
      identity_scope: {
        token_identity: "build-local",
        requires_artifact_sha256: target.sha256,
        requires_mvid: null,
      },
      types: [],
      signature_resolution: "type-names-v1",
      nesting_read: false,
      exported_types: null,
      user_strings: null,
      fields: [],
      methods: [],
      member_refs: [],
      call_edges: [],
      field_accesses: [],
      // Nothing was examined, so no requested name is known to be unmatched.
      selection:
        typeNames === undefined
          ? null
          : { type_names: [...typeNames], unmatched_type_names: [] },
      coverage: {
        state: "unavailable",
        issues: issue === null ? [] : [issue],
      },
      limitations: [
        issue === null
          ? "The PE has no admitted CLI metadata; managed member inspection is unavailable."
          : "The CLI metadata could not be admitted; managed member inspection is unavailable.",
      ],
    }),
  );

const readMemberInventory = (
  bytes: Buffer,
  pe: ManagedPeLayout,
  issues: ManagedParseIssue[],
) => {
  const cli = pe.cli;
  if (cli === null)
    throw new TypeError("Managed inventory requires CLI metadata");
  const rootOffset = pe.rvaToOffset(
    cli.metadata.rva,
    cli.metadata.size,
    "cli.metadata",
  );
  const layout = readManagedMetadataLayout(
    bytes,
    rootOffset,
    cli.metadata.size,
  );
  const memberLists = readTypeMemberListFacts(bytes, layout);
  const inventory = readManagedMetadataInventory(
    bytes,
    layout,
    readManagedResourceDirectory(pe, issues),
    memberLists,
  );
  return { layout, inventory, memberLists };
};

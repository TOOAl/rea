import {
  admitManagedProjection,
  managedDecodeBudget,
} from "./ManagedDecodeBudget.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import {
  managedArtifactInspectionSchema,
  type ManagedArtifactInspection,
  type ManagedParseIssue,
} from "../domain/managed/managedArtifact.js";
import {
  managedCli32BitRequirement,
  readManagedPeLayout,
  type ManagedCliHeader,
  type ManagedPeLayout,
} from "./ManagedPeReader.js";
import {
  managedTableRowCounts,
  readManagedMetadataInventory,
  readManagedResourceDirectory,
} from "./ManagedMetadataInventory.js";
import {
  readManagedMetadataLayout,
  type ManagedMetadataLayout,
} from "./ManagedMetadataLayout.js";
import { readTypeMemberListFacts } from "./ManagedTypeMemberLists.js";
import { ManagedReaderFailure } from "./ManagedReaderFailure.js";

const implementationFor = (
  cli: ManagedCliHeader,
  metadata: ManagedMetadataLayout,
): ManagedArtifactInspection["classification"]["implementation"] => {
  if (cli.readyToRunSignature) return "cil-and-ready-to-run";
  if ((cli.flags & 1) === 0) return "cpp-cli-mixed";
  return (metadata.rowCounts[6] ?? 0) === 0 ? "metadata-only" : "cil";
};

const managedArchitectureFor = (
  layout: ManagedPeLayout,
  cli: ManagedCliHeader,
): ManagedArtifactInspection["classification"]["managed_architecture"] => {
  if (layout.architecture !== "x86" || (cli.flags & 1) === 0)
    return layout.architecture;
  const requirement = managedCli32BitRequirement(cli.flags);
  if (requirement === "required") return "x86";
  return requirement === "preferred" ? "anycpu-prefer-32" : "anycpu";
};

const runtimeClassification = ({
  layout,
  metadata,
  inventory,
}: RuntimeClassificationInput): Pick<
  ManagedArtifactInspection["classification"],
  "runtime_family" | "implementation" | "managed_architecture" | "evidence"
> => {
  const cli = layout.cli;
  if (cli === null) throw new TypeError("Managed classification requires CLI");
  const { runtime_family: runtimeFamily, evidence } = runtimeFamilyFor(
    cli,
    inventory,
    metadata,
    layout,
  );
  const implementation = implementationFor(cli, metadata);
  const managedArchitecture = managedArchitectureFor(layout, cli);
  evidence.push({
    code: "managed-architecture-derived",
    detail: `Managed architecture ${managedArchitecture} is derived from PE machine and CLI flags.`,
    file_offset: cli.headerOffset + 16,
  });
  return {
    runtime_family: runtimeFamily,
    implementation,
    managed_architecture: managedArchitecture,
    evidence,
  };
};

interface PartialMetadataContext {
  readonly target: BinaryTarget;
  readonly bytes: Buffer;
  readonly layout: ManagedPeLayout;
  readonly issue: ManagedParseIssue;
}

const partialMetadataResult = ({
  target,
  bytes,
  layout,
  issue,
}: PartialMetadataContext): ManagedArtifactInspection => ({
  ...base(target, bytes, layout),
  classification: {
    status: issue.code === "resource-limit" ? "managed" : "malformed",
    container: "pe",
    runtime_family: runtimeFamilyFromCliHeader(layout.cli),
    implementation: "unknown",
    managed_architecture: "unknown",
    evidence: [
      {
        code: "metadata-not-admitted",
        detail: issue.detail,
        file_offset: issue.offset,
      },
    ],
  },
  metadata: {
    status: issue.code === "resource-limit" ? "partial" : "malformed",
    version: null,
    stream_names: [],
    table_row_counts: {},
  },
  module: null,
  assembly: null,
  target_frameworks: [],
  references: [],
  resources: [],
  attributes: [],
  coverage: { state: "partial", issues: [issue] },
  limitations: [
    issue.code === "resource-limit"
      ? "CLI metadata inspection stopped at its representation budget; omitted facts are unknown."
      : "CLI metadata could not be read because the PE/CLI structure is malformed or unsupported.",
  ],
});

/** Inspect PE/CLI identity directly from local bytes without CLR loading. */
export const inspectManagedArtifactBytes = (
  bytes: Buffer,
  target: BinaryTarget,
): ManagedArtifactInspection => {
  const layout = readManagedPeLayout(bytes);
  if (layout.cli === null) return unavailableResult(target, bytes, layout);
  const cli = layout.cli;
  let metadata: ManagedMetadataLayout;
  try {
    const metadataOffset = layout.rvaToOffset(
      cli.metadata.rva,
      cli.metadata.size,
      "cli.metadata",
    );
    metadata = readManagedMetadataLayout(
      bytes,
      metadataOffset,
      cli.metadata.size,
    );
  } catch (cause: unknown) {
    if (!(cause instanceof ManagedReaderFailure)) throw cause;
    return managedArtifactInspectionSchema.parse(
      admitManagedProjection(
        partialMetadataResult({
          target,
          bytes,
          layout,
          issue: cause.issue,
        }),
      ),
    );
  }
  const resourceIssues: ManagedParseIssue[] = [];
  const resourceDirectory = readManagedResourceDirectory(
    layout,
    resourceIssues,
  );
  try {
    const memberLists = readTypeMemberListFacts(bytes, metadata);
    const inventory = readManagedMetadataInventory(
      bytes,
      metadata,
      resourceDirectory,
      memberLists,
    );
    const issues = [...resourceIssues, ...inventory.issues];
    const limitations = [
      ...(issues.length === 0
        ? []
        : [
            "At least one metadata or resource item could not be read; coverage is partial.",
          ]),
      "Static inspection did not load the assembly, resolve dependencies through a CLR, decompile C#, or execute target code.",
    ];
    return managedArtifactInspectionSchema.parse(
      admitManagedProjection(
        {
          ...base(target, bytes, layout),
          classification: {
            status: "managed",
            container: "pe",
            ...runtimeClassification({ layout, metadata, inventory }),
          },
          metadata: {
            status: issues.length === 0 ? "complete" : "partial",
            version: metadata.version,
            stream_names: metadata.streamNames,
            table_row_counts: managedTableRowCounts(metadata),
          },
          module: inventory.module,
          assembly: inventory.assembly,
          target_frameworks: inventory.targetFrameworks,
          references: inventory.references,
          resources: inventory.resources,
          attributes: inventory.attributes,
          coverage: {
            state: issues.length === 0 ? "complete" : "partial",
            issues,
          },
          limitations,
        },
        managedDecodeBudget(metadata),
      ),
    );
  } catch (cause: unknown) {
    if (!(cause instanceof ManagedReaderFailure)) throw cause;
    return managedArtifactInspectionSchema.parse(
      admitManagedProjection(
        partialMetadataResult({ target, bytes, layout, issue: cause.issue }),
      ),
    );
  }
};

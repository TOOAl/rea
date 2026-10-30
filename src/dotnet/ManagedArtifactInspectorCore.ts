import { admitManagedProjection } from "./ManagedDecodeBudget.js";
import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import {
  managedArtifactInspectionSchema,
  type ManagedArtifactInspection,
} from "../domain/managed/managedArtifact.js";
import {
  managedCliIsMixedClrNative,
  type ManagedCliHeader,
  type ManagedPeLayout,
} from "./ManagedPeReader.js";
import {
  readManagedMetadataInventory,
  type ManagedMetadataInventory,
} from "./ManagedMetadataInventory.js";
import type { ManagedMetadataLayout } from "./ManagedMetadataLayout.js";

const flagNames = (flags: number): string[] => {
  const names: string[] = [];
  for (const [mask, name] of [
    [0x0000_0001, "il-only"],
    [0x0000_0002, "32-bit-required"],
    [0x0000_0004, "il-library"],
    [0x0000_0008, "strong-name-signed"],
    [0x0000_0010, "native-entry-point"],
    [0x0001_0000, "track-debug-data"],
    [0x0002_0000, "32-bit-preferred"],
  ] as const)
    if ((flags & mask) !== 0) names.push(name);
  return names;
};

const cliProjection = (
  cli: ManagedCliHeader,
): NonNullable<ManagedArtifactInspection["pe"]["cli"]> => ({
  header_offset: cli.headerOffset,
  header_size: cli.headerSize,
  runtime_version: `${String(cli.runtimeMajor)}.${String(cli.runtimeMinor)}`,
  flags: cli.flags,
  flag_names: flagNames(cli.flags),
  entry_point:
    cli.entryPoint === 0
      ? { kind: "none", value: null }
      : (cli.flags & 0x10) !== 0
        ? {
            kind: "native-rva",
            value: `0x${cli.entryPoint.toString(16)}`,
          }
        : {
            kind: "metadata-token",
            value: `0x${cli.entryPoint.toString(16).padStart(8, "0")}`,
          },
  metadata_rva: cli.metadata.rva,
  metadata_size: cli.metadata.size,
  resources_rva: cli.resources.rva,
  resources_size: cli.resources.size,
  strong_name_rva: cli.strongName.rva,
  strong_name_size: cli.strongName.size,
  managed_native_header_rva: cli.managedNativeHeader.rva,
  managed_native_header_size: cli.managedNativeHeader.size,
  ready_to_run_signature: cli.readyToRunSignature,
});

const peProjection = (
  layout: ManagedPeLayout,
): ManagedArtifactInspection["pe"] => ({
  machine: layout.machine,
  machine_hex: `0x${layout.machine.toString(16).padStart(4, "0")}`,
  architecture: layout.architecture,
  optional_header: layout.optionalHeader,
  section_count: layout.sectionCount,
  characteristics: layout.characteristics,
  cli: layout.cli === null ? null : cliProjection(layout.cli),
});

const base = (
  target: BinaryTarget,
  bytes: Buffer,
  layout: ManagedPeLayout,
) => ({
  artifact: {
    path: target.path,
    sha256: target.sha256,
    byte_length: bytes.length,
    format: "pe" as const,
  },
  pe: peProjection(layout),
});

const unavailableResult = (
  target: BinaryTarget,
  bytes: Buffer,
  layout: ManagedPeLayout,
): ManagedArtifactInspection => {
  const malformed = layout.cliDirectoryState !== "absent";
  const issues = layout.cliIssue === null ? [] : [layout.cliIssue];
  const limitations = malformed
    ? [
        "The PE declares a CLI directory, but its CLI header could not be admitted.",
      ]
    : [
        "The PE has no CLI data directory; managed metadata and CIL are unavailable.",
      ];
  return managedArtifactInspectionSchema.parse(
    admitManagedProjection({
      ...base(target, bytes, layout),
      classification: {
        status: malformed ? "malformed" : "not-managed",
        container: "pe",
        runtime_family: "unknown",
        implementation: malformed ? "unknown" : "not-managed",
        managed_architecture: "unknown",
        evidence: [
          {
            code: malformed
              ? "cli-directory-malformed"
              : "cli-directory-absent",
            detail: limitations[0],
            file_offset: layout.cliIssue?.offset ?? null,
          },
        ],
      },
      metadata: {
        status: malformed ? "malformed" : "absent",
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
      coverage: {
        state: malformed ? "partial" : "unavailable",
        issues,
      },
      limitations,
    }),
  );
};

interface RuntimeClassificationInput {
  readonly layout: ManagedPeLayout;
  readonly metadata: ManagedMetadataLayout;
  readonly inventory: ManagedMetadataInventory;
}

const runtimeFamilyFromCliHeader = (
  cli: ManagedCliHeader | null,
): ManagedArtifactInspection["classification"]["runtime_family"] =>
  cli?.readyToRunSignature === true
    ? "modern-dotnet"
    : cli !== null && managedCliIsMixedClrNative(cli)
      ? "mixed-clr-native"
      : "unknown";

const runtimeFamilyFor = (
  cli: ManagedCliHeader,
  inventory: ManagedMetadataInventory,
  metadata: ManagedMetadataLayout,
  layout: ManagedPeLayout,
): Pick<
  ManagedArtifactInspection["classification"],
  "runtime_family" | "evidence"
> => {
  const evidence: ManagedArtifactInspection["classification"]["evidence"] = [
    {
      code: "cli-header-observed",
      detail: "A file-backed PE CLI header and metadata root were admitted.",
      file_offset: cli.headerOffset,
    },
  ];
  const frameworks = inventory.targetFrameworks;
  const hasUnity = inventory.referenceNames.some(
    (name) => name === "UnityEngine" || name.startsWith("UnityEngine."),
  );
  let runtimeFamily: ManagedArtifactInspection["classification"]["runtime_family"] =
    "unknown";
  if (runtimeFamilyFromCliHeader(cli) === "mixed-clr-native") {
    runtimeFamily = "mixed-clr-native";
    evidence.push({
      code: "cli-il-only-clear",
      detail:
        "COMIMAGE_FLAGS_ILONLY is clear, so managed and native analysis must remain composed.",
      file_offset: cli.headerOffset + 16,
    });
  } else if (hasUnity) {
    runtimeFamily = "unity-mono";
    evidence.push({
      code: "unity-reference-observed",
      detail:
        "The admitted AssemblyRef table contains a UnityEngine reference.",
      file_offset: metadata.table(35)?.offset ?? null,
    });
  } else if (frameworks.some((value) => value.startsWith(".NETFramework,"))) {
    runtimeFamily = "dotnet-framework";
    evidence.push({
      code: "target-framework-observed",
      detail:
        "An assembly-level TargetFrameworkAttribute names .NET Framework.",
      file_offset: metadata.table(12)?.offset ?? null,
    });
  } else if (
    frameworks.some((value) => value.startsWith(".NETCoreApp,")) ||
    cli.readyToRunSignature
  ) {
    runtimeFamily = "modern-dotnet";
    evidence.push({
      code: cli.readyToRunSignature
        ? "ready-to-run-signature-observed"
        : "target-framework-observed",
      detail: cli.readyToRunSignature
        ? "The managed native header has the ReadyToRun signature."
        : "An assembly-level TargetFrameworkAttribute names modern .NET.",
      file_offset: cli.readyToRunSignature
        ? layout.rvaToOffset(
            cli.managedNativeHeader.rva,
            4,
            "cli.managed-native-header",
          )
        : (metadata.table(12)?.offset ?? null),
    });
  } else if (frameworks.some((value) => value.startsWith(".NETStandard,"))) {
    evidence.push({
      code: "target-framework-observed",
      detail:
        "An assembly-level TargetFrameworkAttribute names .NET Standard, an API specification that does not identify a runtime family.",
      file_offset: metadata.table(12)?.offset ?? null,
    });
  }
  return { runtime_family: runtimeFamily, evidence };
};

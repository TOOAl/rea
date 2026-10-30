import { z } from "zod";

import {
  artifactInventoryResultSchema,
  type ArtifactInventoryResult,
} from "./artifactGraph.js";
import { digestCanonicalValue } from "./canonicalDigest.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import { evidenceSchema, parseEvidence, type Evidence } from "./evidence.js";
import { jsonValueSchema } from "./jsonValue.js";
import { prefixedDigestSchema } from "./../domain/digests.js";

const observation = (
  kind: ArtifactInspectionResult["observations"][number]["kind"],
  subject: string,
  value: unknown,
  evidenceId: string,
): ArtifactInspectionResult["observations"][number] => {
  const semantic = {
    kind,
    subject,
    value: jsonValueSchema.parse(value),
    evidence_id: evidenceId,
  };
  return {
    observation_id: `aio_${digestCanonicalValue(semantic, "Artifact inspection")}`,
    ...semantic,
  };
};

const allHypotheses = (
  inventory: ArtifactInventoryResult,
  evidenceId: string,
): ArtifactInspectionResult["hypotheses"] => {
  const statements =
    inventory.manifest.root_format === "pe"
      ? [
          "The PE artifact may contain managed CLI metadata or native code; inventory bytes alone do not distinguish them.",
        ]
      : ["asar", "javascript-bundle"].includes(inventory.manifest.root_format)
        ? [
            "The artifact may contain a recoverable JavaScript application graph.",
          ]
        : [];
  return statements.map((statement) => {
    const semantic = {
      statement,
      confidence: "low" as const,
      basis_evidence_ids: [evidenceId],
      limitation:
        "Format classification proposes a bounded follow-up; it is not semantic proof.",
    };
    return {
      hypothesis_id: `aih_${digestCanonicalValue(semantic, "Artifact inspection")}`,
      ...semantic,
    };
  });
};

const contradictions = (
  inventory: ArtifactInventoryResult,
  evidenceId: string,
): ArtifactInspectionResult["contradictions"] =>
  inventory.integrity_contradictions.map((value) => {
    const semantic = {
      statement: `Declared integrity for ${value.logical_path} contradicts observed bytes.`,
      occurrence_id: value.occurrence_id,
      declared_sha256: value.declared_sha256,
      observed_sha256: value.observed_sha256,
      evidence_id: evidenceId,
    };
    return {
      contradiction_id: `aic_${digestCanonicalValue(semantic, "Artifact inspection")}`,
      ...semantic,
    };
  });

const probesFor = (
  inventory: ArtifactInventoryResult,
): ArtifactInspectionResult["next_probes"] => {
  const format = inventory.manifest.root_format;
  return format === "directory"
    ? directoryProbes(inventory)
    : probesForFormat(format);
};

// An application bundle directory is only a container, so its probes follow
// the formats it holds: a bundle of Mach-O executables is not a JavaScript tree.
// Formats are ordered so a repeated operation keeps its most general rationale.
const DIRECTORY_MEMBER_FORMATS: readonly ArtifactInventoryResult["manifest"]["root_format"][] =
  [
    "asar",
    "javascript-bundle",
    "mach-o-universal",
    "mach-o",
    "elf",
    "pe",
    "plist",
  ];

const directoryProbes = (
  inventory: ArtifactInventoryResult,
): ArtifactInspectionResult["next_probes"] => {
  // JavaScript acquisition does not follow symlinks. Other probes retain
  // their own applicability rules; plist inspection follows readable links.
  const present = new Set(
    inventory.occurrences
      .filter(
        ({ entry_kind, artifact_format }) =>
          entry_kind !== "symlink" || artifact_format !== "javascript-bundle",
      )
      .map(({ artifact_format }) => artifact_format),
  );
  const members = DIRECTORY_MEMBER_FORMATS.filter((memberFormat) =>
    present.has(memberFormat),
  );
  const probes = members.flatMap(probesForFormat);
  return probes.filter(
    (probe, index) =>
      probes.findIndex(({ operation }) => operation === probe.operation) ===
      index,
  );
};

const probesForFormat = (
  format: ArtifactInventoryResult["manifest"]["root_format"],
): ArtifactInspectionResult["next_probes"] => {
  if (["asar", "javascript-bundle"].includes(format))
    return [
      {
        operation: "analyze_javascript_application",
        rationale:
          "Recover bounded JavaScript modules, source maps, Electron boundaries, and application relationships.",
        authority: "ast-static-analysis",
      },
    ];
  if (format === "pe")
    return [
      {
        operation: "inspect_managed_artifact",
        rationale:
          "Check execution-free CLI metadata before choosing a deep native provider.",
        authority: "managed-static-analysis",
      },
      {
        operation: "open_binary",
        rationale:
          "Open as native code only when managed inspection reports a native or mixed boundary.",
        authority: "native-analysis-provider",
      },
    ];
  if (["mach-o", "mach-o-universal", "elf"].includes(format))
    return [
      {
        operation: "open_binary",
        rationale:
          "Bind one deep native provider before function-level analysis.",
        authority: "native-analysis-provider",
      },
    ];
  if (format === "plist")
    return [
      {
        operation: "inspect_plist",
        rationale: "Parse property-list values without executing the artifact.",
        authority: "artifact-bytes",
      },
    ];
  return [];
};

const allUnexploredBranches = (
  inventory: ArtifactInventoryResult,
  evidenceId: string,
  nextProbes: ArtifactInspectionResult["next_probes"],
): ArtifactInspectionResult["unexplored_branches"] => {
  const branches: ArtifactInspectionResult["unexplored_branches"] = [];
  branches.push(
    ...nextProbes.map((probe) =>
      branch(
        "format-specific-analysis-required",
        `${probe.operation} was not run by provider-neutral artifact inspection.`,
        probe,
        evidenceId,
      ),
    ),
  );
  if (inventory.manifest.root_format === "unknown")
    branches.push(
      branch(
        "unknown-format",
        "Artifact bytes did not match an admitted format classifier.",
        null,
        evidenceId,
      ),
    );
  return branches;
};

const branch = (
  reason: ArtifactInspectionResult["unexplored_branches"][number]["reason"],
  detail: string,
  nextProbe: ArtifactInspectionResult["next_probes"][number] | null,
  evidenceId: string,
): ArtifactInspectionResult["unexplored_branches"][number] => {
  const semantic = {
    reason,
    detail,
    next_probe: nextProbe,
    evidence_id: evidenceId,
  };
  return {
    branch_id: `aib_${digestCanonicalValue(semantic, "Artifact inspection")}`,
    ...semantic,
  };
};

const inspectionCoverage = (
  _inventory: ArtifactInventoryResult,
  omissions: Readonly<Record<string, number>>,
): ArtifactInspectionResult["coverage"]["status"] => {
  if (Object.values(omissions).some((count) => count > 0)) return "truncated";
  return "complete-within-substeps";
};

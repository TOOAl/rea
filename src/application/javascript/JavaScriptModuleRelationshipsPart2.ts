import { posix } from "node:path";

import {
  compareUnicodeCodePoints,
  compositeKey,
} from "../../domain/unicodeCodePointOrder.js";
import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
import {
  completeApplicationCoverage,
  partialApplicationCoverage,
} from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
import {
  semanticCoverageResourceLimits,
  semanticResourceLimitCoverage,
} from "../../domain/javascript/javascriptSemanticCoverage.js";
import { semanticResourceLimitReason } from "../../domain/javascript/javascriptSemanticResourceLimits.js";
import type {
  JavaScriptModuleOrigin,
  JavaScriptSemanticModuleLink,
} from "../../domain/javascript/javascriptSemanticIr.js";
import { moduleResolutionModeForJavaScriptReference } from "../../domain/javascript/javascriptModuleResolutionMode.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  addAstContainsEdge,
  artifactLocalIdentity,
  type JavaScriptArtifactGraphContext,
  type JavaScriptArtifactGraphCoverage,
} from "./JavaScriptArtifactGraphContext.js";
import {
  astObservationEvidence,
  staticInferenceEvidence,
} from "./JavaScriptArtifactGraphEvidence.js";
import {
  artifactPathResolutionProperties,
  moduleResolutionModeProperties,
  resolveArtifactPathByContext,
  type ArtifactPathResolution,
} from "./JavaScriptArtifactPathResolution.js";
import { projectJavaScriptExportReturnShapes } from "../../domain/javascript/javascriptExportReturnShapeProjection.js";

import type { JavaScriptModuleSemanticIr } from "./JavaScriptArtifactAnalysisTypes.js";

interface SemanticAnalysis {
  readonly ir: JavaScriptModuleSemanticIr;
}

interface RelationshipInput {
  readonly context: JavaScriptArtifactGraphContext;
  readonly file: JavaScriptArtifactFile;
  readonly semantic: SemanticAnalysis;
  readonly source: ApplicationNode;
  readonly link: JavaScriptSemanticModuleLink;
}

type ResolvedModuleTarget = {
  readonly node: ApplicationNode;
  readonly limitations: readonly string[];
  readonly resolution?: ArtifactPathResolution;
} & (
  | {
      readonly path: string;
      readonly file: JavaScriptArtifactFile;
      readonly status: "resolved";
    }
  | {
      readonly path: null;
      readonly file: null;
      readonly status: Exclude<
        ArtifactPathResolution["resolution_status"],
        "resolved"
      >;
    }
);

/** Create one path-scoped source-module identity for every analyzed source file. */

const resolveModuleTarget = (
  input: RelationshipInput,
  specifier: string,
): ResolvedModuleTarget => {
  const resolution = resolveArtifactPathByContext({
    declaredPath: specifier,
    sourcePath: input.file.path,
    context: "module-specifier",
    files: input.context.filesByPath,
    directoryPaths: input.context.directoryPaths,
    unanalyzedFiles: input.context.unanalyzedFiles,
    moduleKind: moduleResolutionModeForJavaScriptReference(
      input.file.path,
      input.link.kind === "require" || input.link.kind === "commonjs-export"
        ? "require"
        : "static-import",
      input.link.resolutionMode,
    ),
  });
  if (resolution.resolution_status !== "resolved")
    return {
      node: unresolvedModuleNode(input, specifier, resolution),
      path: null,
      file: null,
      status: resolution.resolution_status,
      limitations: resolution.limitations,
      resolution,
    };
  const path = resolution.resolved_path;
  const file = input.context.filesByPath.get(path);
  const node =
    input.context.sourceModuleNodes.get(path) ??
    input.context.fileNodes.get(path);
  if (file === undefined || node === undefined)
    throw new TypeError(
      `Resolved artifact path ${path} is absent from its graph context.`,
    );
  return {
    node,
    path,
    file,
    status: "resolved",
    limitations: resolution.limitations,
    resolution,
  };
};

const unresolvedModuleNode = (
  input: RelationshipInput,
  specifier: string,
  resolution: Extract<
    ArtifactPathResolution,
    { resolution_status: Exclude<ResolvedModuleTarget["status"], "resolved"> }
  >,
): ApplicationNode =>
  input.context.accumulator.addNode({
    kind: "javascript-module",
    identity: artifactLocalIdentity(
      input.file.sha256,
      "unresolved-semantic-module",
      `${resolution.resolution_status}:${specifier}`,
    ),
    observations: [
      {
        label: specifier,
        properties: {
          semantic_role: "module-reference",
          declared_specifier: specifier,
          resolution_status: resolution.resolution_status,
          ...artifactPathResolutionProperties(resolution),
        },
        evidence: staticInferenceEvidence({
          sha256: input.file.sha256,
          path: input.file.path,
          range: input.link.location,
          operation: "retain-unresolved-semantic-module",
          coverage: semanticCoverage(input.semantic),
          confidence: "low",
          limitations: input.semantic.ir.limitations,
        }),
      },
    ],
  });

const moduleOriginForExport = (
  ir: JavaScriptModuleSemanticIr,
  link: JavaScriptSemanticModuleLink,
): JavaScriptModuleOrigin | null => {
  if (link.specifier !== null)
    return {
      ...(link.resolutionMode === undefined
        ? {}
        : { resolutionMode: link.resolutionMode }),
      specifier: link.specifier,
      importedPath: link.importedName === null ? [] : [link.importedName],
    };
  if (link.localName === null) return null;
  const program = ir.scopes.find(({ kind }) => kind === "program");
  const binding = ir.bindings.find(
    ({ name, scopeId }) =>
      name === link.localName && scopeId === program?.scopeId,
  );
  return binding?.provenance.status === "module" &&
    binding.provenance.origins.length === 1
    ? (binding.provenance.origins[0] ?? null)
    : null;
};

const relationshipProperties = (
  link: JavaScriptSemanticModuleLink,
  target: ResolvedModuleTarget | null,
  origin?: JavaScriptModuleOrigin,
) => ({
  module_link_kind: link.kind,
  ...moduleResolutionModeProperties(link.resolutionMode),
  specifier: origin?.specifier ?? link.specifier,
  imported_name: origin?.importedPath.at(-1) ?? link.importedName,
  imported_path: origin?.importedPath ?? [],
  local_name: link.localName,
  exported_name: link.exportedName,
  resolved_path: target?.path ?? null,
  resolution_status: target?.status ?? null,
  ...artifactPathResolutionProperties(target?.resolution),
  target_file_kind: target?.file?.kind ?? null,
  target_json_status:
    target?.file?.kind === "json" || target?.file?.kind === "package-json"
      ? jsonStatus(target.file)
      : null,
});

const relationshipEvidence = (
  input: RelationshipInput,
  operation: string,
  limitations: readonly string[],
  confidence: "high" | "medium" | "low" = "high",
) =>
  staticInferenceEvidence({
    sha256: input.file.sha256,
    path: input.file.path,
    range: input.link.location,
    operation,
    coverage: semanticCoverage(input.semantic),
    confidence,
    limitations: [
      ...input.semantic.ir.limitations,
      ...semanticCoverageResourceLimits(input.semantic.ir.coverage).map(
        semanticResourceLimitReason,
      ),
      ...limitations,
    ],
  });

const semanticCoverage = (
  semantic: SemanticAnalysis,
): JavaScriptArtifactGraphCoverage => {
  const resourceLimits = semanticCoverageResourceLimits(semantic.ir.coverage);
  if (semantic.ir.coverage.status === "complete" && resourceLimits.length === 0)
    return completeApplicationCoverage();
  return partialApplicationCoverage(
    semanticResourceLimitCoverage(resourceLimits),
    semantic.ir.coverage.omittedCount,
  );
};

const moduleFormat = (
  path: string,
  ir: JavaScriptModuleSemanticIr,
): "commonjs" | "esm" | "mixed" | "unknown" => {
  const extension = posix.extname(path).toLowerCase();
  if (extension === ".mjs" || extension === ".mts") return "esm";
  if (extension === ".cjs" || extension === ".cts") return "commonjs";
  if (extension === ".ts" || extension === ".tsx") return "unknown";
  const esm = ir.moduleLinks.some(({ kind }) =>
    ["import", "export", "re-export"].includes(kind),
  );
  const commonJs = ir.moduleLinks.some(({ kind }) =>
    ["require", "commonjs-export"].includes(kind),
  );
  return esm && commonJs
    ? "mixed"
    : esm
      ? "esm"
      : commonJs
        ? "commonjs"
        : "unknown";
};

const jsonStatus = (
  file: JavaScriptArtifactFile,
): "included" | "invalid" | "unavailable" => {
  if (!file.text.included) return "unavailable";
  try {
    JSON.parse(file.text.value);
    return "included";
  } catch (cause: unknown) {
    // Invalid JSON is classified without further detail.
    void cause;
    return "invalid";
  }
};

const isExportLink = (link: JavaScriptSemanticModuleLink): boolean =>
  link.kind === "export" ||
  link.kind === "re-export" ||
  link.kind === "commonjs-export";

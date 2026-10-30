import {
  compareUnicodeCodePoints,
  compositeKey,
} from "../../domain/unicodeCodePointOrder.js";
import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
import {
  semanticCoverageResourceLimits,
  semanticResourceLimitCoverage,
} from "../../domain/javascript/javascriptSemanticCoverage.js";
import type {
  JavaScriptModuleOrigin,
  JavaScriptSemanticModuleLink,
} from "../../domain/javascript/javascriptSemanticIr.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  addAstContainsEdge,
  artifactLocalIdentity,
  type JavaScriptArtifactGraphContext,
} from "./JavaScriptArtifactGraphContext.js";
import {
  astObservationEvidence,
  staticInferenceEvidence,
} from "./JavaScriptArtifactGraphEvidence.js";
import {
  moduleResolutionModeProperties,
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
export const addJavaScriptSourceModules = (
  context: JavaScriptArtifactGraphContext,
): void => {
  for (const analyzed of context.analysis.files) {
    const { file, semantic } = analyzed;
    const asset = context.assetNodes.get(file.path);
    const program = semantic?.ir.scopes.find(({ kind }) => kind === "program");
    if (asset === undefined || semantic === null || program === undefined)
      continue;
    const exports = semantic.ir.moduleLinks
      .flatMap(({ exportedName, kind }) =>
        exportedName === null || kind === "type-import" ? [] : [exportedName],
      )
      .sort(compareUnicodeCodePoints);
    const typeExports = semantic.ir.moduleLinks
      .flatMap(({ exportedName, kind }) =>
        exportedName === null || kind !== "type-import" ? [] : [exportedName],
      )
      .sort(compareUnicodeCodePoints);
    const retainedExports = [...new Set(exports)];
    const source = context.accumulator.addNode({
      kind: "javascript-module",
      identity: artifactLocalIdentity(
        file.sha256,
        "source-module",
        `${file.container_sha256}:${file.path}`,
      ),
      observations: [
        {
          label: file.path,
          properties: {
            semantic_role: "source-module",
            source_sha256: file.sha256,
            path: file.path,
            logical_module_key: file.path,
            module_format: moduleFormat(file.path, semantic.ir),
            import_relationships: semantic.ir.moduleLinks.filter(
              ({ kind }) => kind === "import" || kind === "require",
            ).length,
            type_relationships: semantic.ir.moduleLinks.filter(
              ({ kind }) => kind === "type-import",
            ).length,
            export_relationships: exports.length,
            export_names: retainedExports,
            type_export_names: [...new Set(typeExports)],
            omitted_export_names: 0,
          },
          evidence: astObservationEvidence({
            sha256: file.sha256,
            path: file.path,
            range: program.location,
            operation: "recover-source-module",
            coverage: semanticCoverage(semantic),
            limitations: semantic.ir.limitations,
          }),
        },
      ],
    });
    context.sourceModuleNodes.set(file.path, source);
    addAstContainsEdge(context, {
      source: asset,
      target: source,
      file,
      range: program.location,
      coverage: semanticCoverage(semantic),
      properties: { logical_module_key: file.path },
    });
  }
};

/** Relationship compositions the application graph cannot represent, for disclosure. */
export interface JavaScriptModuleRelationshipOmissions {
  /** Import specifiers that resolved back to the importing module itself. */
  readonly selfImports: number;
}

type RelationshipOmissionCounter = { selfImports: number };

/** Compose bounded CommonJS and ESM binding relationships across artifact files. */
export function* addJavaScriptModuleRelationshipsSteps(
  context: JavaScriptArtifactGraphContext,
): Generator<void, JavaScriptModuleRelationshipOmissions> {
  const omissions = { selfImports: 0 };
  for (const analyzed of context.analysis.files) {
    const { file, semantic } = analyzed;
    const source = context.sourceModuleNodes.get(file.path);
    if (semantic === null || source === undefined) continue;
    for (const link of semantic.ir.moduleLinks) {
      // One module can export thousands of bindings, each with return shapes.
      yield;
      if (link.kind === "type-import") continue;
      const input = { context, file, semantic, source, link };
      if (isExportLink(link)) addExportRelationship(input, omissions);
      else if (link.specifier !== null)
        addImportRelationship(input, source, omissions, {
          specifier: link.specifier,
          importedPath: link.importedName === null ? [] : [link.importedName],
        });
    }
  }
  return omissions;
}

const addExportRelationship = (
  input: RelationshipInput,
  omissions: RelationshipOmissionCounter,
): void => {
  const { context, file, semantic, source, link } = input;
  if (link.exportedName === null) return;
  const baseCoverage = semanticCoverage(semantic);
  const returnShapes = projectJavaScriptExportReturnShapes({
    ir: semantic.ir,
    link,
    modulePath: file.path,
    baseCoverage,
  });
  const exported = context.accumulator.addNode({
    kind: "javascript-module",
    identity: artifactLocalIdentity(
      file.sha256,
      "module-export",
      compositeKey([file.container_sha256, file.path, link.exportedName]),
    ),
    observations: [
      {
        label: `${file.path}:${link.exportedName}`,
        properties: {
          semantic_role: "export-binding",
          module_path: file.path,
          relationship_kind: link.kind,
          exported_name: link.exportedName,
          local_name: link.localName,
          imported_name: link.importedName,
          declared_specifier: link.specifier,
        },
        evidence: astObservationEvidence({
          sha256: file.sha256,
          path: file.path,
          range: link.location,
          operation: "recover-module-export",
          coverage: baseCoverage,
          limitations: semantic.ir.limitations,
        }),
      },
      ...(returnShapes === null
        ? []
        : [
            {
              label: `${file.path}:${link.exportedName}:return-shapes`,
              properties: returnShapes.properties,
              evidence: staticInferenceEvidence({
                sha256: file.sha256,
                path: file.path,
                range: returnShapes.range,
                operation: "recover-export-return-shapes",
                coverage: returnShapes.coverage,
                limitations: returnShapes.limitations,
              }),
            },
          ]),
    ],
  });
  context.accumulator.addEdge({
    source_node_id: source.node_id,
    target_node_id: exported.node_id,
    relation: "exposes",
    properties: relationshipProperties(link, null),
    evidence: relationshipEvidence(input, "expose-module-export", []),
  });
  const origin = moduleOriginForExport(semantic.ir, link);
  if (origin !== null)
    addImportRelationship(input, exported, omissions, origin);
};

const addImportRelationship = (
  input: RelationshipInput,
  source: ApplicationNode,
  omissions: RelationshipOmissionCounter,
  origin: JavaScriptModuleOrigin,
): void => {
  const target = resolveModuleTarget(input, origin.specifier);
  // A specifier that resolves back to the importing module itself (a literal
  // self-import, self-require, or artifact-confined path alias)
  // cannot become an edge: the application graph forbids self-referential
  // edges, and emitting one fails result validation for the whole analysis.
  if (target.node.node_id === source.node_id) {
    omissions.selfImports += 1;
    return;
  }
  input.context.accumulator.addEdge({
    source_node_id: source.node_id,
    target_node_id: target.node.node_id,
    relation: "imports",
    properties: relationshipProperties(input.link, target, origin),
    evidence: relationshipEvidence(
      input,
      "resolve-semantic-module-relationship",
      target.limitations,
      target.status === "resolved"
        ? "high"
        : target.status === "external"
          ? "medium"
          : "low",
    ),
  });
};

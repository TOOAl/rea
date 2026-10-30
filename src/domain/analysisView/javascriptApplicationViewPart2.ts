import {
  AnalysisInputError,
  type AnalysisInputIssue,
} from "../analysisErrorCore.js";
import type { AnalysisError } from "../analysisErrorBase.js";
import { jsonObjectSchema, type JsonValue } from "../jsonValue.js";
import type { JavaScriptApplicationAnalysisResult } from "../javascript/javascriptApplicationAnalysis.js";
import type { ApplicationNode } from "../javascript/javascriptApplicationGraphSchemas.js";
import { err, ok, type Result } from "../result.js";
import type { JavaScriptModuleReference } from "./javascriptModuleReferences.js";
import {
  boundedViewMessages,
  completeWithinViewCoverage as completeCoverage,
  pageViewCoverage as pageCoverage,
} from "./analysisViewCoverage.js";
import type {
  AnalysisViewParent,
  AnalysisViewRequest,
  UnsignedAnalysisView,
} from "./analysisView.js";

const parentFields = (
  parent: AnalysisViewParent,
  analysis: JavaScriptApplicationAnalysisResult,
) => {
  const limitations = [
    ...analysis.limitations,
    ...analysis.graph.limitations,
    ...analysis.semantic_graph.limitations,
  ];
  return {
    parent_evidence_id: parent.evidenceId,
    parent_operation: "analyze_javascript_application" as const,
    parent_digest: parent.evidenceId.slice(3),
    artifact: {
      path: analysis.input_path,
      sha256: analysis.root_artifact_sha256,
    },
    limitations: boundedViewMessages(
      [...parent.limitations, ...limitations],
      parent.evidenceId,
      "limitations",
    ),
    unknowns: boundedViewMessages(
      limitations,
      parent.evidenceId,
      "unknowns",
      javascriptCoverageUnknowns(analysis),
    ),
  };
};

const selectModule = (
  modules: readonly ModuleEntry[],
  selector: Extract<AnalysisViewRequest, { readonly kind: "item" }>["selector"],
): Result<ApplicationNode, AnalysisError> => {
  if ("node_id" in selector) {
    const matches = modules.filter(
      ({ node }) => node.node_id === selector.node_id,
    );
    if (matches.length === 1) {
      const selected = matches[0];
      if (selected !== undefined) return ok(selected.node);
    }
    return err(
      inputError([
        {
          path: ["view", "selector", "node_id"],
          reason: "invalid_value",
          message: `No module has node_id ${JSON.stringify(selector.node_id)}. Page the modules collection to inspect available identities.`,
        },
      ]),
    );
  }
  if ("path" in selector) {
    const matches = modules.filter((entry) => entry.path === selector.path);
    if (matches.length === 1) {
      const selected = matches[0];
      if (selected !== undefined) return ok(selected.node);
    }
    if (matches.length === 0)
      return err(
        inputError([
          {
            path: ["view", "selector", "path"],
            reason: "invalid_value",
            message: `No module has path ${JSON.stringify(selector.path)}. Page the modules collection to inspect exact paths and node_id values.`,
          },
        ]),
      );
    return err(
      inputError([
        {
          path: ["view", "selector", "path"],
          reason: "invalid_value",
          message: `Multiple modules have path ${JSON.stringify(selector.path)}; select one by node_id.`,
          expected: matches.map((entry) => ({ node_id: entry.node.node_id })),
        },
      ]),
    );
  }
  return err(
    jsIncompatible("Module items are selected by exact path or node_id."),
  );
};

/** Project one JavaScript application view without re-running reconstruction. */
export const projectJavaScriptApplicationView = (
  parent: AnalysisViewParent,
  analysis: JavaScriptApplicationAnalysisResult,
  view: Exclude<AnalysisViewRequest, { kind: "api-surface" }>,
): Result<UnsignedAnalysisView, AnalysisError> => {
  if (
    view.kind !== "summary" &&
    view.kind !== "item" &&
    view.kind !== "page" &&
    view.kind !== "javascript"
  )
    return err(
      jsIncompatible(
        "JavaScript application Evidence supports summary, module item, module page or typed JavaScript reference views.",
      ),
    );
  const shared = parentFields(parent, analysis);
  if (view.kind === "javascript") {
    const { entries, total } = modulePage(analysis.graph.nodes, view);
    const rows = entries.map(moduleReference);
    const { families: _families, ...semantic } =
      analysis.semantic_graph.coverage;
    return ok({
      ...shared,
      kind: "javascript",
      view,
      rows,
      source_coverage: {
        ...(analysis.source_selection === undefined
          ? {}
          : { source_selection: analysis.source_selection }),
        application: analysis.graph.coverage,
        semantic,
        application_unknown_count: applicationUnknownCount(analysis),
        semantic_unknown_count: analysis.semantic_graph.unknowns.length,
      },
      coverage: pageCoverage(view.offset, rows.length, total),
    });
  }
  if (view.kind === "summary") {
    const moduleCount = analysis.graph.nodes.reduce(
      (count, node) => count + Number(isModuleNode(node)),
      0,
    );
    return ok({
      kind: "summary",
      view,
      summary: {
        input_path: analysis.input_path,
        format: analysis.format,
        root_artifact_sha256: analysis.root_artifact_sha256,
        ...(analysis.source_selection === undefined
          ? {}
          : {
              source_selection: analysis.source_selection,
            }),
        statistics: jsonObjectSchema.parse(analysis.statistics),
        electron: jsonObjectSchema.parse(analysis.summary),
        coverage: jsonObjectSchema.parse({
          application: analysis.graph.coverage,
          semantic: {
            ...analysis.semantic_graph.coverage,
            families: analysis.semantic_graph.coverage.families.map(
              ({ unknown_ids, ...family }) => ({
                ...family,
                unknown_count: unknown_ids.length,
              }),
            ),
          },
          application_unknowns: applicationUnknownCount(analysis),
          semantic_unknowns: analysis.semantic_graph.unknowns.length,
        }),
        limitation_count: analysis.limitations.length,
      },
      coverage: completeCoverage(moduleCount, analysis.graph.nodes.length),
      ...shared,
    });
  }
  if (view.kind === "item") {
    if (view.collection !== "modules")
      return err(
        jsIncompatible(
          "Section and symbol collections apply to inspect_binary_layout Evidence.",
        ),
      );
    const modules = [...moduleEntries(analysis.graph.nodes)];
    const selected = selectModule(modules, view.selector);
    if (!selected.ok) return selected;
    return ok({
      kind: "item",
      view,
      item: moduleItem(selected.value),
      coverage: completeCoverage(1, modules.length),
      ...shared,
    });
  }
  if (view.kind !== "page" || view.collection !== "modules")
    return err(
      jsIncompatible(
        "Section and symbol collections apply to inspect_binary_layout Evidence.",
      ),
    );
  const { entries, total } = modulePage(analysis.graph.nodes, view);
  const items = entries.map(({ node, path }) => ({
    node_id: node.node_id,
    kind: node.kind,
    path,
  }));
  return ok({
    kind: "page",
    view,
    items,
    coverage: pageCoverage(view.offset, items.length, total),
    ...shared,
  });
};

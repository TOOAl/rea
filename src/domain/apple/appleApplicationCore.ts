import { z } from "zod";

import {
  anatomyTailMatches,
  appleBundleSchema,
  appleComponentSchema,
  applicationRoots,
  detectBundles,
  isSidecar,
  isWithin,
  platformsOf,
  type AppleInventoryEntry,
} from "./appleBundleAnatomy.js";
import {
  hasCompleteInventoryCoverage,
  parseArtifactInventoryEvidence,
} from "../artifactInventoryEvidence.js";
import { evidenceSchema } from "../evidence.js";
import { digestSchema } from "../digests.js";
import { prefixedDigestSchema } from "../digests.js";
import { bridgeCandidateCoverageSchema } from "../bridgeCandidateProjection.js";
import { compareUnicodeCodePoints as compare } from "../unicodeCodePointOrder.js";

const evidenceIdSchema = prefixedDigestSchema("ev");
const pathSchema = z.string().min(1);

const APPLE_ROOT_FORMATS = ["ipa", "directory", "zip", "dmg"] as const;

/** Authenticated artifact inventory pages projected as one Apple application. */
export const appleApplicationProjectionInputSchema = z.strictObject({
  inventory_evidence: z.array(evidenceSchema).min(1),
});

/** Deterministic, execution-free Apple application inventory projection. */
export const appleApplicationProjectionResultSchema = z.strictObject({
  projection_id: prefixedDigestSchema("aap"),
  root_sha256: digestSchema,
  root_format: z.enum(APPLE_ROOT_FORMATS),
  platforms: z.array(z.enum(["ios", "macos"])),
  source_evidence_ids: z.array(evidenceIdSchema).min(1),
  application_roots: z.array(pathSchema),
  bundles: z.array(appleBundleSchema),
  components: z.strictObject({
    bundle_metadata: z.array(appleComponentSchema),
    executables: z.array(appleComponentSchema),
    frameworks: z.array(appleComponentSchema),
    native_libraries: z.array(appleComponentSchema),
    javascript: z.array(appleComponentSchema),
    signing: z.array(appleComponentSchema),
    privileged_helpers: z.array(appleComponentSchema),
    launchd_plists: z.array(
      appleComponentSchema.extend({ domain: z.enum(["agent", "daemon"]) }),
    ),
    helpers: z.array(appleComponentSchema),
  }),
  symlinks: z.array(pathSchema),
  runtime_families: z.array(
    z.enum([
      "native",
      "swift-objective-c",
      "javascript",
      "react-native",
      "flutter",
      "unity",
    ]),
  ),
  bridge_candidates: z.array(
    z.strictObject({
      source_path: pathSchema,
      native_path: pathSchema,
      basis: z.enum([
        "javascript-and-native-content",
        "react-native-convention",
        "flutter-convention",
        "unity-convention",
      ]),
    }),
  ),
  bridge_candidate_coverage: bridgeCandidateCoverageSchema,
  coverage: z.strictObject({
    status: z.enum(["complete-within-inventory", "partial"]),
    // Count completeness is separate from the declared coverage status.
    inventory_complete: z.boolean(),
  }),
  limitations: z.array(z.string()),
});

export type AppleApplicationProjectionInput = z.infer<
  typeof appleApplicationProjectionInputSchema
>;
export type AppleApplicationProjectionResult = z.infer<
  typeof appleApplicationProjectionResultSchema
>;

type Component = z.infer<typeof appleComponentSchema>;
type RootFormat = (typeof APPLE_ROOT_FORMATS)[number];

/** Project exact Apple application paths and hashes without parsing or executing target code. */
export const projectAppleApplication = (
  input: AppleApplicationProjectionInput,
): AppleApplicationProjectionResult => {
  const parsed = appleApplicationProjectionInputSchema.parse(input);
  const { evidence, inventory } = parseArtifactInventoryEvidence(
    parsed.inventory_evidence,
  );
  const rootFormat = appleRootFormat(inventory.manifest.root_format);
  const nodes = new Map(
    inventory.nodes.map((node) => [node.artifact_id, node]),
  );
  const entries: AppleInventoryEntry[] = inventory.occurrences
    .filter(({ logical_path: path }) => path !== ".")
    .map((occurrence) => {
      if (occurrence.artifact_id === null)
        return {
          path: occurrence.logical_path,
          kind: occurrence.entry_kind,
          component: undefined,
        };
      const node = nodes.get(occurrence.artifact_id);
      if (node === undefined)
        throw new TypeError(
          "Apple application occurrence has no artifact node",
        );
      return {
        path: occurrence.logical_path,
        kind: occurrence.entry_kind,
        component: {
          path: occurrence.logical_path,
          artifact_id: node.artifact_id,
          sha256: node.sha256,
          format: occurrence.artifact_format,
        },
      };
    });
  const inventoried = entries.flatMap(({ component }) =>
    component === undefined ? [] : [component],
  );
  const roots = applicationRoots(entries, {
    name: evidence[0]?.subject?.name ?? "",
    format: rootFormat,
  });
  const { all, unattributed } = attributeComponents(
    inventoried,
    roots,
    rootFormat,
  );
  const bundles = detectBundles(entries, roots);
  const classified = classifyComponents(entries, all, roots);
  const runtimeFamilies = identifyRuntimeFamilies(all);
  const bridgeProjection = identifyBridgeCandidates(
    classified.javascript,
    deduplicateComponents([
      ...classified.executables,
      ...classified.native_libraries,
    ]),
    roots,
  );
  const uninventoriedImage =
    rootFormat === "dmg" && inventory.occurrences.length === 1;
  const inventoryComplete = hasCompleteInventoryCoverage(
    inventory,
    "container-entries",
  );
  const complete = inventoryComplete && !uninventoriedImage;
  const limitations = [
    ...inventory.limitations,
    ...projectionLimitations({
      complete: inventoryComplete,
      uninventoriedImage,
      roots,
      bundles,
      sidecars: entries.some(({ path }) => isSidecar(path)),
      symlinks: entries.some(({ kind }) => kind === "symlink"),
      unattributed,
      bridgeCandidateCoverage: bridgeProjection.coverage,
    }),
  ];
  const withoutId = {
    root_sha256: inventory.manifest.root_sha256,
    root_format: rootFormat,
    platforms: platformsOf(bundles),
    source_evidence_ids: evidence
      .map(({ evidence_id: id }) => id)
      .sort(compare),
    application_roots: roots,
    bundles,
    components: classified,
    symlinks: entries
      .filter(({ kind }) => kind === "symlink")
      .map(({ path }) => path)
      .sort(compare),
    runtime_families: runtimeFamilies,
    bridge_candidates: bridgeProjection.candidates,
    bridge_candidate_coverage: bridgeProjection.coverage,
    coverage: {
      status:
        complete && bridgeProjection.coverage.status === "complete"
          ? ("complete-within-inventory" as const)
          : ("partial" as const),
      inventory_complete: inventory.complete,
    },
    limitations,
  };
  return appleApplicationProjectionResultSchema.parse({
    ...withoutId,
    projection_id: appleProjectionId(withoutId),
  });
};

/** Identify the complete projection, including source Evidence provenance. */
export const appleProjectionId = (projection: unknown): string =>
  `aap_${digest(projection)}`;

/**
 * AppleDouble sidecars describe neighbouring files and are never components.
 * IPA projection keeps every other archive component, as before. Directory,
 * ZIP, and DMG inventories can hold installers and other siblings, so only
 * components inside an application root are attributed to it.
 */
const attributeComponents = (
  inventoried: readonly Component[],
  roots: readonly string[],
  rootFormat: RootFormat,
): { readonly all: Component[]; readonly unattributed: number } => {
  const visible = inventoried.filter(({ path }) => !isSidecar(path));
  if (rootFormat === "ipa") return { all: visible, unattributed: 0 };
  const all = visible.filter(({ path }) =>
    roots.some((root) => isWithin(path, root)),
  );
  return { all, unattributed: visible.length - all.length };
};

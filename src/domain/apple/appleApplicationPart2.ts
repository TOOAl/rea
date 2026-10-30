import { z } from "zod";

import {
  anatomyNameIs,
  anatomyTailMatches,
  appleBundleSchema,
  appleComponentSchema,
  applicationRoots,
  detectBundles,
  isMachOFormat,
  isSidecar,
  isWithin,
  platformsOf,
  type AppleInventoryEntry,
} from "./appleBundleAnatomy.js";
import {
  isSwiftRuntimeLibrary,
  nativeRuntimeConvention,
} from "../nativeConvention.js";
import {
  hasCompleteInventoryCoverage,
  parseArtifactInventoryEvidence,
} from "../artifactInventoryEvidence.js";
import { evidenceSchema } from "../evidence.js";
import { digestSchema } from "../digests.js";
import { prefixedDigestSchema } from "../digests.js";
import {
  bridgeCandidateCoverageSchema,
  projectCartesianCandidates,
} from "../bridgeCandidateProjection.js";
import { projectionDigest } from "../mobileApplicationGraphProjection.js";
import { compareUnicodeCodePoints as compare } from "../unicodeCodePointOrder.js";

const appleRootFormat = (format: string): RootFormat => {
  const root = APPLE_ROOT_FORMATS.find((candidate) => candidate === format);
  if (root === undefined)
    throw new TypeError(
      `Apple application projection requires IPA, directory, ZIP, or DMG inventory Evidence (got ${format})`,
    );
  return root;
};

const isNativeLibrary = (path: string): boolean =>
  /\.(?:dylib|so)$/iu.test(path);

const classifyComponents = (
  entries: readonly AppleInventoryEntry[],
  all: readonly Component[],
  roots: readonly string[],
) => {
  const withinApp = (path: string): boolean =>
    roots.some((root) => isWithin(path, root));
  const matching = (predicate: (path: string) => boolean): Component[] =>
    entries.flatMap(({ path, kind, component }) =>
      kind === "file" &&
      component !== undefined &&
      !isSidecar(path) &&
      withinApp(path) &&
      predicate(path)
        ? [component]
        : [],
    );
  const lastSegment = (path: string): string => path.split("/").at(-1) ?? "";
  return {
    bundle_metadata: all.filter(({ path }) =>
      anatomyNameIs(lastSegment(path), "Info.plist"),
    ),
    // An unrooted IPA library is listed only under native_libraries.
    executables: all.filter(
      ({ path, format }) =>
        isMachOFormat(format) && (withinApp(path) || !isNativeLibrary(path)),
    ),
    frameworks: all.filter(({ path }) => /\.framework\//u.test(path)),
    native_libraries: all.filter(({ path }) => isNativeLibrary(path)),
    javascript: all.filter(({ format }) => format === "javascript-bundle"),
    signing: all.filter(
      ({ path }) =>
        anatomyTailMatches(path, ["_CodeSignature", "CodeResources"]) ||
        anatomyNameIs(lastSegment(path), "embedded.mobileprovision") ||
        anatomyNameIs(lastSegment(path), "embedded.provisionprofile"),
    ),
    privileged_helpers: matching((path) =>
      anatomyTailMatches(path, ["Contents", "Library", "LaunchServices", "*"]),
    ),
    launchd_plists: matching(
      (path) =>
        path.endsWith(".plist") &&
        (anatomyTailMatches(path, [
          "Contents",
          "Library",
          "LaunchAgents",
          "*",
        ]) ||
          anatomyTailMatches(path, [
            "Contents",
            "Library",
            "LaunchDaemons",
            "*",
          ])),
    ).map((component) => ({
      ...component,
      domain: component.path
        .split("/")
        .some((segment) => anatomyNameIs(segment, "LaunchDaemons"))
        ? ("daemon" as const)
        : ("agent" as const),
    })),
    helpers: matching((path) =>
      anatomyTailMatches(path, ["Contents", "Helpers", "*"]),
    ),
  };
};

const deduplicateComponents = (values: readonly Component[]): Component[] =>
  [...new Map(values.map((value) => [value.path, value])).values()].sort(
    (left, right) => compare(left.path, right.path),
  );

const identifyRuntimeFamilies = (all: readonly Component[]) => {
  const families = new Set<
    z.infer<
      typeof appleApplicationProjectionResultSchema
    >["runtime_families"][number]
  >();
  if (all.some(({ format }) => ["mach-o", "mach-o-universal"].includes(format)))
    families.add("native");
  if (all.some(({ path }) => isSwiftRuntimeLibrary(path)))
    families.add("swift-objective-c");
  if (all.some(({ format }) => format === "javascript-bundle"))
    families.add("javascript");
  for (const { path } of all) {
    const convention = nativeRuntimeConvention(path);
    if (convention !== null) families.add(convention);
  }
  return [...families].sort(compare);
};

/** Pair scripts and native code within matching application-root groups. */
const identifyBridgeCandidates = (
  scripts: readonly Component[],
  native: readonly Component[],
  roots: readonly string[],
) => {
  const owner = (path: string): string | null =>
    roots.find((root) => isWithin(path, root)) ?? null;
  const scriptGroups: { root: string | null; left: Component[] }[] = [];
  for (const script of scripts) {
    const root = owner(script.path);
    const last = scriptGroups.at(-1);
    if (last?.root === root) last.left.push(script);
    else scriptGroups.push({ root, left: [script] });
  }
  const nativeByRoot = new Map<string | null, Component[]>();
  for (const item of native) {
    const root = owner(item.path);
    const scoped = nativeByRoot.get(root) ?? [];
    scoped.push(item);
    nativeByRoot.set(root, scoped);
  }
  const groups = scriptGroups.map(({ root, left }) => ({
    left,
    right: nativeByRoot.get(root) ?? [],
  }));
  return projectCartesianCandidates({
    groups,
    createCandidate: (source_path, item) => ({
      source_path,
      native_path: item.path,
      basis: bridgeBasis(item.path),
    }),
  });
};

const bridgeBasis = (
  path: string,
):
  | "javascript-and-native-content"
  | "react-native-convention"
  | "flutter-convention"
  | "unity-convention" => {
  const convention = nativeRuntimeConvention(path);
  if (convention === "react-native") return "react-native-convention";
  if (convention === "flutter") return "flutter-convention";
  if (convention === "unity") return "unity-convention";
  return "javascript-and-native-content";
};

const projectionLimitations = (facts: {
  readonly complete: boolean;
  readonly uninventoriedImage: boolean;
  readonly roots: readonly string[];
  readonly bundles: readonly z.infer<typeof appleBundleSchema>[];
  readonly sidecars: boolean;
  readonly symlinks: boolean;
  readonly unattributed: number;
  readonly bridgeCandidateCoverage: AppleApplicationProjectionResult["bridge_candidate_coverage"];
}): string[] => [
  ...(!facts.complete
    ? ["Source inventory coverage is partial; absence is unknown."]
    : []),
  ...(facts.uninventoriedImage
    ? [
        "The DMG's contents were not inventoried on this host; bundle absence is unknown.",
      ]
    : []),
  ...(facts.roots.length === 0
    ? [
        "No application bundle (Payload/*.app or *.app/Contents) was present in the supplied inventory pages.",
      ]
    : []),
  ...(facts.bundles.some(
    ({ layout, info_plist_path: plist }) =>
      layout === "versioned-framework" && plist === null,
  )
    ? [
        "A versioned framework has several version directories or no Versions/*/Resources/Info.plist; the Info.plist that Versions/Current selects is unknown because symlink targets are not inventoried.",
      ]
    : []),
  ...(facts.symlinks
    ? [
        "Symlinks are reported by path only; their targets are not inventoried, so bundles are reported at their real paths.",
      ]
    : []),
  ...(facts.unattributed > 0
    ? [
        `${facts.unattributed} inventoried entries outside every application root are not attributed to the application.`,
      ]
    : []),
  ...(facts.sidecars
    ? [
        "AppleDouble sidecar entries (._* files and __MACOSX/) describe neighbouring files and are excluded from bundle roles.",
      ]
    : []),
  ...(facts.bridgeCandidateCoverage.status === "partial"
    ? [
        `Bridge candidate pairs exceeded the projection safety budget; ${facts.bridgeCandidateCoverage.omitted_candidates} hypotheses are omitted. Component arrays still include every component from the supplied inventory pages.`,
      ]
    : []),
  "Bundle roles follow path conventions. Read each info_plist_path with inspect_plist for CFBundleExecutable, identifiers, and declared services.",
  "Bundle identifiers and signing claims require dedicated plist and CMS parsing; this projection reports only exact paths and hashes.",
  "Runtime families are inferred from inventory formats and bounded framework path conventions, not observed runtime loading.",
  "Generic framework and dylib paths do not establish Swift or Objective-C; this inventory projection does not decode language metadata.",
  "Bridge candidates are path-based hypotheses, not observed runtime calls.",
  "A bridge basis is inferred from the native path and is repeated for every managed component.",
];

const digest = (value: unknown): string =>
  projectionDigest(value, "Apple application projection");

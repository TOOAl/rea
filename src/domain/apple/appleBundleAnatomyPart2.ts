import { compareUnicodeCodePoints as compare } from "../unicodeCodePointOrder.js";

const indexTree = (entries: readonly Entry[]): Tree => {
  const children = new Map<string, Set<string>>();
  const files = new Map<string, Component>();
  const directories = new Set<string>();
  for (const { path, kind, component } of entries) {
    if (isSidecar(path)) continue;
    if (kind === "file" && component !== undefined) files.set(path, component);
    if (kind === "directory") directories.add(path);
    const segments = path.split("/");
    let parent = "";
    for (const segment of segments) {
      const names = children.get(parent) ?? new Set<string>();
      names.add(segment);
      children.set(parent, names);
      parent = joinPath(parent, segment);
      if (parent !== path) directories.add(parent);
    }
  }
  return { children, files, directories };
};

const joinPath = (directory: string, name: string): string =>
  directory === "" ? name : `${directory}/${name}`;

const directoryOf = (bundle: string): string => (bundle === "." ? "" : bundle);

const enclosingBundle = (
  path: string,
  bundles: ReadonlySet<string>,
): string | null => {
  if (path === ".") return null;
  const segments = path.split("/");
  for (let length = segments.length - 1; length > 0; length--) {
    const candidate = segments.slice(0, length).join("/");
    if (bundles.has(candidate)) return candidate;
  }
  return bundles.has(".") ? "." : null;
};

const bundleLayout = (bundle: string, tree: Tree): Bundle["layout"] => {
  const names = tree.children.get(directoryOf(bundle));
  if (anatomyChild(names, "Contents") !== null) return "macos-deep";
  if (anatomyChild(names, "Versions") !== null) return "versioned-framework";
  return "shallow";
};

const bundleRole = (bundle: string): Bundle["role"] => {
  const segments = bundle.split("/");
  const name = (segments.at(-1) ?? "").toLowerCase();
  const container = segments.at(-2);
  if (name.endsWith(".appex")) return "app-extension";
  if (name.endsWith(".xpc")) return "xpc-service";
  if (name.endsWith(".framework")) return "framework";
  if (name.endsWith(".systemextension")) return "system-extension";
  if (name.endsWith(".dext")) return "driver-extension";
  if (name.endsWith(".bundle")) {
    if (anatomyNameIs(container ?? "", "PlugIns")) return "plug-in";
    return anatomyNameIs(container ?? "", "Resources")
      ? "resource-bundle"
      : "bundle";
  }
  if (!name.endsWith(".app")) return "plug-in";
  if (
    anatomyNameIs(container ?? "", "LoginItems") &&
    anatomyNameIs(segments.at(-3) ?? "", "Library")
  )
    return "login-item";
  if (anatomyNameIs(container ?? "", "Helpers")) return "helper-application";
  return "nested-application";
};

/** Files directly inside one directory; nested bundles are deeper paths. */
const directFiles = (directory: string, tree: Tree): string[] =>
  [...(tree.children.get(directory) ?? [])]
    .map((name) => joinPath(directory, name))
    .filter((path) => tree.files.has(path))
    .sort(compare);

/** Content directories; `Versions/Current` is a symlink outside the inventory. */
const contentDirectories = (
  bundle: string,
  layout: Bundle["layout"],
  tree: Tree,
): string[] => {
  const directory = directoryOf(bundle);
  if (layout === "macos-deep") {
    const contents = namedChild(tree, directory, "Contents");
    return contents === null ? [] : [contents];
  }
  if (layout === "shallow") return [directory];
  const versions = namedChild(tree, directory, "Versions");
  if (versions === null) return [];
  // Only real version directories count: Current is a symlink, and files
  // such as .DS_Store are not versions.
  return [...(tree.children.get(versions) ?? [])]
    .filter((version) => !anatomyNameIs(version, "Current"))
    .map((version) => joinPath(versions, version))
    .filter((version) => tree.directories.has(version))
    .sort(compare);
};

/** Child path using the archive's spelling of one anatomy name. */
const namedChild = (
  tree: Tree,
  directory: string,
  expected: string,
): string | null => {
  const name = anatomyChild(tree.children.get(directory), expected);
  return name === null ? null : joinPath(directory, name);
};

const infoPlistPath = (
  bundle: string,
  layout: Bundle["layout"],
  tree: Tree,
): string | null => {
  const directories = contentDirectories(bundle, layout, tree);
  // With several real versions, Versions/Current (a symlink outside the
  // inventory) decides which plist applies, so the plist stays unknown.
  if (directories.length !== 1) return null;
  const directory = directories[0];
  if (directory === undefined) return null;
  const parent =
    layout === "versioned-framework"
      ? namedChild(tree, directory, "Resources")
      : directory;
  if (parent === null) return null;
  const info = namedChild(tree, parent, "Info.plist");
  return info !== null && tree.files.has(info) ? info : null;
};

const executableCandidates = (
  bundle: string,
  layout: Bundle["layout"],
  tree: Tree,
): string[] =>
  contentDirectories(bundle, layout, tree)
    .flatMap((directory) => {
      const executableDirectory =
        layout === "macos-deep"
          ? namedChild(tree, directory, "MacOS")
          : directory;
      return executableDirectory === null
        ? []
        : directFiles(executableDirectory, tree);
    })
    .filter((path) =>
      MACH_O_FORMATS.includes(tree.files.get(path)?.format ?? ""),
    );

const signingPaths = (
  bundle: string,
  layout: Bundle["layout"],
  tree: Tree,
): string[] =>
  contentDirectories(bundle, layout, tree)
    .flatMap((directory) => {
      const signature = namedChild(tree, directory, "_CodeSignature");
      return [
        signature === null
          ? null
          : namedChild(tree, signature, "CodeResources"),
        namedChild(tree, directory, "embedded.provisionprofile"),
        namedChild(tree, directory, "embedded.mobileprovision"),
      ];
    })
    .filter((path): path is string => path !== null && tree.files.has(path))
    .sort(compare);

/** Platforms of application roots whose layout was observed, not assumed. */
export const platformsOf = (bundles: readonly Bundle[]): ("ios" | "macos")[] =>
  [
    ...new Set(
      bundles.flatMap(({ role, layout, info_plist_path: plist }) => {
        if (role !== "application") return [];
        if (layout === "macos-deep") return ["macos" as const];
        // An empty or partial root has no Contents/ either; require Info.plist.
        if (layout === "shallow" && plist !== null) return ["ios" as const];
        return [];
      }),
    ),
  ].sort(compare);

import type { z } from "zod";
import type { AndroidRequest } from "../domain/android/androidAnalysis.js";
import { androidResultSchemas } from "../domain/android/androidAnalysis.js";
import {
  AnalysisCapabilityUnavailableError,
  AnalysisInputError,
  AnalysisOutputError,
} from "../domain/analysisErrorCore.js";
import type { JsonValue } from "../domain/jsonValue.js";
import {
  jadxAppSchema,
  jadxClassPageSchema,
  jadxClassSchema,
  jadxLoadSchema,
  jadxMethodSchema,
  jadxXrefsSchema,
  normalizeJadxText,
} from "./JadxProtocol.js";
import { JADX_RELEASE } from "./JadxRelease.js";

/** The adapter consumes tool payloads, never provider RPC details outside this layer. */
export interface JadxToolPort {
  json(
    name: string,
    input: Readonly<Record<string, JsonValue>>,
  ): Promise<JsonValue>;
  text(
    name: string,
    input: Readonly<Record<string, JsonValue>>,
  ): Promise<string>;
}

type Engine = z.infer<
  typeof androidResultSchemas.inspect_android_package
>["engine"];
type ClassSummary = z.infer<typeof jadxClassSchema>;

const methodsOf = (summary: ClassSummary) => {
  const seen = new Map<string, number>();
  return summary.methods.map((method) => {
    const index = seen.get(method.name) ?? 0;
    seen.set(method.name, index + 1);
    return {
      name: method.name,
      reported_signature: method.signature,
      overload_index: index,
      is_constructor: method.is_constructor,
      dex_descriptor: method.dex_descriptor,
    };
  });
};

const inputFailure = (
  request: AndroidRequest,
  field: string,
  message: string,
): never => {
  throw new AnalysisInputError(request.operation, undefined, [
    { path: [field], reason: "invalid_value", message },
  ]);
};

const classSummary = async (
  tools: JadxToolPort,
  request: Exclude<
    AndroidRequest,
    { operation: "inspect_android_package" | "search_android_classes" }
  >,
): Promise<ClassSummary> => {
  const raw = await tools.json("get_class_summary", {
    class_name: request.input.class_name,
  });
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    typeof raw.error === "string"
  )
    throw new AnalysisOutputError(
      request.operation,
      `JADX class summary failed: ${raw.error}`,
    );
  const summary = jadxClassSchema.safeParse(raw);
  if (!summary.success)
    throw new AnalysisOutputError(
      request.operation,
      "JADX class summary failed or was malformed; negative counts are not an empty class",
      { cause: summary.error },
    );
  const value = summary.data;
  if (value.full_name !== request.input.class_name)
    inputFailure(
      request,
      "class_name",
      `Exact class ${request.input.class_name} resolved to ${value.full_name}; use the fully qualified class name from search_android_classes.`,
    );
  if (
    value.method_count !== value.methods.length ||
    value.field_count !== value.fields.length ||
    value.inner_class_count !== value.inner_classes.length
  )
    throw new AnalysisOutputError(
      request.operation,
      "JADX class member counts do not match the returned inventory",
    );
  return value;
};

const inspectPackage = async (
  tools: JadxToolPort,
  loaded: z.infer<typeof jadxLoadSchema>,
  engine: Engine,
): Promise<JsonValue> => {
  const app = jadxAppSchema.parse(await tools.json("get_app_info", {}));
  const manifest = normalizeJadxText(
    await tools.text("get_android_manifest", {}),
  );
  return androidResultSchemas.inspect_android_package.parse({
    engine,
    package_name: app.package || null,
    version_name: app.version_name || null,
    version_code: app.version_code || null,
    min_sdk: app.min_sdk || null,
    target_sdk: app.target_sdk || null,
    permissions: app.permissions,
    manifest,
    class_count: loaded.class_count,
    resource_count: loaded.resource_count,
    signature_verification: "not_performed",
  });
};

const searchClasses = async (
  tools: JadxToolPort,
  request: Extract<AndroidRequest, { operation: "search_android_classes" }>,
  loaded: z.infer<typeof jadxLoadSchema>,
  engine: Engine,
): Promise<JsonValue> => {
  const classes: string[] = [];
  const pageSize = 4096;
  let total: number | undefined;
  do {
    const page = jadxClassPageSchema.parse(
      await tools.json("list_classes", {
        offset: classes.length,
        limit: pageSize,
      }),
    );
    if (
      (total !== undefined && total !== page.total) ||
      page.offset !== classes.length ||
      page.limit !== pageSize ||
      page.items.length > pageSize
    )
      throw new AnalysisOutputError(
        request.operation,
        "JADX class pagination changed identity or counts",
      );
    total = page.total;
    classes.push(...page.items);
    if (
      classes.length > total ||
      (page.items.length === 0 && classes.length < total)
    )
      throw new AnalysisOutputError(
        request.operation,
        "JADX class pagination is incomplete",
      );
  } while (classes.length < total);
  if (total !== loaded.class_count)
    throw new AnalysisOutputError(
      request.operation,
      "JADX class inventory count differs from the loaded class count",
    );
  const occurrences = new Map<string, number>();
  for (const name of classes)
    occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
  const matchingNames = classes.filter((name) =>
    name.includes(request.input.query),
  );
  const duplicateNames = [...occurrences]
    .filter(([name, count]) => count > 1 && name.includes(request.input.query))
    .map(([name, count]) => ({ name, occurrences: count }));
  return androidResultSchemas.search_android_classes.parse({
    engine,
    query: request.input.query,
    total_classes: total,
    matches: matchingNames,
    duplicate_names: duplicateNames,
    coverage: "complete",
  });
};

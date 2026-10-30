import { digestExportShapeValue } from "./javascriptExportShapeComparisonIdentity.js";
import type {
  JavaScriptExportShapeComparisonChange,
  JavaScriptExportShapeComparisonResult,
} from "./javascriptExportShapeComparisonSchemas.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import type { RetainedJavaScriptExportShapes } from "./javascriptExportShapeSelection.js";

type Primitive = string | number | boolean | null;
type Shape = RetainedJavaScriptExportShapes["shapes"][number];
type Field = Shape["fields"][number];
type SelectorResult = JavaScriptExportShapeComparisonResult["left"];

// src/domain/javascript/javascriptExportShapeVariantsPart2.ts
const selectionAvailability = (
  selection: SelectorResult,
  side: "left" | "right",
): ValueAvailability => ({
  availability: "unknown",
  reason: `${capitalize(side)} export selection is ${selection.status}.`,
});

const emptyShapeAvailability = (
  shapes: readonly Shape[],
  side: "left" | "right",
): ValueAvailability => ({
  availability: "unknown",
  reason:
    shapes.length === 0
      ? `${capitalize(side)} export has no retained direct return shape.`
      : `${capitalize(side)} export return shape cannot be paired without an opposite variant.`,
});

const unpairedChange = (
  side: "left" | "right",
  shape: Shape,
  evidenceLinks: [string, string],
): JavaScriptExportShapeComparisonChange =>
  changeWithId({
    status: "unknown",
    path: "",
    discriminant: null,
    presence: UNKNOWN_COVERAGE_PRESENCE,
    left: {
      availability: "unknown",
      reason:
        side === "left"
          ? "Left return variant has no unique exact cross-version pairing."
          : "No left return variant was uniquely paired with this right variant.",
    },
    right: {
      availability: "unknown",
      reason:
        side === "right"
          ? "Right return variant has no unique exact cross-version pairing."
          : "No right return variant was uniquely paired with this left variant.",
    },
    left_source_range: side === "left" ? shape.source_range : null,
    right_source_range: side === "right" ? shape.source_range : null,
    evidence_links: evidenceLinks,
    limitations: [
      "The return variant was not paired because no reciprocal unique literal discriminant exists.",
    ],
  });

const changeWithId = (
  semantic: Omit<JavaScriptExportShapeComparisonChange, "change_id">,
): JavaScriptExportShapeComparisonChange => ({
  ...semantic,
  change_id: `jesc_change_${digestExportShapeValue(semantic)}`,
});

const literalValue = (
  field: Field,
):
  | { readonly found: true; readonly value: Primitive }
  | { readonly found: false } =>
  field.state === "literal" && isPrimitive(field.value)
    ? { found: true, value: field.value }
    : { found: false };

const primitiveArray = (value: unknown): Primitive[] =>
  Array.isArray(value) ? value.filter(isPrimitive) : [];

const isPrimitive = (value: unknown): value is Primitive =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

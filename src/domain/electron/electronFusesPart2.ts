import { z } from "zod";

import { digestSchema } from "../digests.js";
import { localPathStringSchema } from "../localPath.js";

/** ASCII sentinel that introduces an Electron fuse wire in an Electron binary. */

const describeSentinel = (
  sliceIndex: number,
  sentinel: ElectronFuseSentinel,
  container: ElectronFuseReport["artifact"]["format"],
  implications: ElectronFuseImplication[],
  limitations: string[],
): void => {
  if (!sentinel.complete)
    limitations.push(
      `Electron fuse wire at file offset ${sentinel.sentinel_offset} is truncated; fuse bytes past the slice stay unknown.`,
    );
  if (sentinel.wire_version === null) return;
  if (sentinel.wire_version !== 1) {
    limitations.push(
      `Electron fuse wire at file offset ${sentinel.sentinel_offset} uses wire version ${sentinel.wire_version}; version 1 is the only pinned name table, so runtime implications for this wire are unknown.`,
    );
    return;
  }
  for (const spec of FUSE_IMPLICATIONS) {
    const fuse = sentinel.fuses.find((item) => item.index === spec.fuseIndex);
    if (fuse === undefined) {
      limitations.push(
        `Electron fuse wire at file offset ${sentinel.sentinel_offset} does not include fuse index ${spec.fuseIndex}; that runtime implication is unknown.`,
      );
      continue;
    }
    const applicabilityUnknown =
      spec.subject === "embedded_asar_integrity_validation" &&
      !embeddedAsarIntegrityApplies(container);
    if (applicabilityUnknown)
      limitations.push(
        `Electron compiles embedded ASAR integrity validation only on macOS and Windows; the observed fuse byte at file offset ${sentinel.sentinel_offset} does not establish enforcement.`,
      );
    implications.push(
      implicationFor(spec, applicabilityUnknown ? "unknown" : fuse.state, {
        slice_index: sliceIndex,
        sentinel_offset: sentinel.sentinel_offset,
      }),
    );
  }
};

const implicationFor = (
  spec: (typeof FUSE_IMPLICATIONS)[number],
  state: ElectronFuseState,
  location: {
    readonly slice_index: number;
    readonly sentinel_offset: number;
  },
): ElectronFuseImplication => {
  const outcome =
    state === "enabled"
      ? spec.enabled
      : state === "unknown"
        ? "unknown"
        : spec.inactive;
  return {
    relationship: "derivation",
    subject: spec.subject,
    fuse_index: spec.fuseIndex,
    outcome,
    ...location,
  } as ElectronFuseImplication;
};

const validateReportBounds = (
  report: ElectronFuseReport,
  context: z.RefinementCtx,
): void => {
  const size = report.artifact.bytes;
  for (const [sliceIndex, slice] of report.slices.entries()) {
    if (slice.index !== sliceIndex)
      context.addIssue({
        code: "custom",
        path: ["slices", sliceIndex, "index"],
        message: "Slice index does not match its position in the report.",
      });
    if (slice.sentinel_count !== slice.sentinels.length)
      context.addIssue({
        code: "custom",
        path: ["slices", sliceIndex, "sentinel_count"],
        message: "Sentinel count does not match the reported sentinels.",
      });
    if (slice.file_offset > size || slice.size > size - slice.file_offset)
      context.addIssue({
        code: "custom",
        path: ["slices", sliceIndex],
        message: "Slice range extends outside the selected artifact.",
      });
    for (const [sentinelIndex, sentinel] of slice.sentinels.entries())
      validateSentinel(slice, sentinel, sliceIndex, sentinelIndex, context);
  }
  const expected = new Set(
    describeElectronFuseFindings(
      report.slices,
      report.artifact.format,
    ).runtime_implications.map(implicationKey),
  );
  for (const [index, implication] of report.runtime_implications.entries()) {
    if (!expected.has(implicationKey(implication)))
      context.addIssue({
        code: "custom",
        path: ["runtime_implications", index],
        message:
          "Runtime implication is not supported by the reported fuse bytes and applicability.",
      });
    const slice = report.slices[implication.slice_index];
    if (
      slice?.sentinels.some(
        (sentinel) => sentinel.sentinel_offset === implication.sentinel_offset,
      ) !== true
    )
      context.addIssue({
        code: "custom",
        path: ["runtime_implications", index],
        message: "Runtime implication does not reference a reported sentinel.",
      });
  }
};

const implicationKey = (fact: ElectronFuseImplication): string =>
  JSON.stringify([
    fact.slice_index,
    fact.sentinel_offset,
    fact.subject,
    fact.fuse_index,
    fact.outcome,
  ]);

const validateSentinel = (
  slice: ElectronFuseSlice,
  sentinel: ElectronFuseSentinel,
  sliceIndex: number,
  sentinelIndex: number,
  context: z.RefinementCtx,
): void => {
  const sentinelEnd = sentinel.sentinel_offset + ELECTRON_FUSE_SENTINEL.length;
  const wireEnd =
    sentinelEnd +
    (sentinel.wire_version === null ? 0 : 1) +
    (sentinel.declared_length === null ? 0 : 1) +
    sentinel.fuses.length;
  if (wireEnd > slice.file_offset + slice.size)
    context.addIssue({
      code: "custom",
      path: ["slices", sliceIndex, "sentinels", sentinelIndex],
      message: "Reported wire header or fuse bytes extend outside the slice.",
    });
  if (
    sentinel.sentinel_offset < slice.file_offset ||
    sentinelEnd > slice.file_offset + slice.size
  )
    context.addIssue({
      code: "custom",
      path: [
        "slices",
        sliceIndex,
        "sentinels",
        sentinelIndex,
        "sentinel_offset",
      ],
      message: "Sentinel is outside its slice.",
    });
  if (sentinel.wire_version === null && sentinel.declared_length !== null)
    context.addIssue({
      code: "custom",
      path: [
        "slices",
        sliceIndex,
        "sentinels",
        sentinelIndex,
        "declared_length",
      ],
      message: "A wire without a version byte cannot declare a fuse count.",
    });
  if (
    sentinel.complete &&
    (sentinel.declared_length === null ||
      sentinel.fuses.length !== sentinel.declared_length)
  )
    context.addIssue({
      code: "custom",
      path: ["slices", sliceIndex, "sentinels", sentinelIndex, "complete"],
      message: "A complete wire must contain every declared fuse byte.",
    });
  if (
    !sentinel.complete &&
    sentinel.declared_length !== null &&
    sentinel.fuses.length >= sentinel.declared_length
  )
    context.addIssue({
      code: "custom",
      path: ["slices", sliceIndex, "sentinels", sentinelIndex, "complete"],
      message: "An incomplete wire must omit at least one declared fuse byte.",
    });
  for (const [fuseIndex, fuse] of sentinel.fuses.entries()) {
    if (fuse.index !== fuseIndex)
      context.addIssue({
        code: "custom",
        path: [
          "slices",
          sliceIndex,
          "sentinels",
          sentinelIndex,
          "fuses",
          fuseIndex,
          "index",
        ],
        message: "Fuse index does not match its wire position.",
      });
    if (fuse.state !== electronFuseState(fuse.raw_byte))
      context.addIssue({
        code: "custom",
        path: [
          "slices",
          sliceIndex,
          "sentinels",
          sentinelIndex,
          "fuses",
          fuseIndex,
          "state",
        ],
        message: "Fuse state does not match its raw byte.",
      });
    if (
      sentinel.wire_version !== null &&
      fuse.name !== electronFuseName(sentinel.wire_version, fuse.index)
    )
      context.addIssue({
        code: "custom",
        path: [
          "slices",
          sliceIndex,
          "sentinels",
          sentinelIndex,
          "fuses",
          fuseIndex,
          "name",
        ],
        message: "Fuse name does not match the pinned version-1 table.",
      });
  }
};

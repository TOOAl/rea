import { constants } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";

import { absoluteCallerPath } from "../filesystem/callerPath.js";
import { SafeOutputTreeCreationFailure } from "./SafeOutputTreeCreationFailure.js";
import { removeOwnedTree } from "./SafeOutputTreeCleanup.js";

/** One file durably written to an operation-owned output tree. */
export interface SafeOutputFile {
  readonly relativePath: string;
  readonly sha256: string;
  readonly bytesWritten: number;
}

/** Cleanup state established while rolling back an uncommitted tree. */
export type SafeOutputCleanup =
  | { readonly status: "not-required" }
  | { readonly status: "complete"; readonly residualPaths: readonly [] }
  | {
      readonly status: "incomplete";
      readonly residualPaths: readonly [string, ...string[]];
    };

/**
 * Materialize files in a tree created by this operation.
 *
 * Path identities are revalidated around operations, but Node has no portable
 * descriptor-relative traversal; a syscall-boundary pathname race remains.
 */

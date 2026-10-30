import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  mkdir,
  open,
  readdir,
  realpath,
  type FileHandle,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import type { Readable } from "node:stream";
import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";
import { streamChunkToBuffer } from "./StreamBytes.js";

import {
  ArtifactPathRegistry,
  destinationCaseCollisionMessage,
  normalizeArtifactPath,
} from "./ArtifactPaths.js";
import { absoluteCallerPath } from "../filesystem/callerPath.js";
import { ArtifactReaderFailure } from "./ArtifactReader.js";
import { SafeOutputTreeCreationFailure } from "./SafeOutputTreeCreationFailure.js";
import { hashOutputFile } from "./SafeOutputTreeReadback.js";
import { removeOwnedTree } from "./SafeOutputTreeCleanup.js";
import {
  assertHandleIdentity,
  assertFilePathIdentity,
  assertPathIdentity,
  isAbsent,
  readDirectoryIdentity,
  readFileIdentity,
  replacedDirectory,
  type DirectoryIdentity,
  type FileIdentity,
} from "./SafeOutputTreeIdentity.js";

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

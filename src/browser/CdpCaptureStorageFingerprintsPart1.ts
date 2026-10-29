export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import canonicalize from "canonicalize";
//
// import type { InspectWebPageInput } from "../domain/browserObservation.js";
// import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
// import { CdpConnection } from "./CdpConnection.js";
// import { optionalCdpCommand } from "./CdpOptionalCommand.js";
// import {
//   recordValue,
//   recordsValue,
//   cdpStringValue,
// } from "./CdpCaptureValues.js";
//
// type StorageFingerprint =
//   WebPageInspection["storage"]["content_fingerprints"][number];
//
// export interface CapturedStorageItems {
//   readonly items: readonly {
//     readonly key: string;
//     readonly value: string;
//   }[];
//   readonly complete: boolean;
// }
//
// export interface CapturedCache {
//   readonly name: string;
//   readonly id: string;
// }
//
// interface StorageFingerprintContext {
//   readonly connection: CdpConnection;
//   readonly sessionId: string | undefined;
//   readonly input: InspectWebPageInput;
//   readonly signal?: AbortSignal;
// }
//
// interface FingerprintState {
//   readonly items: StorageFingerprint[];
//   complete: boolean;
// }
//
// interface FingerprintRun {
//   readonly context: StorageFingerprintContext;
//   readonly limitations: string[];
//   readonly state: FingerprintState;
// }
//
// interface CaptureStorageFingerprintInput {
//   readonly context: StorageFingerprintContext;
//   readonly origin: string;
//   readonly cookieUrl: string;
//   readonly local: CapturedStorageItems;
//   readonly session: CapturedStorageItems;
//   readonly indexedDbNames: readonly string[];
//   readonly caches: readonly CapturedCache[];
//   readonly limitations: string[];
// }
//
// type StorageFingerprintCapture = {
//   readonly items: readonly StorageFingerprint[];
//   readonly complete: boolean;
// };
//
// /** Capture stable hashes of approved storage content without returning values. */
// export const captureStorageFingerprints = async ({
//   context,
//   origin,
//   cookieUrl,
//   local,
//   session,
//   indexedDbNames,
//   caches,
//   limitations,
// }: CaptureStorageFingerprintInput): Promise<StorageFingerprintCapture> => {
//   const state: FingerprintState = {
//     items: [],
//     complete: local.complete && session.complete,
//   };
//   const run = { context, limitations, state };
//   addStorageItems(state, "local_storage", local.items);
//   addStorageItems(state, "session_storage", session.items);
//   await addCookies(run, cookieUrl);
//   await addIndexedDb(run, origin, indexedDbNames);
//   await addCaches(run, caches);
//   state.items.sort((left, right) =>
//     compareUnicodeCodePoints(
//       `${left.scope}:${left.identity_sha256}`,
//       `${right.scope}:${right.identity_sha256}`,
//     ),
//   );
//   const complete =
//     state.complete && state.items.every(({ complete }) => complete);
//   return { items: state.items, complete };
// };
//
// const addStorageItems = (
//   state: FingerprintState,
//   scope: "local_storage" | "session_storage",
//   items: CapturedStorageItems["items"],
// ): void => {
//   for (const item of items)
//     addFingerprint(state, {
//       scope,
//       identity: item.key,
//       value: item.value,
//       complete: true,
//     });
// };
//
// const addCookies = async (
//   run: FingerprintRun,
//   pageUrl: string,
// ): Promise<void> => {
//   run.limitations.push(
//     "Cookie fingerprints cover cookies applicable to the current main-frame URL, not every path on its origin.",
//   );
//   const raw = await optionalCdpCommand(
//     run.context,
//     "Network.getCookies",
//     { urls: [pageUrl] },
//     run.limitations,
//   );
//   if (raw === undefined) {
//     run.state.complete = false;
//     return;
//   }
//   const cookieValues = recordValue(raw)?.cookies;
//   if (!Array.isArray(cookieValues)) {
//     run.state.complete = false;
//     return;
//   }
//   const cookies = recordsValue(cookieValues);
//   if (cookies.length !== cookieValues.length) run.state.complete = false;
//   for (const cookie of cookies) {
//     const name = cdpStringValue(cookie.name);
//     const value = cdpStringValue(cookie.value);
//     const domain = cdpStringValue(cookie.domain);
export const _l = 139;

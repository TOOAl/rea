export const __stub = 1;
//           },
//         ),
//       );
//     await writeFileAtomic(
//       join(staging, "entry", "manifest.json"),
//       `${JSON.stringify(manifest, null, 2)}\n`,
//       { mode: 0o600 },
//     );
//     const destination = join(this.#root, "projects", key);
//     try {
//       await rename(join(staging, "entry"), destination);
//     } catch (cause: unknown) {
//       if (!isPublishedByAnother(cause)) throw cause;
//       const winner = await this.lookup(key, signal);
//       if (winner !== undefined) return ok(winner);
//       throw cause;
//     }
//     const project = {
//       key,
//       directory: join(destination, "project"),
//       manifest,
//       functions: exported.functions,
//       inventory: exported.inventory,
//     };
//     this.#verified.set(key, project);
//     return ok(project);
//   }
//
//   /**
//    * Remove retired resources only. Age and a missing marker cannot establish
//    * that a process stopped, so unresolved staging is never swept.
//    */
//   async #sweep(signal: AbortSignal): Promise<void> {
//     for (const name of await readdir(join(this.#root, "trash"))) {
//       signal.throwIfAborted();
//       await this.#removeRetired(join(this.#root, "trash", name)).catch(
//         () => undefined,
//       );
//     }
//   }
//
//   /** Evict least recently used entries above the cap, keeping pinned ones. */
//   #evict(keep: string | null): Promise<void> {
//     const eviction = this.#eviction.then(() => this.#evictUnpinned(keep));
//     this.#eviction = eviction.catch(() => undefined);
//     return eviction;
//   }
//
//   /** Coalesce deferred reclamation after callers have had a turn to pin results. */
//   #scheduleEviction(): void {
//     this.#maintenanceRequested = true;
//     if (this.#maintenance !== undefined) return;
//     const maintenance = (async () => {
//       while (this.#maintenanceRequested) {
//         await new Promise<void>((resolve) => setImmediate(resolve));
//         this.#maintenanceRequested = false;
//         await this.#evict(null).catch(() => undefined);
//       }
//     })();
//     this.#maintenance = maintenance;
//     void maintenance.then(() => {
//       if (this.#maintenance === maintenance) this.#maintenance = undefined;
//       if (this.#maintenanceRequested) this.#scheduleEviction();
//     });
//   }
//
//   async #evictUnpinned(keep: string | null): Promise<void> {
//     // A successful build must reach its callers before they can pin its entry.
//     // Protect every unfinished build while reading this eviction snapshot.
//     const building = new Set([...this.#unfinished].map(({ key }) => key));
//     const entries: { key: string; bytes: number; mtimeMs: number }[] = [];
//     for (const name of await readdir(join(this.#root, "projects"))) {
//       if (!KEY_PATTERN.test(name)) continue;
//       const path = join(this.#root, "projects", name);
//       const status = await stat(path).catch(() => undefined);
//       if (status === undefined) continue;
//       const manifest = await this.#readBounded(join(path, "manifest.json"))
//         .then(parseManifest)
//         .catch(() => undefined);
//       // An owned entry without a valid manifest is unusable; evict it first.
//       entries.push(
//         manifest === undefined
//           ? { key: name, bytes: 0, mtimeMs: -1 }
//           : {
//               key: name,
//               bytes: manifestBytes(manifest),
//               mtimeMs: status.mtimeMs,
//             },
//       );
//     }
//     let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
//     let deferredByBuild = false;
//     for (const entry of entries.sort((a, b) => a.mtimeMs - b.mtimeMs)) {
//       if (total <= this.#maxBytes && entry.mtimeMs >= 0) break;
//       if (building.has(entry.key) || this.#inflight.has(entry.key)) {
//         deferredByBuild = true;
//         continue;
//       }
//       if (entry.key === keep || this.#pins.has(entry.key)) continue;
//       await this.#discard(entry.key);
//       total -= entry.bytes;
//     }
//     this.#capacity =
//       total <= this.#maxBytes
//         ? "within_limit"
//         : deferredByBuild
//           ? "building"
//           : "pinned";
//   }
//
//   /** Atomically retire one owned entry, then remove it. */
//   async #discard(key: string): Promise<void> {
//     this.#verified.delete(key);
//     const trash = join(this.#root, "trash", `${key}-${randomUUID()}`);
//     try {
//       await mkdir(join(this.#root, "trash"), { recursive: true, mode: 0o700 });
//       await rename(join(this.#root, "projects", key), trash);
//     } catch (cause: unknown) {
//       if (isMissing(cause)) return;
//       throw cause;
//     }
//     await this.#removeRetired(trash, key);
//   }
//
//   /** Keep each failed removal owned until that path is successfully removed. */
//   async #removeRetired(path: string, key?: string): Promise<void> {
//     try {
//       await rm(path, { recursive: true, force: true });
//       this.#retainedFiles.delete(path);
//     } catch (cause: unknown) {
//       throw this.#retainFileCleanup(path, cause, key);
//     }
//   }
//
//   /** Mark an entry recently used; false when it is no longer published. */
//   async #touch(key: string): Promise<boolean> {
//     const now = new Date();
//     try {
//       await utimes(join(this.#root, "projects", key), now, now);
//       return true;
//     } catch (cause: unknown) {
//       // Recency is advisory; only a missing entry changes the answer.
//       return !isMissing(cause);
//     }
//   }
//
//   async #readBounded(path: string): Promise<string> {
//     const status = await stat(path);
//     if (status.size > MANIFEST_MAX_BYTES)
//       throw new RangeError(
//         `${path} exceeds ${String(MANIFEST_MAX_BYTES)} bytes`,
//       );
//     return readFile(path, "utf8");
//   }
//
//   #retainFileCleanup(
//     path: string,
//     cause: unknown,
//     key?: string,
//   ): ProviderCleanupError {
//     const error = new ProviderCleanupError(
//       KUNA_PROVIDER_ID,
//       [path],
//       { reason: cause instanceof Error ? cause.message : String(cause) },
//       { operation: KUNA_EXPORT_OPERATION, cause },
//     );
//     this.#retainedFiles.set(path, {
//       key: key ?? this.#retainedFiles.get(path)?.key ?? null,
//       error,
//     });
//     return error;
//   }
// }
//
// /** One cleanup error aggregating what remains owned, or success when nothing does. */
// const cleanupResult = (
//   remaining: readonly ProviderCleanupError[],
// ): Result<null, ProviderCleanupError> => {
//   if (remaining.length === 0) return ok(null);
//   return err(
//     new ProviderCleanupError(
//       KUNA_PROVIDER_ID,
//       remaining.flatMap((entry) => entry.cleanupResources),
//       {
//         reason: remaining
//           .map((entry) =>
//             String(entry.diagnostics?.["reason"] ?? entry.message),
//           )
//           .join("; "),
//       },
//       { operation: KUNA_EXPORT_OPERATION },
//     ),
//   );
// };
export const _l = 194;

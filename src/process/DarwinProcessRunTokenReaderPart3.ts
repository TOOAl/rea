export const __stub = 1;
//     /** Deadline for helper compilation, independent of provider execution. */
//     readonly compileTimeoutMs?: number;
//     /** Environment consulted when `compileTimeoutMs` is omitted. */
//     readonly environment?: Readonly<Record<string, string | undefined>>;
//     /**
//      * Caller-owned directory holding the compiler's module cache. Unset keeps
//      * Swift's reusable default cache; a supplied directory outlives this
//      * reader because cleanup only removes the per-run helper root.
//      */
//     readonly moduleCachePath?: string;
//   } = {},
// ) => {
//   const compiler = options.compiler ?? {
//     kind: "xcrun",
//     executable: "/usr/bin/xcrun",
//   };
//   const compilerTimeoutMs = resolveSwiftcCompileTimeoutMs(options);
//   const moduleCachePath = options.moduleCachePath ?? "";
//   let root: string | undefined;
//   let executable: string | undefined;
//   let compilation: ProcessReaderCompilation | undefined;
//   let closePromise: Promise<void> | undefined;
//   let closed = false;
//   let exitCleanupInstalled = false;
//
//   const cleanupAtExit = () => {
//     if (root !== undefined) rmSync(root, { recursive: true, force: true });
//   };
//   const cleanupRoot = async (target = root): Promise<void> => {
//     if (target === undefined) return;
//     await rm(target, { recursive: true, force: true });
//     if (root !== target) return;
//     root = undefined;
//     executable = undefined;
//     if (exitCleanupInstalled) process.removeListener("exit", cleanupAtExit);
//     exitCleanupInstalled = false;
//   };
//   const runCompilation = async (signal: AbortSignal): Promise<string> => {
//     let operationRoot: string | undefined;
//     try {
//       if (
//         compiler.kind === "swiftc" &&
//         (!isAbsolute(compiler.executable) || !isAbsolute(compiler.sdkRoot))
//       ) {
//         throw new DarwinProcessOwnershipInspectionError(
//           "Direct Darwin helper compilation requires absolute REA_DARWIN_SWIFTC_PATH and SDKROOT paths selecting a compatible installed Swift compiler and macOS SDK.",
//         );
//       }
//       operationRoot = await mkdtemp(join(tmpdir(), "rea-process-token-"));
//       root = operationRoot;
//       process.once("exit", cleanupAtExit);
//       exitCleanupInstalled = true;
//       if (signal.aborted || closed) throw abortReason(signal);
//       const output = join(operationRoot, "reader");
//       // swiftc keeps intermediate objects under TMPDIR, so keep them inside
//       // the root that cleanup removes.
//       const compilerTemporary = join(operationRoot, "tmp");
//       await mkdir(compilerTemporary);
//       const compilerEnvironment: NodeJS.ProcessEnv = {
//         ...process.env,
//         TMPDIR: compilerTemporary,
//       };
//       const compilerArguments =
//         compiler.kind === "xcrun" ? ["swiftc"] : ["-sdk", compiler.sdkRoot];
//       if (compiler.kind === "swiftc")
//         compilerEnvironment.SDKROOT = compiler.sdkRoot;
//       if (moduleCachePath === "") {
//         // Use Swift's reusable default cache for REA's internal helper compilation.
//         delete compilerEnvironment.CLANG_MODULE_CACHE_PATH;
//       } else {
//         await mkdir(moduleCachePath, { recursive: true });
//         compilerArguments.push("-module-cache-path", moduleCachePath);
//         compilerEnvironment.CLANG_MODULE_CACHE_PATH = moduleCachePath;
//       }
//       compilerArguments.push(...sourceFiles, "-o", output);
//       try {
//         await execFileOutput(compiler.executable, compilerArguments, {
//           timeout: compilerTimeoutMs,
//           maxBuffer: 1024 * 1024,
//           signal,
//           stopSignal: SWIFTC_INTERRUPT,
//           env: compilerEnvironment,
//         });
//       } catch (cause: unknown) {
//         if (isExpectedAbort(cause, signal)) throw cause;
//         throw compilerInspectionError(cause, compilerTimeoutMs, compiler);
//       }
//       if (signal.aborted || closed) throw abortReason(signal);
//       executable = output;
//       return output;
//     } catch (cause: unknown) {
//       const ownsRoot = operationRoot !== undefined && root === operationRoot;
//       if (operationRoot !== undefined) {
//         if (ownsRoot) await cleanupRoot(operationRoot);
//         else await rm(operationRoot, { recursive: true, force: true });
//       }
//       throw cause;
//     }
//   };
//
//   const beginCompilation = (): ProcessReaderCompilation => {
//     const controller = new AbortController();
//     const operation: ProcessReaderCompilation = {
//       controller,
//       promise: runCompilation(controller.signal).finally(() => {
//         operation.settled = true;
//         if (compilation === operation) compilation = undefined;
//       }),
//       waiters: 0,
//       aborting: false,
//       settled: false,
//     };
//     compilation = operation;
//     return operation;
//   };
//
//   const compile = async (signal?: AbortSignal): Promise<string> => {
//     if (closed) throw new Error("Darwin process token reader is closed");
//     signal?.throwIfAborted();
//     while (true) {
//       if (closed) throw new Error("Darwin process token reader is closed");
//       signal?.throwIfAborted();
//       if (executable !== undefined) return executable;
//       if (compilation === undefined && root !== undefined) {
//         await cleanupRoot();
//         continue;
//       }
//       let operation = compilation;
//       if (operation?.aborting === true) {
//         try {
//           await waitForCompilation(operation.promise, signal);
//         } catch (cause: unknown) {
//           if (signal !== undefined && isExpectedAbort(cause, signal))
//             throw cause;
//         }
//         continue;
//       }
//       operation ??= beginCompilation();
//       operation.waiters += 1;
export const _l = 139;

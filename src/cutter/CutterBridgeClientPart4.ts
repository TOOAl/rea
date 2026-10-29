export const __stub = 1;
//       try {
//         if (!windowsPrivateReader.verifyDirectory(this.#directory))
//           return {
//             descriptors: [],
//             security: "not_private",
//             error: "bridge_directory_insecure",
//           };
//         security = "private_verified";
//       } catch {
//         return {
//           descriptors: [],
//           security,
//           error: "bridge_directory_insecure",
//         };
//       }
//     }
//     const entries: string[] = [];
//     try {
//       const directory = await opendir(this.#directory);
//       for await (const entry of directory) {
//         if (!/^cutter-\d+-[0-9a-f-]{36}\.json$/iu.test(entry.name)) continue;
//         if (entries.length === MAX_DESCRIPTOR_CANDIDATES)
//           return {
//             descriptors: [],
//             security,
//             error: "bridge_directory_capacity_exceeded",
//           };
//         entries.push(entry.name);
//       }
//     } catch {
//       return {
//         descriptors: [],
//         security: "not_checked",
//         error: "bridge_directory_unavailable",
//       };
//     }
//     const loaded = await mapDiscovery(entries, async (entry) => {
//       let file;
//       try {
//         let bytes: Buffer;
//         if (this.#platform === "win32") {
//           bytes = windowsPrivateReader!.readDescriptor(
//             this.#directory,
//             entry,
//             MAX_DESCRIPTOR_BYTES,
//           );
//         } else {
//           const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
//           file = await open(join(this.#directory, entry), flags);
//           const info = await file.stat();
//           if (
//             !info.isFile() ||
//             info.size > MAX_DESCRIPTOR_BYTES ||
//             info.uid !== currentUid ||
//             (info.mode & 0o077) !== 0
//           )
//             return undefined;
//           const boundedBytes = await readBoundedFileBytes(
//             file,
//             MAX_DESCRIPTOR_BYTES,
//           );
//           if (boundedBytes === undefined) return undefined;
//           bytes = boundedBytes;
//         }
//         if (bytes.byteLength > MAX_DESCRIPTOR_BYTES) return undefined;
//         const parsed = descriptorSchema.safeParse(
//           JSON.parse(bytes.toString("utf8")) as unknown,
//         );
//         if (
//           !parsed.success ||
//           entry !== `cutter-${parsed.data.pid}-${parsed.data.session_id}.json`
//         )
//           return undefined;
//         return parsed.data;
//       } catch {
//         return undefined;
//       } finally {
//         await file?.close().catch(() => undefined);
//       }
//     });
//     return {
//       descriptors: loaded.filter(
//         (value): value is z.infer<typeof descriptorSchema> =>
//           value !== undefined,
//       ),
//       security,
//     };
//   }
//
//   #request(
//     descriptor: z.infer<typeof descriptorSchema>,
//     requestBytes: AuthenticatedRequestBytes,
//     signal?: AbortSignal,
//     onAuthenticated?: (connectionOrdinal: string) => void,
//   ): Promise<unknown> {
//     return new Promise((resolve, reject) => {
//       const connection = createConnection({
//         host: descriptor.host,
//         port: descriptor.port,
//       });
//       const frames = new CutterBridgeResponseFrames();
//       let settled = false;
//       let requestSent = false;
//       let authenticated = false;
//       const clientNonce = randomBytes(32).toString("hex");
//       let serverNonce = "";
//       let connectionOrdinal: string | undefined;
//       const finish = (complete: () => void): void => {
//         if (settled) return;
//         settled = true;
//         clearTimeout(timer);
//         signal?.removeEventListener("abort", onAbort);
//         complete();
//       };
//       const rejectRequest = (message: string): void =>
//         finish(() =>
//           reject(new CutterBridgeRequestFailure(message, requestSent)),
//         );
//       const timer = setTimeout(() => {
//         rejectRequest("Cutter bridge request timed out");
//         connection.destroy();
//       }, 25_000);
//       const onAbort = (): void => {
//         rejectRequest("Cutter bridge request was cancelled");
//         connection.destroy();
//       };
//       signal?.addEventListener("abort", onAbort, { once: true });
//       if (signal?.aborted) onAbort();
//       connection.once("connect", () => {
//         connection.write(
//           `${JSON.stringify({ kind: "rea-auth-v2", nonce: clientNonce })}\n`,
//         );
//       });
//       connection.on("data", (chunk: Buffer) => {
//         try {
//           frames.push(chunk, (line) => {
//             const frame: unknown = JSON.parse(line.toString("utf8"));
//             if (!authenticated) {
//               const challenge = z
//                 .object({
//                   session_id: z.string().uuid(),
//                   nonce: z.string().regex(/^[0-9a-f]{64}$/),
//                   proof: z.string().regex(/^[0-9a-f]{64}$/),
//                 })
//                 .parse(frame);
//               if (challenge.session_id !== descriptor.session_id)
//                 throw new Error("unexpected peer session");
//               serverNonce = challenge.nonce;
//               connectionOrdinal = challenge.nonce.slice(0, 16);
//               const expected = createHmac("sha256", descriptor.token)
//                 .update(
//                   `rea-cutter-server-v2:${descriptor.session_id}:${clientNonce}:${challenge.nonce}`,
//                 )
//                 .digest();
//               if (
//                 !timingSafeEqual(expected, Buffer.from(challenge.proof, "hex"))
//               )
//                 throw new Error("peer proof failed");
//               onAuthenticated?.(connectionOrdinal);
//               const proof = createHmac("sha256", descriptor.token)
//                 .update(
//                   `rea-cutter-client-v2:${descriptor.session_id}:${clientNonce}:${challenge.nonce}:${requestBytes}`,
//                 )
//                 .digest("hex");
//               authenticated = true;
//               requestSent = true;
//               connection.write(
//                 `${JSON.stringify({ request: requestBytes, proof })}\n`,
//               );
//               return true;
//             } else {
//               const envelope = z
//                 .object({
//                   response: z.string(),
//                   proof: z.string().regex(/^[0-9a-f]{64}$/),
//                 })
//                 .parse(frame);
//               const expected = createHmac("sha256", descriptor.token)
//                 .update(
//                   `rea-cutter-response-v2:${descriptor.session_id}:${clientNonce}:${serverNonce}:${envelope.response}`,
//                 )
//                 .digest();
//               if (
//                 !timingSafeEqual(expected, Buffer.from(envelope.proof, "hex"))
//               )
//                 throw new Error("response proof failed");
//               const response: unknown = JSON.parse(envelope.response);
//               connection.end();
//               finish(() => resolve(response));
//               return false;
//             }
//           });
//         } catch {
//           rejectRequest("Cutter bridge peer authentication or response failed");
//           connection.destroy();
//         }
//       });
//       connection.once("error", (cause) =>
//         rejectRequest(`Cutter bridge is unavailable: ${cause.message}`),
//       );
//       connection.once("close", () =>
//         rejectRequest(
//           "Cutter bridge closed before returning a complete response",
//         ),
//       );
//     });
//   }
// }
//
// const resolveBridgeDirectory = (
//   configured: string | undefined,
//   platform: NodeJS.Platform,
//   localAppData: string | undefined,
//   homeDirectory: string,
// ): string => {
//   if (configured !== undefined && configured !== "") {
//     if (configured === "~") return homeDirectory;
//     if (configured.startsWith("~/"))
//       return join(homeDirectory, configured.slice(2));
//     if (platform === "win32" && configured.startsWith("~\\"))
//       return join(homeDirectory, configured.slice(2));
//     return configured;
//   }
//   return platform === "win32" && localAppData
//     ? join(localAppData, "REA", "CutterBridge")
//     : join(homeDirectory, ".cache", "rea", "cutter-bridge");
// };
export const _l = 227;

export const __stub = 1;
//                         member.mode === "array" &&
//                         token.name !== "startArray"
//                       ) {
//                         member.reject(
//                           new TypeError(`JSON member ${key} must be an array`),
//                         );
//                       } else {
//                         consume = memberConsumer(
//                           member,
//                           operation,
//                           stats.size,
//                           path,
//                         );
//                       }
//                     }
//                     key = undefined;
//                   }
//                   const selected = consume;
//                   if (opens) depth += 1;
//                   if (closes) depth -= 1;
//                   if (rootObject && depth === 1 && token.name !== "keyValue")
//                     consume = undefined;
//                   if (selected === undefined) return none;
//                   return selected(token);
//                 },
//               ),
//             ),
//             signal === undefined ? {} : { signal },
//           );
//           if (!rootObject)
//             return err(
//               invalidJson(operation, "JSON document root must be an object"),
//             );
//           const digest = hash.digest("hex");
//           if (previousDigest !== undefined && digest !== previousDigest)
//             throw new RegularFileChangedError(path);
//           previousDigest = digest;
//         }
//         return ok(undefined);
//       } catch (cause: unknown) {
//         const failure = jsonReadFailure(cause, operation, stats.size, path);
//         if (failure !== undefined) return err(failure);
//         throw cause;
//       }
//     },
//     {
//       signal,
//       ...(resources === undefined ? {} : { resources }),
//     },
//   );
//
// const memberConsumer = (
//   member: JsonObjectMemberReader,
//   operation: string,
//   size: number,
//   path: string,
// ) => {
//   let admit = admitJsonAssembly(operation, size, path);
//   const streamer: parser.TokenConsumer<{ readonly value: unknown }> =
//     member.mode === "array" ? streamArray() : streamValues();
//   const consume = fun(
//     (token: parser.Token) => admit(token),
//     streamer,
//     (row: unknown): typeof none | Promise<typeof none> => {
//       if (typeof row !== "object" || row === null || !("value" in row))
//         throw new Error("Unexpected JSON member parser result");
//       // The preceding array item has left the assembler; retain only what the
//       // consumer owns and use live headroom when admitting the next item.
//       admit = admitJsonAssembly(operation, size, path);
//       try {
//         const accepted = member.accept(row.value);
//         if (accepted instanceof Promise)
//           return accepted.then(
//             () => none,
//             (cause: unknown) => {
//               member.reject(cause);
//               return none;
//             },
//           );
//       } catch (cause: unknown) {
//         member.reject(cause);
//       }
//       return none;
//     },
//   );
//   return (token: parser.Token): typeof none | Promise<typeof none> => {
//     const consumed = consume(token);
//     return consumed instanceof Promise ? consumed.then(() => none) : none;
//   };
// };
//
// /** Parse strict UTF-8 JSON without requiring a whole-document string. */
// export const readJsonInputFile = (
//   path: string,
//   operation: string,
//   signal?: AbortSignal,
//   resources?: ArtifactResourceScope,
// ): Promise<Result<unknown, JsonInputFileFailure>> =>
//   withRegularFile(
//     path,
//     async (handle, stats) => {
//       let found = false;
//       let value: unknown;
//       try {
//         const native = await readNativeJson(
//           handle,
//           stats.size,
//           path,
//           operation,
//           signal,
//         );
//         if (native !== undefined) return native;
//         await pipeline(
//           decodedChunks(handle, stats.size, path, signal),
//           // Fuse synchronous token stages so only file chunks cross the async
//           // stream boundary. Admission still precedes scalar/value assembly.
//           asStream(
//             fun(
//               parser({
//                 jsonStreaming: false,
//                 streamValues: false,
//                 packKeys: false,
//                 packStrings: false,
//                 packNumbers: false,
//               }),
//               packJsonScalars(operation, stats.size, path),
//               admitJsonAssembly(operation, stats.size, path),
//               streamValues(),
//               (row: unknown): typeof none => {
//                 if (
//                   found ||
//                   typeof row !== "object" ||
//                   row === null ||
//                   !("key" in row) ||
//                   row.key !== 0 ||
//                   !("value" in row)
//                 )
//                   throw new Error("Unexpected JSON parser result");
//                 found = true;
//                 value = row.value;
//                 return none;
//               },
//             ),
//           ),
//           signal === undefined ? {} : { signal },
//         );
//         return found
//           ? ok(value)
//           : err(invalidJson(operation, "JSON document is empty"));
//       } catch (cause: unknown) {
//         const failure = jsonReadFailure(cause, operation, stats.size, path);
export const _l = 151;

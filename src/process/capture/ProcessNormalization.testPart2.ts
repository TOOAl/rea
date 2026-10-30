export const __stub = 1;
//   );
//
//   expect(normalize("a", 10)).toEqual({ state: "over_budget" });
// });
//
// it("counts UTF-8 bytes across replacement boundaries like the final JavaScript string", () => {
//   const splitPair = scenario({
//     paths: false,
//     ports: false,
//     pids: false,
//     patterns: [{ pattern: "\ude00", replacement: "\ude01" }],
//   });
//   const splitPairResult = createBoundedProcessTextNormalizer(
//     splitPair,
//     "/temporary",
//     rootPid,
//   )("😀", 4);
//   expect(splitPairResult).toEqual({
//     state: "normalized",
//     value: normalizeProcessText("😀", splitPair, "/temporary", rootPid),
//     utf8Bytes: 4,
//   });
//   expect(
//     splitPairResult.state === "normalized" && splitPairResult.utf8Bytes,
//   ).toBe(
//     Buffer.byteLength(
//       normalizeProcessText("😀", splitPair, "/temporary", rootPid),
//     ),
//   );
//
//   const joinedPair = scenario({
//     paths: false,
//     ports: false,
//     pids: false,
//     patterns: [{ pattern: "\ude00\ud83d", replacement: "" }],
//   });
//   const joinedInput = "😀😀";
//   const joinedExpected = normalizeProcessText(
//     joinedInput,
//     joinedPair,
//     "/temporary",
//     rootPid,
//   );
//   expect(joinedExpected).toBe("😀");
//   expect(
//     createBoundedProcessTextNormalizer(
//       joinedPair,
//       "/temporary",
//       rootPid,
//     )(joinedInput, Buffer.byteLength(joinedExpected)),
//   ).toEqual({
//     state: "normalized",
//     value: joinedExpected,
//     utf8Bytes: Buffer.byteLength(joinedExpected),
//   });
//
//   const emptyPattern = scenario({
//     paths: false,
//     ports: false,
//     pids: false,
//     patterns: [{ pattern: "", replacement: "\ude00" }],
//   });
//   const input = "\ud83d";
//   const expected = normalizeProcessText(
//     input,
//     emptyPattern,
//     "/temporary",
//     rootPid,
//   );
//   expect(
//     createBoundedProcessTextNormalizer(
//       emptyPattern,
//       "/temporary",
//       rootPid,
//     )(input, Buffer.byteLength(expected)),
//   ).toEqual({
//     state: "normalized",
//     value: expected,
//     utf8Bytes: Buffer.byteLength(expected),
//   });
//   expect(
//     createBoundedProcessTextNormalizer(
//       emptyPattern,
//       "/temporary",
//       rootPid,
//     )(input, Buffer.byteLength(expected) - 1),
//   ).toEqual({ state: "over_budget" });
//
//   const loneSurrogate = scenario({
//     paths: false,
//     ports: false,
//     pids: false,
//     patterns: [{ pattern: "x", replacement: "y" }],
//   });
//   const loneInput = "\ud83dx";
//   const loneExpected = normalizeProcessText(
//     loneInput,
//     loneSurrogate,
//     "/temporary",
//     rootPid,
//   );
//   expect(
//     createBoundedProcessTextNormalizer(
//       loneSurrogate,
//       "/temporary",
//       rootPid,
//     )(loneInput, Buffer.byteLength(loneExpected)),
//   ).toEqual({
//     state: "normalized",
//     value: loneExpected,
//     utf8Bytes: Buffer.byteLength(loneExpected),
//   });
// });
//
// it("lets a later pattern shrink text when an earlier pattern does not match", () => {
//   const declared = scenario({
//     paths: false,
//     ports: false,
//     pids: false,
//     patterns: [
//       { pattern: "z", replacement: "x" },
//       { pattern: "aa", replacement: "b" },
//     ],
//   });
//   const expected = normalizeProcessText("aa", declared, "/temporary", rootPid);
//   expect(expected).toBe("b");
//   expect(
//     createBoundedProcessTextNormalizer(
//       declared,
//       "/temporary",
//       rootPid,
export const _l = 131;

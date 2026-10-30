export const __stub = 1;
//     )("aa", Buffer.byteLength(expected)),
//   ).toEqual({
//     state: "normalized",
//     value: expected,
//     utf8Bytes: Buffer.byteLength(expected),
//   });
// });
//
// it("reuses matchers while observing the terminal PID after launch", () => {
//   let pid = -1;
//   const normalize = createProcessTextNormalizer(
//     scenario({ ports: false, patterns: [] }),
//     "/temporary",
//     () => pid,
//   );
//   expect(normalize("root 41010 /workspace/item")).toBe(
//     "root 41010 <working-directory>/item",
//   );
//   pid = 41_010;
//   expect(normalize("root 41010 /workspace/item")).toBe(
//     "root <pid> <working-directory>/item",
//   );
//   pid = 42_020;
//   expect(normalize("root 41010 peer 42020")).toBe("root 41010 peer <pid>");
// });
//
// it("keeps equal-path priority and replacement aliases local to each capture", () => {
//   const declared = parseProcessScenario({
//     executable: "/selected/tool",
//     working_directory: "/selected",
//     filesystem_observation_paths: ["/selected", "<working-directory>"],
//     normalization: { paths: true, pids: false, ports: false, patterns: [] },
//   });
//   const normalize = createProcessTextNormalizer(declared, "/selected", -1);
//   const other = createProcessTextNormalizer(declared, "/other", -1);
//   const text = "/selected/item <working-directory>/source";
//   expect(normalize(text)).toBe(
//     "<temporary-root>/item <filesystem-root-1>/source",
//   );
//   expect(other(text)).toBe(
//     "<working-directory>/item <filesystem-root-1>/source",
//   );
// });
//
// it("preserves empty-pattern boundaries, including empty text", () => {
//   const declared = scenario({
//     patterns: [{ pattern: "", replacement: "$$" }],
//   });
//   expect(normalizeProcessText("ab", declared, "/temporary", rootPid)).toBe(
//     "$$a$$b$$",
//   );
//   expect(normalizeProcessText("", declared, "/temporary", rootPid)).toBe("$$");
// });
//
// it.each(["$`", "$'"])(
//   "retains the selected replacement %s verbatim",
//   (replacement) => {
//     const declared = scenario({
//       patterns: [{ pattern: "marker", replacement }],
//     });
//     expect(
//       normalizeProcessText(
//         "before marker after",
//         declared,
//         "/temporary",
//         rootPid,
//       ),
//     ).toBe(`before ${replacement} after`);
//   },
// );
//
// it("preserves compact JSON, counters, line numbers, and ambiguous endpoint spellings", () => {
//   const input = [
//     '{"pid":32,"size":108,"height":480,"width":640,"score":20}',
//     "score=20 size:108 elapsed=3600 file.js:480 server:8080",
//     "port=65536 port:8080ms localhost:70000 999.1.2.3:8080",
//     "https://user:32@example.test/path http://user:20@localhost/path",
//   ].join("\n");
//   expect(normalizeProcessText(input, scenario({}), "/temporary", rootPid)).toBe(
//     input,
//   );
// });
//
// it("normalizes only contextual ports before overlapping PID values and honors disabled rules", () => {
//   const input =
//     'http://example.test:8080/x https://user:password@example.test:443/x 127.0.0.1:9 [::1]:65535 localhost:41010 "port":80 tcp_port=123 udp_port:0 listen:8080';
//   expect(normalizeProcessText(input, scenario({}), "/temporary", rootPid)).toBe(
//     'http://example.test:<port>/x https://user:password@example.test:<port>/x 127.0.0.1:<port> [::1]:<port> localhost:<port> "port":<port> tcp_port=<port> udp_port:<port> listen:<port>',
//   );
//   expect(
//     normalizeProcessText(
//       input,
//       scenario({ ports: false, pids: false }),
//       "/temporary",
//       rootPid,
//     ),
//   ).toBe(input);
// });
//
// it("normalizes ports that end a sentence but not decimal or host continuations", () => {
//   const input = [
//     "Listening on port: 8080.",
//     "Server at http://localhost:8080. Ready",
//     "Bound [::1]:3000.",
//     "listen=9000.\n",
//     "port: 80.5 localhost:8080.5 localhost:8080.example.test",
//     "port: 8080.β localhost:8080.é port: 8080é",
//   ].join("\n");
//   expect(normalizeProcessText(input, scenario({}), "/temporary", rootPid)).toBe(
//     [
//       "Listening on port: <port>.",
//       "Server at http://localhost:<port>. Ready",
//       "Bound [::1]:<port>.",
//       "listen=<port>.\n",
//       "port: 80.5 localhost:8080.5 localhost:8080.example.test",
//       "port: 8080.β localhost:8080.é port: 8080é",
//     ].join("\n"),
//   );
// });
//
// it("keeps a port before a chunk-final period, whose continuation is unknown", () => {
//   for (const chunk of ["port: 80.", "http://localhost:8080.", "[::1]:3000."])
//     expect(
//       normalizeProcessText(chunk, scenario({}), "/temporary", rootPid),
//     ).toBe(chunk);
// });
//
// it("normalizes representative process identities and preserves null, zero, and unrelated numbers", () => {
//   const before = JSON.stringify(samples);
//   const normalized = normalizeProcessSamples(samples, scenario({}), rootPid);
//
export const _l = 131;

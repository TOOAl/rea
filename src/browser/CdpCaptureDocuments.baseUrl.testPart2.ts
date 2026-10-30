export const __stub = 1;
//     "viewbox",
//   ]);
//   expect(result.urls.find(({ node_index }) => node_index === 2)?.url).toBe(
//     `${origin}/actual`,
//   );
// });
//
// interface SvgSnapshotNode {
//   readonly name: string;
//   readonly parent: number;
//   readonly attributes?: readonly (readonly [string, string])[];
//   readonly svg?: boolean;
// }
//
// const svgDocument = (
//   elements: readonly SvgSnapshotNode[],
//   baseUrl = `${origin}/screens/assets/`,
// ) => {
//   const strings = [documentUrl, baseUrl];
//   const intern = (value: string): number => {
//     const existing = strings.indexOf(value);
//     if (existing >= 0) return existing;
//     strings.push(value);
//     return strings.length - 1;
//   };
//   const nodeType = [9];
//   const nodeName = [intern("#document")];
//   const nodeValue = [intern("")];
//   const parentIndex = [-1];
//   const attributes: number[][] = [[]];
//   const backendNodeId = [1];
//   const svgNodeKinds = new Map<string, boolean>();
//   for (const element of elements) {
//     const id = backendNodeId.length + 1;
//     backendNodeId.push(id);
//     if (element.svg !== undefined)
//       svgNodeKinds.set(`${String(id)}:${element.name}`, element.svg);
//     nodeType.push(1);
//     nodeName.push(intern(element.name));
//     nodeValue.push(intern(""));
//     parentIndex.push(element.parent);
//     const encoded: number[] = [];
//     for (const [name, value] of element.attributes ?? [])
//       encoded.push(intern(name), intern(value));
//     attributes.push(encoded);
//   }
//   return {
//     strings,
//     documents: [
//       {
//         documentURL: 0,
//         baseURL: 1,
//         nodes: {
//           nodeType,
//           nodeName,
//           nodeValue,
//           parentIndex,
//           attributes,
//           backendNodeId,
//         },
//         svgNodeKinds,
//       },
//     ],
//   };
// };
//
// const captureSvg = (value: ReturnType<typeof svgDocument>) => {
//   const kinds = new Map(
//     value.documents.flatMap((document) => [...document.svgNodeKinds]),
//   );
//   const capture = captureDom(value, new Set([origin]), input);
//   let step = capture.next();
//   while (!step.done) {
//     step = capture.next(
//       step.value.map((query) =>
//         kinds.get(`${String(query.backendNodeId)}:${query.nodeName}`),
//       ),
//     );
//   }
//   return step.value;
// };
//
// const urlFor = (
//   result: ReturnType<typeof captureSvg>,
//   nodeIndex: number,
// ): (typeof result.urls)[number] | undefined =>
//   result.urls.find((url) => url.node_index === nodeIndex);
//
// describe("browser SVG identity", () => {
//   const query = { backendNodeId: 42, nodeName: "a" };
//   const node = { ...query, nodeType: 1 };
//
//   it("uses only a matching described element's SVG flag", () => {
//     expect(capturedSvgNodeKind(query, { node: { ...node, isSVG: true } })).toBe(
//       true,
//     );
//     expect(
//       capturedSvgNodeKind(query, { node: { ...node, isSVG: false } }),
//     ).toBe(false);
//     expect(capturedSvgNodeKind(query, { node })).toBe(false);
//     for (const invalid of [
//       {},
//       { node: { ...node, backendNodeId: 43, isSVG: true } },
//       { node: { ...node, nodeName: "A", isSVG: true } },
//       { node: { ...node, nodeType: 3, isSVG: true } },
//       { node: { ...node, isSVG: "true" } },
//     ])
//       expect(capturedSvgNodeKind(query, invalid)).toBeUndefined();
//   });
//
//   it("distinguishes identically named SVG and MathML elements regardless of parent", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "svg", parent: 0 },
//         { name: "desc", parent: 1 },
//         {
//           name: "a",
//           svg: true,
//           parent: 2,
//           attributes: [["xlink:href", "/svg"]],
//         },
//         {
//           name: "a",
//           svg: false,
//           parent: 2,
//           attributes: [["xlink:href", "/math"]],
//         },
//         {
//           name: "A",
//           svg: false,
//           parent: 1,
//           attributes: [["xlink:href", "/html"]],
//         },
//         {
//           name: "a",
//           svg: true,
//           parent: 0,
//           attributes: [["xlink:href", "/orphan"]],
//         },
//       ]),
//     );
//     expect(result.urls.map(({ url }) => url)).toEqual([
//       `${origin}/svg`,
//       `${origin}/orphan`,
//     ]);
//   });
//
//   it("records unresolved identity without inventing a destination or hiding attributes", () => {
//     const value = svgDocument([
//       { name: "a", parent: 0, attributes: [["xlink:href", "/unknown"]] },
//     ]);
//     const completeness = new CdpCaptureCompleteness();
//     const capture = captureDom(value, new Set([origin]), input, completeness);
//     expect(capture.next()).toEqual({
//       done: false,
//       value: [{ backendNodeId: 2, nodeName: "a" }],
//     });
//     const step = capture.next([undefined]);
//     expect(step.done).toBe(true);
//     if (!step.done) throw new Error("Unexpected second query");
//     expect(step.value.unresolvedSvgNodes).toBe(1);
//     expect(step.value.urls).toEqual([]);
//     expect(step.value.nodes[1]?.attribute_names).toEqual(["xlink:href"]);
//     expect(completeness.snapshot().excluded).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           section: "metadata",
//           reason: "provider_unavailable",
//           count: 1,
//         }),
//       ]),
//     );
//   });
// });
//
// it("keeps batched SVG identities aligned around missing IDs and ordinary links", () => {
//   const value = svgDocument([
//     { name: "a", parent: 0, attributes: [["xlink:href", "/svg"]] },
//     { name: "A", parent: 0, attributes: [["href", "/ordinary"]] },
//     { name: "a", parent: 0, attributes: [["xlink:href", "/missing-id"]] },
//     { name: "a", parent: 0, attributes: [["xlink:href", "/non-svg"]] },
//   ]);
//   const completeness = new CdpCaptureCompleteness();
//   const capture = captureDom(
//     {
//       ...value,
//       documents: value.documents.map((document) => ({
//         ...document,
//         nodes: { ...document.nodes, backendNodeId: [1, 2, 3, null, 5] },
//       })),
//     },
//     new Set([origin]),
//     input,
//     completeness,
//   );
//   expect(capture.next()).toEqual({
//     done: false,
//     value: [
//       { backendNodeId: 2, nodeName: "a" },
//       { backendNodeId: 5, nodeName: "a" },
//     ],
//   });
//   const step = capture.next([true, false]);
//   if (!step.done) throw new Error("Unexpected second batch");
//   expect(
//     step.value.urls.map(({ node_index, url }) => [node_index, url]),
//   ).toEqual([
//     [1, `${origin}/svg`],
//     [2, `${origin}/ordinary`],
//   ]);
//   expect(step.value.unresolvedSvgNodes).toBe(1);
//   expect(completeness.snapshot().excluded).toContainEqual({
//     section: "metadata",
//     reason: "provider_unavailable",
//     count: 1,
//   });
// });
//
// describe("SVG xlink:href destinations", () => {
//   it("reports an SVG anchor that only has xlink:href, keeping the first value", () => {
//     const result = captureSvg(
//       svgDocument([
//         { name: "svg", parent: 0 },
//         { name: "g", parent: 1 },
//         {
//           name: "a",
//           svg: true,
//           parent: 2,
//           attributes: [
//             ["xlink:href", "/xl-s2h"],
//             ["xlink:href", "/later"],
//           ],
//         },
//       ]),
//     );
//     expect(result.nodes[3]?.attribute_names).toEqual(["xlink:href"]);
//     expect(result.urls).toEqual([
//       {
//         node_index: 3,
//         attribute: "href",
//         url: `${origin}/xl-s2h`,
//         destination_scope: "approved",
//       },
//     ]);
//   });
//
//   it.each([
//     ["xlink:href", "href"],
//     ["href", "xlink:href"],
//   ] as const)(
//     "uses href when an SVG anchor also has xlink:href (%s then %s)",
//     (first, second) => {
//       const valueFor = (name: string): string =>
//         name === "href" ? "/href-wins" : "/xlink-loses";
//       const result = captureSvg(
//         svgDocument([
//           { name: "svg", parent: 0 },
//           {
//             name: "a",
//             svg: true,
//             parent: 1,
//             attributes: [
//               [first, valueFor(first)],
//               [second, valueFor(second)],
//             ],
//           },
//         ]),
//       );
//       expect(result.urls).toEqual([
//         {
//           node_index: 2,
//           attribute: "href",
//           url: `${origin}/href-wins`,
//           destination_scope: "approved",
//         },
//       ]);
//     },
//   );
//
//   it("does not report xlink:href on an HTML anchor or a MathML element", () => {
//     const result = captureSvg(
//       svgDocument([
//         {
//           name: "A",
//           svg: false,
//           parent: 0,
//           attributes: [["xlink:href", "/xl-html"]],
//         },
//         { name: "math", parent: 0 },
//         {
//           name: "mrow",
//           svg: false,
//           parent: 2,
//           attributes: [["xlink:href", "/xl-math"]],
//         },
//         { name: "svg", parent: 0 },
//         {
//           name: "a",
//           svg: true,
//           parent: 4,
//           attributes: [["xlink:href", "/xl-s2h"]],
//         },
//       ]),
//     );
//     expect(result.nodes[1]?.attribute_names).toEqual(["xlink:href"]);
//     expect(result.nodes[3]?.attribute_names).toEqual(["xlink:href"]);
//     expect(urlFor(result, 1)).toBeUndefined();
//     expect(urlFor(result, 3)).toBeUndefined();
//     expect(urlFor(result, 5)?.url).toBe(`${origin}/xl-s2h`);
//   });
//
//   it("classifies an SVG xlink:href outside the allowed origins as outside_policy", () => {
//     const result = captureSvg(
//       svgDocument([
export const _l = 314;

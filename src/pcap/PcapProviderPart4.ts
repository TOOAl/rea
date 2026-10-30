export const __stub = 1;
//                   captured_output: {
//                     ...(capturedOutput ?? pendingCommand.capturedOutput),
//                   },
//                 }),
//           },
//           {
//             operation: request.operation,
//             ...(partialObservation === undefined ? {} : { partialObservation }),
//           },
//         ),
//       );
//     }
//     return result;
//   }
//
//   private async inspectCapture(
//     selection: PcapToolSelection,
//     snapshot: PcapSnapshot,
//     path: string,
//     identity: { bytes: number; sha256: string },
//     signal: AbortSignal | undefined,
//     request: PcapRequest,
//     provider: {
//       readonly id: string;
//       readonly name: string;
//       readonly version: string | null;
//     },
//     client: unknown,
//   ) {
//     const info = await this.run(
//       "inspect_pcap_capture",
//       selection.capinfos.command,
//       ["-M", "--", snapshot.path],
//       { timeoutMs: 60_000, maxOutputBytes: 64 * 1024 },
//       signal,
//       snapshot,
//       path,
//     );
//     const metadata = parseCapinfosOutput(info.stdout);
//     if (metadata.sha256 !== null && metadata.sha256 !== identity.sha256)
//       throw new AnalysisProtocolError(
//         "capinfos SHA256 disagrees with the owned capture snapshot",
//       );
//     if (info.cleanup !== undefined)
//       throw pcapCommandCleanupError(
//         request.operation,
//         snapshot.path,
//         info.cleanup,
//         info,
//         pcapPartialEvidence(
//           request,
//           provider,
//           path,
//           identity,
//           {
//             client,
//             target: { path, ...identity },
//             stage: "capinfos-complete-tshark-not-run",
//             file_type: metadata.fileType,
//             encapsulation: metadata.encapsulation,
//             packet_count: metadata.packetCount,
//             capture_start: metadata.captureStart,
//             capture_end: metadata.captureEnd,
//             capture_duration_seconds: metadata.captureDurationSeconds,
//             snapshot_length: metadata.snapshotLength,
//           },
//           [
//             "capinfos output was parsed from a complete bounded stream, but process-tree cleanup remains unconfirmed; tshark was not run",
//           ],
//         ),
//       );
//     const dissected = await this.run(
//       "inspect_pcap_capture",
//       selection.tshark.command,
//       [
//         "-n",
//         "-r",
//         snapshot.path,
//         "-T",
//         "json",
//         "--no-duplicate-keys",
//         `--temp-dir=${snapshot.configurationPath}`,
//         ...FIELDS.flatMap((field) => ["-e", field]),
//       ],
//       { timeoutMs: 300_000, maxOutputBytes: TSHARK_JSON_MAX_BYTES },
//       signal,
//       snapshot,
//       path,
//     );
//     const fields = await parseTsharkJsonOutput(dissected.stdout, signal);
//     await snapshot.verify(identity, path, signal);
//     if (fields.packetCount !== metadata.packetCount)
//       throw new AnalysisProtocolError(
//         `capinfos counted ${String(metadata.packetCount)} packets but tshark returned ${String(fields.packetCount)}`,
//       );
//     const captured = {
//       result: {
//         target: { path, ...identity },
//         file_type: metadata.fileType,
//         encapsulation: metadata.encapsulation,
//         packet_count: metadata.packetCount,
//         capture_start: metadata.captureStart,
//         capture_end: metadata.captureEnd,
//         capture_duration_seconds: metadata.captureDurationSeconds,
//         diagnostics: {
//           capinfos_stderr: info.stderr,
//           tshark_stderr: dissected.stderr,
//         },
//         snapshot_length: metadata.snapshotLength,
//         endpoints: fields.endpoints,
//         endpoint_count: fields.endpointCount,
//         dns_queries: fields.dnsQueries,
//         dns_query_count: fields.dnsQueryCount,
//         tls_sni_values: fields.tlsSniValues,
//         tls_sni_count: fields.tlsSniCount,
//         protocol_distribution: fields.protocolDistribution,
//         protocol_count: fields.protocolCount,
//         http_request_uris: fields.httpRequestUris,
//         http_request_uri_count: fields.httpRequestUriCount,
//         http_uri_redaction_count: fields.httpUriRedactionCount,
//         unattributed_dns_addresses: fields.unattributedDnsAddresses,
//         unattributed_dns_address_count: fields.unattributedDnsAddressCount,
//         unattributed_dns_packet_count: fields.unattributedDnsPackets,
//         coverage: fields.partial ? "partial" : "complete",
//       },
//       limitations: [
//         ...this.nativeLimitations,
//         "Both tools read one owned snapshot; target identity comes from its admitted source descriptor",
//         "DNS address values are associated only with a single question in the same response packet; values may include additional DNS records, not only final resolution answers",
//         "Only bytes present in the saved capture are examined; encryption and capture truncation can hide higher-level fields",
//         ...(fields.partial
//           ? [
//               "One or more projected categories were capped, credential-bearing URIs were omitted or coalesced, or DNS address attribution remains unresolved; counts retain the examined totals",
//             ]
//           : []),
//         ...(fields.httpUriRedactionCount > 0
//           ? [
//               "HTTP transport credentials were excluded; ambiguous credential spans cause the URI to be omitted",
//             ]
//           : []),
//         ...(fields.unattributedDnsPackets > 0
//           ? [
//               `DNS address attribution was unresolved in ${String(fields.unattributedDnsPackets)} packet(s); unattributed addresses are retained separately`,
//             ]
//           : []),
//       ],
//     };
//     if (dissected.cleanup !== undefined) {
//       const full = pcapResultSchemas.inspect_pcap_capture.parse({
//         client,
//         ...captured.result,
//       });
//       throw pcapCommandCleanupError(
//         request.operation,
//         snapshot.path,
//         dissected.cleanup,
//         dissected,
//         pcapPartialEvidence(
//           request,
//           provider,
//           path,
//           identity,
//           full,
//           captured.limitations,
//         ),
//       );
//     }
//     return captured;
//   }
// }
export const _l = 170;

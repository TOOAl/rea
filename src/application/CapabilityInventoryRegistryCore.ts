import { sqliteDatabaseCapability } from "./sqlite/SqliteDatabaseCapability.js";

import type { ToolKind } from "../contracts/toolContractTypes.js";

// CapabilityInventoryRegistry.ts 345-750
const workflowAvailabilityFor = ({
  name,
  kind,
  policy,
}: AvailabilityContext): Availability | null => {
  if (
    name === "inspect_go_binary" ||
    name === "inspect_rust_binary" ||
    name === "inspect_electron_fuses"
  )
    return { reason: "available", remediation: null };
  if (name === "inspect_sqlite_database") {
    const capability = sqliteDatabaseCapability(process.versions.node);
    return capability.available
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_unavailable",
          remediation: capability.reason,
        };
  }
  if (name === "trace_web_module_imports")
    return {
      reason: "available",
      remediation: null,
      defaultModeAvailable: policy.webModuleResolutionEnabled === true,
      modes: [
        {
          name: "sources-without-literal-imports",
          available: true,
          missing_operations: [],
          remediation: null,
        },
        policy.webModuleResolutionEnabled === true
          ? {
              name: "native-literal-resolution",
              available: true,
              missing_operations: [],
              remediation: null,
            }
          : {
              name: "native-literal-resolution",
              available: false,
              missing_operations: ["native-module-resolver"],
              remediation:
                "Provide an absolute REA_BROWSER_EXECUTABLE supporting import.meta.resolve; no binary target is required.",
            },
      ],
    };
  if (name === "recover_javascript_sources")
    return policy.javascriptRecoveryEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux x64, provide an absolute REA_WAKARU_COMMAND for Wakaru ^1.13.0 (verified with 1.14.0) and util-linux prlimit; see docs/javascript-recovery.md#install-wakaru. No binary target is required.",
        };
  if (name === "inspect_binary_layout")
    return policy.binaryLayoutEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux x64, set absolute REA_PWNTOOLS_PYTHON to caller-supplied Python with pwntools 4.15.0. No active binary target is required.",
        };
  if (name === "inspect_packet_capture" || name === "inspect_packet_fields")
    return policy.packetCaptureEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux, supply TShark 4.x via absolute REA_TSHARK_COMMAND and util-linux prlimit (REA_TSHARK_PRLIMIT_COMMAND, default /usr/bin/prlimit). No active binary target or hardware is required; the tool is checked at execution.",
        };
  if (name === "decode_signal_recording" || name === "inspect_signal_decoders")
    return policy.signalRecordingEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux, supply sigrok-cli 0.7.2 via absolute REA_SIGROK_COMMAND and util-linux prlimit (REA_SIGROK_PRLIMIT_COMMAND, default /usr/bin/prlimit). No active binary target or hardware is required; the tool is checked at execution.",
        };
  if (name === "inspect_wasm_artifact")
    return policy.wasmArtifactEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "Supply WABT 1.0.42 via absolute REA_WABT_BIN_DIRECTORY. No active binary target is required; tools are checked at execution.",
        };
  if (name === "inspect_pe_resources")
    return { reason: "available", remediation: null };
  if (name === "inspect_evm_interface")
    return policy.evmInterfaceEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "The bundled offline EVM interface profile is currently real-verified on Linux x64. No active binary target or chain endpoint is required.",
        };
  if (name === "inspect_recorded_crash")
    return policy.recordedCrashEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux x64, set absolute REA_PWNTOOLS_PYTHON to caller-supplied Python with pwntools 4.15.0. No active binary target is required.",
        };
  if (kind === "firmware-provider") {
    const enabled =
      name === "inspect_firmware_regions"
        ? policy.firmwareInspectionEnabled
        : policy.firmwareExtractionEnabled;
    return enabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "On Linux, provide an absolute REA_BINWALK_COMMAND (Binwalk 3.1.x, verified with 3.1.0) or REA_UNBLOB_COMMAND (Unblob 26.6.x, verified with 26.6.4) path and util-linux prlimit. Extraction also requires the selected format’s external extractor.",
        };
  }
  if (kind === "android-provider")
    return policy.androidAnalysisAvailability?.status === "available"
      ? { reason: "available", remediation: null }
      : {
          reason:
            policy.androidAnalysisAvailability?.code === "unsupported_host"
              ? "unsupported_host"
              : policy.androidAnalysisAvailability?.code ===
                  "runtime_unavailable"
                ? "provider_unavailable"
                : "provider_missing",
          remediation:
            policy.androidAnalysisAvailability?.reason ??
            "Set REA_JADX_MCP_JAR to a caller-supplied jadx-headless-mcp 0.7.1 JAR and provide a full JDK on Linux, macOS, or Windows x64 with its matching bundled native controls.",
        };
  if (kind === "adb-provider")
    return ownerProbeAvailability(
      policy.adbAnalysisAvailability,
      "Set REA_ADB_PATH to a caller-supplied adb executable or make adb available on PATH. This checks the client version only; device and serial availability depend on the request.",
    );
  if (kind === "apktool-provider")
    return ownerProbeAvailability(
      policy.apktoolAnalysisAvailability,
      "Set REA_APKTOOL_COMMAND to a caller-supplied Apktool executable or make Apktool 2.7.0 or newer available on PATH.",
    );
  if (kind === "jeb-provider") {
    const availability = policy.jebAnalysisAvailability;
    if (availability?.status === "available")
      return availability.supportedOperations.some(
        (operation) => operation === name,
      )
        ? { reason: "available", remediation: null }
        : {
            reason: "provider_unavailable",
            remediation: `The running JEB endpoint does not advertise support for ${name}. Use a JEB client build that provides this operation.`,
          };
    return ownerProbeAvailability(
      availability,
      "Start a JEB client serving MCP (GUI client, or headless via its programmatic launcher) and point REA_JEB_MCP_URL at it (default http://127.0.0.1:8425/mcp). REA does not install or launch JEB.",
    );
  }
  const browser = browserProviderAvailability(name, kind, policy);
  if (browser !== null) return browser;
  if (name === "capture_process_scenario" && !policy.processCaptureEnabled)
    return {
      reason: "unsupported_host",
      remediation: "Run process capture on a supported Linux or macOS host.",
    };
  if (kind === "application") return { reason: "available", remediation: null };
  if (kind === "pcap-provider" || kind === "flutter-provider")
    return { reason: "available", remediation: null };
  const electron = electronProviderAvailability(name, kind, policy);
  if (electron !== null) return electron;
  if (kind === "runtime-provider")
    return policy.v8InspectorObservationEnabled === true
      ? { reason: "available", remediation: null }
      : {
          reason: "provider_missing",
          remediation:
            "Start REA with its JavaScript runtime provider available.",
        };
  if (kind === "session") return { reason: "available", remediation: null };
  return null;
};

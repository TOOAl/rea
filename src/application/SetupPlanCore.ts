import { classifyClientRegistrationCommand } from "./ClientRegistrationIdentity.js";
import {
  linuxHopperInstallDisclosure,
  type LinuxPackageFamily,
} from "./LinuxHopper.js";
import type { SkillDestination } from "./SetupSkill.js";
import { macHopperInstallDisclosure } from "./MacHopper.js";
import { macHopperUserApplicationPath } from "./MacHopperPaths.js";
import type {
  ClientConfigurationInspection,
  SetupAction,
  SetupClientState,
  SetupHost,
  SetupProviderEnvironment,
} from "./SetupTypes.js";
import {
  appDataRedirection,
  registrationPersistenceDetail,
  type SetupClient,
} from "./SupportedClients.js";
import { redirectedWriteBlocker } from "./MsixPackageStorage.js";
import type { DoctorReport } from "./Doctor.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
import { CURRENT_ENTRYPOINT_PATH } from "../process/CurrentEntrypointPath.js";

/** Read-only setup facts shared by client selection and preflight. */
export interface SetupDiscovery {
  readonly initialDoctor: Awaited<ReturnType<SetupHost["doctor"]>>;
  readonly installHopper: boolean;
  readonly clients: readonly SetupClient[];
  readonly detectedClientIds: readonly string[];
  readonly defaultClientIds: readonly string[];
  readonly clientStates: readonly SetupClientState[];
  readonly linuxPackageFamily?: LinuxPackageFamily;
}

/** Discover supported clients and current registrations without mutation. */
export const discoverSetupState = async (input: {
  readonly host: SetupHost;
  readonly providerConfigured: boolean;
  readonly forceHopperInstall: boolean;
  readonly hopperLauncherConfigured?: boolean;
  readonly proposeHopper: boolean;
  readonly initialDoctor: DoctorReport;
}): Promise<SetupDiscovery> => {
  const { initialDoctor } = input;
  const linuxHopperRepairNeeded =
    input.hopperLauncherConfigured !== true &&
    initialDoctor.checks.some(
      ({ name, ok, detail }) =>
        !ok &&
        (name === "hopper-demo-runtime" ||
          (name === "hopper-version" && detail === "/opt/hopper/bin/Hopper")),
    );
  const linuxDistribution =
    input.host.platform === "linux"
      ? await input.host.linuxDistribution()
      : undefined;
  const hopperInstallSupported =
    (input.host.platform === "darwin" &&
      majorVersion((await input.host.macosVersion()) ?? "0") >= 12) ||
    (input.host.platform === "linux" &&
      linuxDistribution?.hopperSetupSupported === true);
  const installHopper =
    input.forceHopperInstall ||
    (hopperInstallSupported &&
      input.proposeHopper &&
      (!input.providerConfigured || linuxHopperRepairNeeded));
  const [clients, detectedClients] = await Promise.all([
    input.host.supportedClients(),
    input.host.detectedClients(),
  ]);
  const detectedIds = new Set(detectedClients.map(({ name }) => name));
  const registrations = initialDoctor.identity?.registrations ?? [];
  const registrationByClient = new Map(
    registrations.map((registration) => [registration.client, registration]),
  );
  const clientStates = clients.map((client): SetupClientState => {
    const registration = registrationByClient.get(client.name);
    const commandIdentity =
      registration === undefined
        ? undefined
        : classifyClientRegistrationCommand(
            registration.command,
            CURRENT_ENTRYPOINT_PATH,
          );
    const ownedRegistration =
      (registration?.state === "aligned" || registration?.state === "stale") &&
      commandIdentity === "owned";
    const configured = ownedRegistration;
    const status: SetupClientState["status"] =
      registration?.state === "invalid"
        ? "invalid"
        : registration?.state === "unknown" || commandIdentity === "unknown"
          ? "unknown"
          : ownedRegistration && registration.state === "aligned"
            ? "configured"
            : ownedRegistration && registration.state === "stale"
              ? "needs_configuration"
              : detectedIds.has(client.name)
                ? "needs_configuration"
                : "missing";
    return {
      client,
      detected: detectedIds.has(client.name),
      configured,
      status,
    };
  });
  const defaultClientIds = registrations
    .filter(
      (registration) =>
        (registration.state === "aligned" || registration.state === "stale") &&
        classifyClientRegistrationCommand(
          registration.command,
          CURRENT_ENTRYPOINT_PATH,
        ) === "owned",
    )
    .map(({ client }) => client);
  return {
    initialDoctor,
    installHopper,
    clients,
    detectedClientIds: [...detectedIds],
    defaultClientIds,
    clientStates,
    ...(linuxDistribution?.packageFamily === undefined
      ? {}
      : { linuxPackageFamily: linuxDistribution.packageFamily }),
  };
};

/** Preflight exactly the selected clients and produce their concrete actions. */

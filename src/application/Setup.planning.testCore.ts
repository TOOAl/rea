import { describe, expect, it } from "vitest";

import { runSetup } from "./Setup.js";
import type { SetupProgressEvent } from "./SetupTypes.js";
import { FakeSetupHost, options } from "./Setup.fixture.js";
import { SetupSkillInstallError } from "./SetupSkill.js";
import { err, ok } from "../domain/result.js";
import { HopperReleaseError } from "./HopperReleaseFeed.js";


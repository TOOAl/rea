import type {
  PlanReadinessFinding,
  PreparationPlanReadiness,
  PreparationPlanStatus,
  ToolBoundary,
  ToolCapabilityCatalog,
  ToolCostClass,
  ToolExecutionPolicy,
} from "./planning-types.js";

const REQUIRED_CRITERIA = [
  "capability-fit",
  "permission-policy",
  "privacy-security",
  "cost",
  "environment-compatibility",
  "provenance-auditability",
  "output-validation",
] as const;
const ALL_CRITERIA = new Set<string>([...REQUIRED_CRITERIA, "reproducibility", "reliability"]);
const BOUNDARIES = new Set(["local", "external"]);
const COST_CLASSES = new Set(["free", "paid", "unknown"]);

interface Findings {
  missingInformation: PlanReadinessFinding[];
  invalidInputs: PlanReadinessFinding[];
  selectionIssues: PlanReadinessFinding[];
  policyIssues: PlanReadinessFinding[];
}

type AnyRecord = Record<string, unknown>;
type CatalogEntry = ToolCapabilityCatalog["entries"][number];

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function add(
  target: PlanReadinessFinding[],
  code: PlanReadinessFinding["code"],
  path: string,
  message: string,
): void {
  target.push({ code, path, message });
}

function record(value: unknown, path: string, findings: Findings): AnyRecord | undefined {
  if (isRecord(value)) return value;
  add(
    value === undefined ? findings.missingInformation : findings.invalidInputs,
    value === undefined ? "missing-information" : "invalid-input",
    path,
    `${path}는 객체여야 합니다.`,
  );
  return undefined;
}

function text(value: unknown, path: string, findings: Findings): string | undefined {
  if (typeof value !== "string") {
    add(
      value === undefined ? findings.missingInformation : findings.invalidInputs,
      value === undefined ? "missing-information" : "invalid-input",
      path,
      `${path}는 문자열이어야 합니다.`,
    );
    return undefined;
  }
  const normalized = value.normalize("NFC").trim();
  if (!normalized) {
    add(findings.missingInformation, "missing-information", path, `${path}가 비어 있습니다.`);
    return undefined;
  }
  return normalized;
}

function textField(
  item: AnyRecord,
  key: string,
  path: string,
  findings: Findings,
): string | undefined {
  return text(item[key], path, findings);
}

function requiredFields(
  item: AnyRecord,
  keys: readonly string[],
  path: string,
  findings: Findings,
): void {
  for (const key of keys) textField(item, key, `${path}.${key}`, findings);
}

function array(
  value: unknown,
  path: string,
  findings: Findings,
  allowEmpty: boolean,
): unknown[] | undefined {
  if (!Array.isArray(value)) {
    add(
      value === undefined ? findings.missingInformation : findings.invalidInputs,
      value === undefined ? "missing-information" : "invalid-input",
      path,
      `${path}는 배열이어야 합니다.`,
    );
    return undefined;
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!(index in value)) {
      add(
        findings.invalidInputs,
        "invalid-input",
        `${path}[${index}]`,
        "배열에 비어 있는 항목이 있습니다.",
      );
    }
  }
  if (!allowEmpty && value.length === 0) {
    add(findings.missingInformation, "missing-information", path, `${path} 항목이 필요합니다.`);
  }
  return value;
}

function stringList(
  value: unknown,
  path: string,
  findings: Findings,
  allowEmpty: boolean,
): string[] | undefined {
  const items = array(value, path, findings, allowEmpty);
  if (!items) return undefined;
  const result: string[] = [];
  items.forEach((item, index) => {
    const entry = text(item, `${path}[${index}]`, findings);
    if (entry !== undefined) result.push(entry);
  });
  return result;
}

function ids(items: Array<{ id?: string }>, path: string, findings: Findings): Set<string> {
  const result = new Set<string>();
  items.forEach((item, index) => {
    if (!item.id) return;
    if (result.has(item.id)) {
      add(
        findings.invalidInputs,
        "duplicate-id",
        `${path}[${index}].id`,
        `ID '${item.id}'가 중복되었습니다.`,
      );
    }
    result.add(item.id);
  });
  return result;
}

function parsePolicy(raw: unknown, findings: Findings): ToolExecutionPolicy | undefined {
  const item = record(raw, "policy", findings);
  if (!item) return undefined;
  const rawBoundaries = array(item.allowedBoundaries, "policy.allowedBoundaries", findings, true);
  const allowedBoundaries: ToolBoundary[] = [];
  rawBoundaries?.forEach((boundary, index) => {
    if (typeof boundary === "string" && BOUNDARIES.has(boundary)) {
      allowedBoundaries.push(boundary as ToolBoundary);
    } else {
      add(
        findings.invalidInputs,
        "invalid-input",
        `policy.allowedBoundaries[${index}]`,
        "허용 경계는 local 또는 external이어야 합니다.",
      );
    }
  });
  const approvedToolIds = stringList(
    item.approvedToolIds,
    "policy.approvedToolIds",
    findings,
    true,
  );
  if (approvedToolIds && new Set(approvedToolIds).size !== approvedToolIds.length) {
    add(
      findings.invalidInputs,
      "duplicate-id",
      "policy.approvedToolIds",
      "별도 도구 승인 목록에 중복 ID가 있습니다.",
    );
  }
  for (const key of ["allowPaidTools", "executionAuthorized"] as const) {
    if (typeof item[key] !== "boolean") {
      add(
        item[key] === undefined ? findings.missingInformation : findings.invalidInputs,
        item[key] === undefined ? "missing-information" : "invalid-input",
        `policy.${key}`,
        `policy.${key}는 boolean이어야 합니다.`,
      );
    }
  }
  if (
    approvedToolIds === undefined ||
    typeof item.allowPaidTools !== "boolean" ||
    typeof item.executionAuthorized !== "boolean"
  ) {
    return undefined;
  }
  return {
    allowedBoundaries,
    allowPaidTools: item.allowPaidTools,
    approvedToolIds,
    executionAuthorized: item.executionAuthorized,
  };
}

function parseCatalog(raw: unknown, findings: Findings): Map<string, CatalogEntry> {
  const item = record(raw, "toolCatalog", findings);
  if (!item) return new Map();
  textField(item, "revision", "toolCatalog.revision", findings);
  const rawEntries = array(item.entries, "toolCatalog.entries", findings, true);
  const entries: CatalogEntry[] = [];
  rawEntries?.forEach((value, index) => {
    const path = `toolCatalog.entries[${index}]`;
    const entry = record(value, path, findings);
    if (!entry) return;
    const id = textField(entry, "id", `${path}.id`, findings);
    const label = textField(entry, "label", `${path}.label`, findings);
    const capabilities = stringList(entry.capabilities, `${path}.capabilities`, findings, false);
    const verificationRefs = stringList(
      entry.verificationRefs,
      `${path}.verificationRefs`,
      findings,
      false,
    );
    if (verificationRefs && verificationRefs.length < 2) {
      add(
        findings.missingInformation,
        "missing-information",
        `${path}.verificationRefs`,
        "프로필에 구현 경로와 테스트 경로가 필요합니다.",
      );
    }
    const boundary = entry.boundary;
    const costClass = entry.costClass;
    if (typeof boundary !== "string" || !BOUNDARIES.has(boundary)) {
      add(
        boundary === undefined ? findings.missingInformation : findings.invalidInputs,
        boundary === undefined ? "missing-information" : "invalid-input",
        `${path}.boundary`,
        "도구 경계는 local 또는 external이어야 합니다.",
      );
    }
    if (typeof costClass !== "string" || !COST_CLASSES.has(costClass)) {
      add(
        costClass === undefined ? findings.missingInformation : findings.invalidInputs,
        costClass === undefined ? "missing-information" : "invalid-input",
        `${path}.costClass`,
        "비용 분류는 free, paid 또는 unknown이어야 합니다.",
      );
    }
    if (
      id !== undefined &&
      label !== undefined &&
      capabilities !== undefined &&
      verificationRefs !== undefined &&
      typeof boundary === "string" &&
      BOUNDARIES.has(boundary) &&
      typeof costClass === "string" &&
      COST_CLASSES.has(costClass)
    ) {
      entries.push({
        id,
        label,
        capabilities,
        boundary: boundary as ToolBoundary,
        costClass: costClass as ToolCostClass,
        verificationRefs,
      });
    }
  });
  const entryIds = ids(entries, "toolCatalog.entries", findings);
  return new Map(
    entries.filter((entry) => entryIds.has(entry.id)).map((entry) => [entry.id, entry]),
  );
}

function statusOf(findings: Findings): PreparationPlanStatus {
  if (findings.invalidInputs.length > 0) return "invalid";
  if (
    findings.selectionIssues.some((finding) => finding.code === "tool-ineligible") ||
    findings.policyIssues.some((finding) => finding.code === "policy-blocked")
  ) {
    return "blocked";
  }
  if (findings.missingInformation.length > 0) return "needs-information";
  if (findings.selectionIssues.length > 0) return "needs-tool-selection";
  return "ready";
}

/** Inspect supplied data only. It never discovers or executes tools. */
export function inspectPreparationPlanReadiness(
  rawPlan: unknown,
  rawPolicy: unknown,
  rawToolCatalog?: unknown,
): PreparationPlanReadiness {
  const findings: Findings = {
    missingInformation: [],
    invalidInputs: [],
    selectionIssues: [],
    policyIssues: [],
  };
  const policy = parsePolicy(rawPolicy, findings);
  const plan = record(rawPlan, "plan", findings);
  if (!plan) {
    const status = statusOf(findings);
    return { status, planningComplete: false, toolExecutionPermitted: false, ...findings };
  }

  const task = record(plan.task, "task", findings);
  if (task) requiredFields(task, ["question", "objective", "scope", "timeScope"], "task", findings);

  const rawNeeds = array(plan.informationNeeds, "informationNeeds", findings, false);
  const needs: Array<AnyRecord & { id?: string }> = [];
  rawNeeds?.forEach((value, index) => {
    const path = `informationNeeds[${index}]`;
    const item = record(value, path, findings);
    if (!item) return;
    const id = textField(item, "id", `${path}.id`, findings);
    if (id !== undefined) needs.push({ ...item, id });
    requiredFields(
      item,
      ["question", "purpose", "expectedScope", "expectedTimeScope"],
      path,
      findings,
    );
    if (typeof item.required !== "boolean") {
      add(
        item.required === undefined ? findings.missingInformation : findings.invalidInputs,
        item.required === undefined ? "missing-information" : "invalid-input",
        `${path}.required`,
        `${path}.required는 boolean이어야 합니다.`,
      );
    }
    stringList(item.acceptableEvidenceKinds, `${path}.acceptableEvidenceKinds`, findings, false);
  });
  const needIds = ids(needs, "informationNeeds", findings);

  const collection = record(plan.collectionPlan, "collectionPlan", findings);
  const collectedNeedIds = new Set<string>();
  if (collection) {
    const rawSteps = array(collection.steps, "collectionPlan.steps", findings, false);
    const steps: Array<AnyRecord & { id?: string }> = [];
    rawSteps?.forEach((value, index) => {
      const path = `collectionPlan.steps[${index}]`;
      const step = record(value, path, findings);
      if (!step) return;
      const id = textField(step, "id", `${path}.id`, findings);
      if (id !== undefined) steps.push({ ...step, id });
      requiredFields(step, ["method", "expectedOutput"], path, findings);
      const refs = stringList(
        step.informationNeedIds,
        `${path}.informationNeedIds`,
        findings,
        false,
      );
      refs?.forEach((ref, refIndex) => {
        collectedNeedIds.add(ref);
        if (!needIds.has(ref)) {
          add(
            findings.invalidInputs,
            "unresolved-reference",
            `${path}.informationNeedIds[${refIndex}]`,
            `정보 필요성 '${ref}'를 찾을 수 없습니다.`,
          );
        }
      });
      stringList(step.sourceTypes, `${path}.sourceTypes`, findings, false);
      stringList(step.acceptanceChecks, `${path}.acceptanceChecks`, findings, false);
      stringList(step.verificationSteps, `${path}.verificationSteps`, findings, false);
    });
    ids(steps, "collectionPlan.steps", findings);
    needs.forEach((need) => {
      if (need.required === true && need.id && !collectedNeedIds.has(need.id)) {
        add(
          findings.missingInformation,
          "missing-information",
          "collectionPlan.steps",
          `필수 정보 '${need.id}'의 수집 단계가 필요합니다.`,
        );
      }
    });
    stringList(
      collection.sourceSelectionCriteria,
      "collectionPlan.sourceSelectionCriteria",
      findings,
      false,
    );
    stringList(collection.crossCheckPlan, "collectionPlan.crossCheckPlan", findings, false);
    stringList(collection.stopConditions, "collectionPlan.stopConditions", findings, false);
  }

  const constraints = record(plan.constraints, "constraints", findings);
  if (constraints) {
    if (
      !["public", "internal", "confidential", "sensitive"].includes(
        String(constraints.dataSensitivity),
      )
    ) {
      add(
        constraints.dataSensitivity === undefined
          ? findings.missingInformation
          : findings.invalidInputs,
        constraints.dataSensitivity === undefined ? "missing-information" : "invalid-input",
        "constraints.dataSensitivity",
        "민감도는 public, internal, confidential, sensitive 중 하나여야 합니다.",
      );
    }
    stringList(
      constraints.prohibitedDataHandling,
      "constraints.prohibitedDataHandling",
      findings,
      false,
    );
    stringList(constraints.sourceRequirements, "constraints.sourceRequirements", findings, false);
  }

  const toolPlan = record(plan.toolPlan, "toolPlan", findings);
  if (toolPlan) {
    const rawCapabilities = array(
      toolPlan.requiredCapabilities,
      "toolPlan.requiredCapabilities",
      findings,
      true,
    );
    const capabilities: Array<AnyRecord & { id?: string; capability?: string }> = [];
    rawCapabilities?.forEach((value, index) => {
      const path = `toolPlan.requiredCapabilities[${index}]`;
      const item = record(value, path, findings);
      if (!item) return;
      const id = textField(item, "id", `${path}.id`, findings);
      const capability = textField(item, "capability", `${path}.capability`, findings);
      if (id !== undefined) capabilities.push({ ...item, id, capability });
      requiredFields(item, ["purpose"], path, findings);
    });
    const capabilityIds = ids(capabilities, "toolPlan.requiredCapabilities", findings);
    const requiresTools = (rawCapabilities?.length ?? 0) > 0;

    const rawCriteria = array(toolPlan.criteria, "toolPlan.criteria", findings, true);
    const criteria: Array<AnyRecord & { id?: string; kind?: string }> = [];
    const criterionKinds = new Set<string>();
    rawCriteria?.forEach((value, index) => {
      const path = `toolPlan.criteria[${index}]`;
      const item = record(value, path, findings);
      if (!item) return;
      const id = textField(item, "id", `${path}.id`, findings);
      const kind = item.kind;
      if (typeof kind !== "string" || !ALL_CRITERIA.has(kind)) {
        add(
          kind === undefined ? findings.missingInformation : findings.invalidInputs,
          kind === undefined ? "missing-information" : "invalid-input",
          `${path}.kind`,
          "지원하지 않는 도구 선정 기준입니다.",
        );
      }
      if (id !== undefined)
        criteria.push({ ...item, id, kind: typeof kind === "string" ? kind : undefined });
      if (item.importance !== "required" && item.importance !== "preferred") {
        add(
          item.importance === undefined ? findings.missingInformation : findings.invalidInputs,
          item.importance === undefined ? "missing-information" : "invalid-input",
          `${path}.importance`,
          "중요도는 required 또는 preferred여야 합니다.",
        );
      }
      requiredFields(item, ["acceptanceRule"], path, findings);
      if (typeof kind === "string" && ALL_CRITERIA.has(kind)) {
        if (criterionKinds.has(kind)) {
          add(
            findings.invalidInputs,
            "duplicate-id",
            `${path}.kind`,
            `기준 종류 '${kind}'가 중복되었습니다.`,
          );
        }
        criterionKinds.add(kind);
      }
    });
    const criterionIds = ids(criteria, "toolPlan.criteria", findings);

    const rawCandidates = array(toolPlan.candidates, "toolPlan.candidates", findings, true);
    const candidates: Array<AnyRecord & { id?: string }> = [];
    rawCandidates?.forEach((value, index) => {
      const path = `toolPlan.candidates[${index}]`;
      const item = record(value, path, findings);
      if (!item) return;
      const id = textField(item, "id", `${path}.id`, findings);
      if (id !== undefined) candidates.push({ ...item, id });
    });
    const candidateIds = ids(candidates, "toolPlan.candidates", findings);

    const catalog = requiresTools
      ? parseCatalog(rawToolCatalog, findings)
      : new Map<string, CatalogEntry>();
    if (!requiresTools) {
      textField(toolPlan, "noToolRequiredReason", "toolPlan.noToolRequiredReason", findings);
      if ((rawCriteria?.length ?? 0) > 0 || (rawCandidates?.length ?? 0) > 0) {
        add(
          findings.invalidInputs,
          "invalid-input",
          "toolPlan",
          "도구 불필요 계획에는 후보와 기준이 없어야 합니다.",
        );
      }
      for (const key of ["selectedToolIds", "candidateAssessments", "useSteps"] as const) {
        const values = toolPlan[key];
        if (values !== undefined) {
          const parsed = array(values, `toolPlan.${key}`, findings, true);
          if (parsed && parsed.length > 0) {
            add(
              findings.invalidInputs,
              "invalid-input",
              `toolPlan.${key}`,
              `${key}는 도구 불필요 계획에서 비어 있어야 합니다.`,
            );
          }
        }
      }
    } else {
      if (toolPlan.noToolRequiredReason !== undefined) {
        add(
          findings.invalidInputs,
          "invalid-input",
          "toolPlan.noToolRequiredReason",
          "필요 능력과 도구 불필요 사유를 동시에 지정할 수 없습니다.",
        );
      }
      REQUIRED_CRITERIA.forEach((kind) => {
        const criterion = criteria.find((item) => item.kind === kind);
        if (!criterion || criterion.importance !== "required") {
          add(
            findings.selectionIssues,
            "tool-selection-required",
            "toolPlan.criteria",
            `필수 기준 '${kind}'가 required여야 합니다.`,
          );
        }
      });
      candidates.forEach((candidate, index) => {
        if (rawToolCatalog !== undefined && candidate.id && !catalog.has(candidate.id)) {
          add(
            findings.selectionIssues,
            "tool-ineligible",
            `toolPlan.candidates[${index}].id`,
            `도구 '${candidate.id}'가 활성 catalog에 없거나 코드 선언 프로필이 없습니다.`,
          );
        }
      });

      const selectedList = stringList(
        toolPlan.selectedToolIds,
        "toolPlan.selectedToolIds",
        findings,
        false,
      );
      const selectedIds = new Set(selectedList ?? []);
      if (selectedList && selectedIds.size !== selectedList.length) {
        add(
          findings.invalidInputs,
          "duplicate-id",
          "toolPlan.selectedToolIds",
          "선정 도구 ID가 중복되었습니다.",
        );
      }
      const rationale = text(toolPlan.selectionRationale, "toolPlan.selectionRationale", findings);
      if (!rationale)
        add(
          findings.selectionIssues,
          "tool-selection-required",
          "toolPlan.selectionRationale",
          "선정 이유가 필요합니다.",
        );

      const rawAssessments = array(
        toolPlan.candidateAssessments,
        "toolPlan.candidateAssessments",
        findings,
        false,
      );
      const assessments: Array<AnyRecord & { candidateId?: string }> = [];
      rawAssessments?.forEach((value, index) => {
        const path = `toolPlan.candidateAssessments[${index}]`;
        const item = record(value, path, findings);
        if (!item) return;
        const candidateId = textField(item, "candidateId", `${path}.candidateId`, findings);
        if (candidateId !== undefined) assessments.push({ ...item, candidateId });
        if (candidateId && !candidateIds.has(candidateId)) {
          add(
            findings.invalidInputs,
            "unresolved-reference",
            `${path}.candidateId`,
            `후보 '${candidateId}'를 찾을 수 없습니다.`,
          );
        }
        const rawResults = array(item.criteria, `${path}.criteria`, findings, false);
        const results = new Map<string, string>();
        rawResults?.forEach((rawResult, resultIndex) => {
          const resultPath = `${path}.criteria[${resultIndex}]`;
          const result = record(rawResult, resultPath, findings);
          if (!result) return;
          const criterionId = textField(
            result,
            "criterionId",
            `${resultPath}.criterionId`,
            findings,
          );
          const outcome = result.outcome;
          if (outcome !== "pass" && outcome !== "fail" && outcome !== "unknown") {
            add(
              outcome === undefined ? findings.missingInformation : findings.invalidInputs,
              outcome === undefined ? "missing-information" : "invalid-input",
              `${resultPath}.outcome`,
              "결과는 pass, fail, unknown 중 하나여야 합니다.",
            );
          }
          requiredFields(result, ["basis", "rationale"], resultPath, findings);
          const evidenceRefs = stringList(
            result.evidenceRefs,
            `${resultPath}.evidenceRefs`,
            findings,
            false,
          );
          if (!criterionId || (outcome !== "pass" && outcome !== "fail" && outcome !== "unknown"))
            return;
          if (!criterionIds.has(criterionId)) {
            add(
              findings.invalidInputs,
              "unresolved-reference",
              `${resultPath}.criterionId`,
              `기준 '${criterionId}'를 찾을 수 없습니다.`,
            );
            return;
          }
          if (results.has(criterionId)) {
            add(
              findings.invalidInputs,
              "duplicate-id",
              `${resultPath}.criterionId`,
              `기준 '${criterionId}' 평가가 중복되었습니다.`,
            );
          }
          const criterion = criteria.find((entry) => entry.id === criterionId);
          const profile = candidateId ? catalog.get(candidateId) : undefined;
          if (criterion?.kind === "capability-fit" && profile && evidenceRefs) {
            const refs = new Set(evidenceRefs);
            if (profile.verificationRefs.some((reference) => !refs.has(reference))) {
              add(
                findings.missingInformation,
                "missing-information",
                `${resultPath}.evidenceRefs`,
                "능력 적합성 평가는 catalog의 구현·테스트 참조와 연결되어야 합니다.",
              );
            }
          }
          results.set(criterionId, outcome);
        });
        criteria.forEach((criterion, criterionIndex) => {
          const result = results.get(String(criterion.id));
          const candidateProfile = candidateId ? catalog.get(candidateId) : undefined;
          if (criterion.kind === "capability-fit" && result && candidateProfile) {
            const contributesCapability = capabilities.some(
              (need) =>
                typeof need.capability === "string" &&
                candidateProfile.capabilities.includes(need.capability),
            );
            const computedOutcome = contributesCapability ? "pass" : "fail";
            if (result !== computedOutcome) {
              add(
                findings.invalidInputs,
                "invalid-input",
                `${path}.criteria.${criterion.kind}`,
                `후보 '${candidateId}'의 capability-fit 결과는 활성 catalog로 계산한 '${computedOutcome}'와 일치해야 합니다.`,
              );
            }
          }
          if (!result) {
            add(
              findings.selectionIssues,
              "tool-selection-required",
              `${path}.criteria.${criterion.id ?? criterionIndex}`,
              `후보 '${candidateId ?? "?"}'의 기준 평가가 필요합니다.`,
            );
          } else if (criterion.importance === "required" && result === "unknown") {
            add(
              findings.selectionIssues,
              "tool-selection-required",
              `${path}.criteria.${criterion.kind}`,
              `필수 기준 '${criterion.kind}'를 확인해야 합니다.`,
            );
          } else if (
            selectedIds.has(String(candidateId)) &&
            criterion.importance === "required" &&
            result === "fail"
          ) {
            add(
              findings.selectionIssues,
              "tool-ineligible",
              `${path}.criteria.${criterion.kind}`,
              `선정 후보가 필수 기준 '${criterion.kind}'를 충족하지 못합니다.`,
            );
          }
        });
      });
      const assessedIds = new Set<string>();
      assessments.forEach((assessment, index) => {
        const candidateId = assessment.candidateId;
        if (!candidateId) return;
        if (assessedIds.has(candidateId)) {
          add(
            findings.invalidInputs,
            "duplicate-id",
            `toolPlan.candidateAssessments[${index}].candidateId`,
            `후보 '${candidateId}' 평가가 중복되었습니다.`,
          );
        }
        assessedIds.add(candidateId);
      });
      candidates.forEach((candidate) => {
        if (candidate.id && !assessedIds.has(candidate.id)) {
          add(
            findings.selectionIssues,
            "tool-selection-required",
            `toolPlan.candidateAssessments.${candidate.id}`,
            `후보 '${candidate.id}'의 평가가 필요합니다.`,
          );
        }
      });

      if (selectedIds.size === 0) {
        add(
          findings.selectionIssues,
          "tool-selection-required",
          "toolPlan.selectedToolIds",
          "선정 도구가 필요합니다.",
        );
      }
      selectedIds.forEach((selectedId) => {
        if (!candidateIds.has(selectedId)) {
          add(
            findings.invalidInputs,
            "unresolved-reference",
            "toolPlan.selectedToolIds",
            `선정 후보 '${selectedId}'를 찾을 수 없습니다.`,
          );
          return;
        }
        const profile = catalog.get(selectedId);
        const candidateIndex = candidates.findIndex((candidate) => candidate.id === selectedId);
        const path = `toolPlan.candidates[${candidateIndex}]`;
        if (!profile) return;
        if (policy && !policy.allowedBoundaries.includes(profile.boundary)) {
          add(
            findings.policyIssues,
            "policy-blocked",
            `${path}.boundary`,
            `도구 '${selectedId}'의 실행 경계가 정책에서 허용되지 않습니다.`,
          );
        }
        if (profile.costClass === "paid" && policy && !policy.allowPaidTools) {
          add(
            findings.policyIssues,
            "policy-blocked",
            `${path}.costClass`,
            `도구 '${selectedId}'는 유료이며 정책이 유료 도구를 허용하지 않습니다.`,
          );
        }
        if (profile.costClass === "unknown") {
          add(
            findings.selectionIssues,
            "tool-selection-required",
            `${path}.costClass`,
            `도구 '${selectedId}'의 비용을 확인해야 합니다.`,
          );
        }
        if (policy && !policy.approvedToolIds.includes(selectedId)) {
          add(
            findings.policyIssues,
            "policy-blocked",
            `${path}.id`,
            `도구 '${selectedId}'가 별도 승인 목록에 없습니다.`,
          );
        }
      });

      capabilities.forEach((need) => {
        const neededCapability = need.capability;
        if (typeof neededCapability !== "string") return;
        const covered = [...selectedIds].some((selectedId) =>
          catalog.get(selectedId)?.capabilities.includes(neededCapability),
        );
        if (!covered) {
          add(
            findings.selectionIssues,
            "tool-selection-required",
            `toolPlan.requiredCapabilities.${need.id}`,
            `필요 능력 '${neededCapability}'을 제공하는 선정 도구가 없습니다.`,
          );
        }
      });

      const rawUseSteps = array(toolPlan.useSteps, "toolPlan.useSteps", findings, false);
      const useSteps: Array<AnyRecord & { id?: string }> = [];
      rawUseSteps?.forEach((value, index) => {
        const path = `toolPlan.useSteps[${index}]`;
        const step = record(value, path, findings);
        if (!step) return;
        const id = textField(step, "id", `${path}.id`, findings);
        if (id !== undefined) useSteps.push({ ...step, id });
        const toolId = textField(step, "toolId", `${path}.toolId`, findings);
        const needId = textField(step, "capabilityNeedId", `${path}.capabilityNeedId`, findings);
        requiredFields(
          step,
          [
            "action",
            "inputDescription",
            "expectedOutput",
            "outputVerification",
            "onFailure",
            "stopCondition",
          ],
          path,
          findings,
        );
        if (toolId && !selectedIds.has(toolId)) {
          add(
            findings.invalidInputs,
            "unresolved-reference",
            `${path}.toolId`,
            `도구 '${toolId}'가 선정 목록에 없습니다.`,
          );
        }
        const need = capabilities.find((entry) => entry.id === needId);
        if (needId && !capabilityIds.has(needId)) {
          add(
            findings.invalidInputs,
            "unresolved-reference",
            `${path}.capabilityNeedId`,
            `필요 능력 '${needId}'를 찾을 수 없습니다.`,
          );
        }
        const profile = toolId ? catalog.get(toolId) : undefined;
        if (
          need &&
          typeof need.capability === "string" &&
          profile &&
          !profile.capabilities.includes(need.capability)
        ) {
          add(
            findings.selectionIssues,
            "tool-selection-required",
            `${path}.toolId`,
            `도구 '${toolId}'가 요구 능력 '${need.capability}'를 제공하지 않습니다.`,
          );
        }
      });
      ids(useSteps, "toolPlan.useSteps", findings);
      capabilities.forEach((need) => {
        if (need.id && !useSteps.some((step) => step.capabilityNeedId === need.id)) {
          add(
            findings.missingInformation,
            "missing-information",
            `toolPlan.useSteps.${need.id}`,
            `필요 능력 '${need.capability ?? need.id}'의 사용 단계가 필요합니다.`,
          );
        }
      });
      stringList(toolPlan.fallbackPlan, "toolPlan.fallbackPlan", findings, false);
    }
  }

  if (policy && !policy.executionAuthorized) {
    add(
      findings.policyIssues,
      "execution-not-authorized",
      "policy.executionAuthorized",
      "계획은 준비됐지만 도구 실행 승인은 별도입니다.",
    );
  }
  const status = statusOf(findings);
  return {
    status,
    planningComplete: status === "ready",
    toolExecutionPermitted: status === "ready" && policy?.executionAuthorized === true,
    ...findings,
  };
}

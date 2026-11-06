import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCandidateAuditTasks } from "./evidence-judgment-audit-dataset.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const datasetRoot = join(root, "docs/analysis/evidence-judgment/v0.1");
const readJson = async (name) =>
  JSON.parse(await readFile(join(datasetRoot, name), "utf8"));

function assertDateOnly(value, field) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/u, `${field} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  assert.ok(!Number.isNaN(parsed.valueOf()), `${field} must be a real date`);
  assert.equal(
    parsed.toISOString().slice(0, 10),
    value,
    `${field} must not overflow`,
  );
}

function keysDeep(value, keys = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) keysDeep(item, keys);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      keysDeep(item, keys);
    }
  }
  return keys;
}

test("external-source work is gated on feasibility and real end-to-end evidence", async () => {
  const guidance = await readFile(join(root, "AGENTS.md"), "utf8");
  const lesson = await readFile(
    join(datasetRoot, "FEASIBILITY_FIRST_LESSON.md"),
    "utf8",
  );

  assert.match(guidance, /Feasibility before source-specific work/u);
  assert.match(guidance, /FEASIBILITY_FIRST_LESSON\.md/u);
  assert.match(lesson, /Preflight the actual access path before choosing/u);
  assert.match(lesson, /web-page reader\/search path/u);
  assert.match(
    lesson,
    /page-reader success does not prove the product runtime/u,
  );
  assert.match(lesson, /one thin real end-to-end proof/u);
  assert.match(lesson, /Mock-tested/u);
  assert.match(lesson, /Do not use “working,” “complete,” or “collected”/u);
  assert.match(lesson, /If one path fails, do not stop the whole task/u);
  assert.match(
    lesson,
    /continue gathering actual material through another available official/u,
  );
  assert.match(
    lesson,
    /missing tools are a prerequisite to address, not a stopping condition/u,
  );
});

test("live Korean census observations preserve provenance, extracted values, and pending gates", async () => {
  const observations = await readFile(
    join(datasetRoot, "SOURCE_OBSERVATIONS.md"),
    "utf8",
  );

  assert.match(observations, /Initial observation date:\*\* 2026-11-05/u);
  assert.match(observations, /Latest update:\*\* 2026-11-06/u);
  assert.match(observations, /list_no=391585/u);
  assert.match(observations, /list_no=416465/u);
  assert.match(observations, /list_no=420171/u);
  assert.match(observations, /list_no=419981/u);
  assert.match(observations, /list_no=426676/u);
  assert.match(observations, /list_no=432395/u);
  assert.match(observations, /list_no=439064/u);
  assert.match(observations, /list_no=446724/u);
  assert.match(observations, /list_no=446219/u);
  assert.match(observations, /seq=12/u);
  assert.match(observations, /108KB/u);
  assert.match(observations, /KR-PHC-2025-REGISTER-CENSUS-XLS/u);
  assert.match(observations, /KR-PHC-2025-CENTENARIAN-RELEASE/u);
  assert.match(observations, /446542&seq=7/u);
  assert.match(observations, /8,604/u);
  assert.match(observations, /17\.309/u);
  assert.match(observations, /51,817,499/u);
  assert.match(observations, /23,245,980/u);
  assert.match(observations, /statJipyoId=3714/u);
  assert.match(observations, /tblId=DT_1JU1501/u);
  assert.match(observations, /tblId=DT_1JU1503/u);
  assert.match(observations, /DT_1JU1503.*sso=ok/u);
  assert.match(observations, /20,181,352/u);
  assert.match(observations, /not independent-producer corroboration/u);
  assert.match(observations, /introduce_02List\.do/u);
  assert.match(observations, /AI-use type/u);
  assert.match(observations, /attachPreview\.es\?bid=11739&list_no=446724/u);
  assert.match(observations, /ONE-ID login/u);
  assert.match(observations, /51,806/u);
  assert.match(observations, /22,997/u);
  assert.match(observations, /19,873/u);
  assert.match(observations, /Cross-release check/u);
  assert.match(observations, /same-program release-to-release consistency/u);
  assert.match(observations, /Candidate rights status: \*\*pending\*\*/u);
  assert.match(observations, /not yet an evaluation case/u);
});

test("the live 2025 Census page-reader observation keeps raw-source and rights gates explicit", async () => {
  const observation = await readJson(
    "KR-PHC-2025-REGISTER-CENSUS.observation.json",
  );
  const [population, households, housing] = observation.summary_table.measures;

  assert.equal(
    observation.observation_status,
    "live_page_reader_content_not_byte_archived",
  );
  assert.equal(observation.source.list_no, 446724);
  assert.equal(observation.source.access_method.includes("three chunks"), true);
  assert.equal(population.concept, "total_population");
  assert.deepEqual(population.values, [51775, 51806, 51817]);
  assert.equal(population.published_change_2025_vs_2024, 12);
  assert.deepEqual(households.values, [22728, 22997, 23246]);
  assert.equal(households.published_change_2025_vs_2024, 249);
  assert.deepEqual(housing.values, [19546, 19873, 20181]);
  assert.equal(housing.published_change_2025_vs_2024, 309);
  assert.equal(
    observation.access_and_preservation.actual_source_page_content_read,
    true,
  );
  assert.equal(
    observation.access_and_preservation.original_source_bytes_saved,
    false,
  );
  assert.equal(
    observation.access_and_preservation.original_source_sha256,
    null,
  );
  assert.equal(observation.access_and_preservation.rights_status, "pending");
  assert.equal(observation.access_and_preservation.approved_for_packet, false);
});

test("the live MODS XLS observation preserves its hash, exact counts, rounding reconciliation, and pending rights gate", async () => {
  const observation = await readJson(
    "KR-PHC-2025-REGISTER-CENSUS-XLS.observation.json",
  );
  const [table1, , table3, table4, table5, table6, table7] = observation.tables;

  assert.equal(
    observation.observation_status,
    "user_supplied_original_bytes_hash_verified_visual_cell_grid_reviewed_population_change_reconciled_rights_pending",
  );
  assert.equal(observation.original_file_evidence.file_size_bytes, 110592);
  assert.equal(
    observation.original_file_evidence.sha256,
    "9c4171fe8192158971ffc9f1e918ed632765ab76a410bf79ea087dc5ceed355b",
  );
  assert.equal(observation.visual_review.native_excel_or_libreoffice_rendering, false);
  assert.deepEqual(observation.visual_review.worksheets_visually_reviewed, [1, 2, 5, 6, 7]);
  assert.equal(observation.source.list_no, 446219);
  assert.equal(observation.source.sequence, 12);
  assert.equal(observation.source.file_format, "XLS");
  assert.equal(observation.source.displayed_file_size, "108KB");
  assert.deepEqual(
    observation.source.page_reader_chunks_read,
    [0, 1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    [
      table1.national_values.total_population_persons,
      table1.national_values.total_households,
      table1.national_values.total_housing_units,
    ],
    [51817499, 23245980, 20181352],
  );
  assert.equal(table3.national_values.total_population_persons, 51817499);
  assert.equal(
    table3.national_values.male_persons + table3.national_values.female_persons,
    51817499,
  );
  assert.equal(
    table3.national_values.youth_0_to_14_persons +
      table3.national_values.working_age_15_to_64_persons +
      table3.national_values.older_65_plus_persons,
    51817499,
  );
  assert.equal(table4.national_values.foreign_population_persons, 2109057);
  assert.match(table5.scope_note, /Korean nationals aged 18 or older/u);
  assert.equal(
    table6.national_values.general_households +
      table6.national_values.group_households +
      table6.national_values.foreigner_households,
    table6.national_values.total_households,
  );
  assert.equal(
    table6.national_values.one_person_households +
      table6.national_values.two_person_households +
      table6.national_values.three_person_households +
      table6.national_values.four_person_households +
      table6.national_values.five_or_more_person_households,
    table6.national_values.general_households,
  );
  const housing = table7.national_values;
  assert.equal(
    housing.general_detached_houses +
      housing.multi_household_detached_houses +
      housing.business_and_residential_detached_houses +
      housing.apartments +
      housing.row_houses +
      housing.multi_unit_houses +
      housing.non_residential_building_houses,
    housing.total_housing_units,
  );
  assert.equal(housing.non_housing_living_quarters, 1261218);
  assert.equal(observation.cross_checks[0].observed_xls_values[0], 51817499);
  assert.match(
    observation.cross_checks[1].relationship,
    /not independent-producer corroboration/u,
  );
  const reconciliation = observation.population_change_reconciliation;
  assert.equal(reconciliation.status, "resolved_as_rounding_consistency");
  assert.equal(reconciliation.sources[0].exact_total_population_persons, 51805547);
  assert.equal(reconciliation.sources[1].exact_total_population_persons, 51817499);
  assert.equal(reconciliation.calculations.exact_change_persons, 11952);
  assert.equal(reconciliation.calculations.rounded_change_to_nearest_thousand_persons, 12000);
  assert.equal(reconciliation.calculations.rounded_change_to_nearest_ten_thousand_persons, 10000);
  assert.equal(reconciliation.calculations.difference_of_displayed_rounded_levels_thousand_persons, 11);
  assert.match(reconciliation.interpretation, /no discrepancy remains/u);
  assert.ok(observation.rights_review_attempts.length >= 6);
  assert.equal(
    observation.access_and_preservation.actual_official_page_reader_content_read,
    true,
  );
  assert.equal(observation.access_and_preservation.original_source_bytes_saved, true);
  assert.equal(observation.access_and_preservation.original_source_byte_length, 110592);
  assert.equal(observation.access_and_preservation.original_source_sha256, observation.original_file_evidence.sha256);
  assert.equal(observation.access_and_preservation.rendered_table_visually_verified, true);
  assert.equal(observation.access_and_preservation.item_specific_license_type_verified, false);
  assert.equal(
    observation.access_and_preservation.rights_status,
    "pending_exact_item_specific_KOGL_type_review",
  );
  assert.equal(observation.access_and_preservation.approved_for_packet, false);
});

test("the KDI alternate route preserves exact 2025 tables without overstating byte acquisition or independence", async () => {
  const observation = await readJson(
    "KR-PHC-2025-KDI-REHOST.reader-observation.json",
  );
  const facts = observation.observed_exact_values;

  assert.equal(
    observation.observation_status,
    "live_page_reader_pdf_text_alternate_host_not_byte_archived",
  );
  assert.equal(observation.retrieved_resources.length, 2);
  for (const resource of observation.retrieved_resources) {
    assert.equal(resource.page_reader_chunks_total, 6);
    assert.deepEqual(resource.page_reader_chunks_read, [0, 1, 2, 3, 4, 5]);
    assert.match(
      resource.observed_download_url,
      /^https:\/\/eiec\.kdi\.re\.kr\//u,
    );
  }
  assert.equal(facts.national_population_persons, 51817499);
  assert.equal(
    facts.male_population_persons + facts.female_population_persons,
    facts.national_population_persons,
  );
  assert.equal(
    facts.korean_national_population_persons + facts.foreign_population_persons,
    facts.national_population_persons,
  );
  assert.equal(facts.total_households, 23245980);
  assert.equal(facts.one_person_households, 8244308);
  assert.equal(facts.total_housing_units, 20181352);
  const householdComponents = observation.table_component_values.households;
  assert.equal(
    householdComponents.one_person_households +
      householdComponents.two_person_households +
      householdComponents.three_person_households +
      householdComponents.four_person_households +
      householdComponents.five_or_more_person_households,
    householdComponents.general_households,
  );
  assert.equal(
    householdComponents.general_households +
      householdComponents.group_households +
      householdComponents.foreigner_households,
    facts.total_households,
  );
  assert.equal(
    Object.values(observation.table_component_values.housing_units).reduce(
      (sum, value) => sum + value,
      0,
    ),
    facts.total_housing_units,
  );
  assert.ok(observation.arithmetic_checks.every(({ result }) => result));
  assert.match(
    observation.source_relationship.relationship,
    /not an independent statistical producer/u,
  );
  assert.equal(
    observation.access_and_preservation.original_pdf_bytes_saved,
    false,
  );
  assert.equal(
    observation.access_and_preservation.original_source_sha256,
    null,
  );
  assert.equal(
    observation.access_and_preservation.product_runtime_collector_tested,
    false,
  );
  assert.equal(observation.access_and_preservation.rights_status, "pending");
  assert.equal(observation.access_and_preservation.approved_for_packet, false);
  const sourceNotes = await readFile(
    join(datasetRoot, "SOURCE_OBSERVATIONS.md"),
    "utf8",
  );
  const acquisition = await readFile(
    join(datasetRoot, "SOURCE_ACQUISITION.md"),
    "utf8",
  );
  const feasibility = await readFile(join(datasetRoot, "FEASIBILITY_FIRST_LESSON.md"), "utf8");
  assert.match(sourceNotes, /KR-PHC-2025-KDI-REHOST/u);
  assert.match(acquisition, /Alternate KDI-hosted repository route discovered/u);
  assert.match(feasibility, /Continuation check \(2026-11-06\)/u);
});

test("the live centenarian release keeps its denominator hypothesis and failed attachment routes explicit", async () => {
  const observation = await readJson(
    "KR-PHC-2025-CENTENARIAN-RELEASE.reader-observation.json",
  );

  assert.equal(
    observation.observation_status,
    "live_release_page_text_not_attachment_bytes",
  );
  assert.equal(observation.source.list_no, 446542);
  assert.equal(observation.source.sequence, 7);
  assert.equal(
    observation.source.attachment_direct_route_result.includes("not retried"),
    true,
  );
  assert.deepEqual(
    observation.source.alternate_attachment_routes.map((route) => route.sequence),
    [8, 9],
  );
  assert.match(observation.source.alternate_hwpx_preview_result, /no document text/u);
  assert.match(
    observation.source.preview_page_2_image_result,
    /HTTP 500; this exact image URL is not to be retried/u,
  );
  assert.equal(
    observation.published_page_statements.population_aged_100_plus_persons,
    8604,
  );
  assert.equal(
    observation.published_page_statements.population_aged_100_plus_per_100000_persons,
    17.3,
  );
  assert.equal(
    observation.denominator_diagnostic.status,
    "candidate_scope_explanation_not_confirmed",
  );
  assert.equal(
    observation.denominator_diagnostic.derived_population_excluding_foreign_population,
    49708442,
  );
  assert.equal(
    observation.denominator_diagnostic.follow_up_source_observation_id,
    "KR-PHC-2025-KDI-REHOST",
  );
  assert.ok(
    Math.round(
      observation.denominator_diagnostic
        .rate_using_population_excluding_foreign_population_per_100000 * 10,
    ) / 10 === 17.3,
  );
  assert.match(
    observation.denominator_diagnostic.interpretation,
    /plausible explanation, not a verified definition/u,
  );
  assert.equal(observation.access_and_preservation.original_source_bytes_saved, false);
  assert.equal(observation.access_and_preservation.original_source_sha256, null);
  assert.equal(observation.access_and_preservation.attachment_table_or_footnotes_read, false);
  assert.equal(observation.access_and_preservation.item_specific_license_type_verified, false);
  assert.equal(observation.access_and_preservation.rights_status, "pending");
  assert.equal(observation.access_and_preservation.approved_for_packet, false);
});

test("the live KOSIS housing table extract preserves exact values and same-series limits", async () => {
  const observation = await readJson(
    "KR-KOSIS-PHC-HOUSING.reader-observation.json",
  );

  assert.equal(
    observation.observation_status,
    "live_page_reader_table_text_not_byte_archived",
  );
  assert.equal(observation.source.published_period[0], 2015);
  assert.equal(observation.source.published_period[1], 2025);
  assert.equal(observation.table.unit, "호");
  assert.equal(observation.table.values.length, 11);
  assert.deepEqual(observation.table.values.slice(-2), [
    { year: 2024, value: 19872674 },
    { year: 2025, value: 20181352 },
  ]);
  assert.match(
    observation.cross_check.relationship,
    /not independent-source corroboration/u,
  );
  assert.equal(observation.access_and_preservation.download_url_exposed, false);
  assert.equal(
    observation.access_and_preservation.original_source_sha256,
    null,
  );
  assert.equal(observation.access_and_preservation.rights_status, "pending");
  assert.equal(observation.access_and_preservation.approved_for_packet, false);
});

test("portable-core judgment invariants are present in the evaluation contract", async () => {
  const contract = await readFile(
    join(root, "docs/analysis/brain-evidence-judgment-contract-2026-11-03.md"),
    "utf8",
  );

  assert.match(contract, /휴대 가능한 두뇌 핵심의 판정 역할/u);
  assert.match(contract, /고정된 자료 묶음/u);
  assert.match(contract, /같은 증거 기준/u);
  assert.match(contract, /속도·지연은 별도 운영 지표/u);
  assert.match(contract, /나쁜 답을 믿을 만하다고 잘못 승인/u);
  assert.match(contract, /좋은 답을 부당하게 거부/u);
});

test("brain evolution stays evidence-gated and distinct from unverified self-modification", async () => {
  const guidance = await readFile(join(root, "AGENTS.md"), "utf8");
  const plan = await readFile(
    join(root, "docs/PROJECT_OPERATING_PLAN.md"),
    "utf8",
  );
  const protocol = await readFile(
    join(datasetRoot, "EVOLUTION_PROTOCOL.md"),
    "utf8",
  );

  assert.match(guidance, /Evidence-gated brain evolution/u);
  assert.match(guidance, /fail closed without explicit human approval/u);
  assert.match(plan, /Continuous evolution goal/u);
  assert.match(plan, /monitored, reversible promotion/u);
  assert.match(protocol, /locked holdout/u);
  assert.match(
    protocol,
    /not an integrated, independently validated evolution system/u,
  );
  assert.match(
    protocol,
    /heuristic scores are not evidence of improved judgment/u,
  );
});

test("candidate-audit fixtures join public answers to evidence without leaking references", async () => {
  const source = await readJson("dev-input.synthetic.json");
  const sourceReferences = await readJson("dev-reference.synthetic.json");
  const audits = await readJson("candidate-audit-input.synthetic.json");
  const auditReferences = await readJson(
    "candidate-audit-reference.synthetic.json",
  );
  const auditInputSchema = await readJson("candidate-audit-input.schema.json");
  const auditReferenceSchema = await readJson(
    "candidate-audit-reference.schema.json",
  );
  const auditAnswerSchema = await readJson(
    "candidate-audit-answer.schema.json",
  );

  assert.equal(audits.dataset_id, auditReferences.dataset_id);
  assert.equal(audits.dataset_id, "REA-CANDIDATE-AUDIT-SYNTHETIC-DEV");
  assert.equal(audits.dataset_kind, "synthetic_development_fixture");
  assert.equal(auditReferences.dataset_kind, "synthetic_development_reference");
  for (const schema of [
    auditInputSchema,
    auditReferenceSchema,
    auditAnswerSchema,
  ])
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2019-09/schema",
    );

  const auditById = new Map(
    audits.audits.map((audit) => [audit.audit_id, audit]),
  );
  const referenceById = new Map(
    auditReferences.audits.map((reference) => [reference.audit_id, reference]),
  );
  const sourceById = new Map(source.cases.map((item) => [item.case_id, item]));
  const sourceReferenceById = new Map(
    sourceReferences.cases.map((item) => [item.case_id, item]),
  );
  assert.equal(auditById.size, 18);
  assert.equal(auditById.size, audits.audits.length);
  const assessmentCounts = new Map([
    ["trustworthy", 0],
    ["untrustworthy", 0],
  ]);
  const claimVerdicts = new Set();
  const errorConditions = new Set();
  for (const reference of auditReferences.audits) {
    assessmentCounts.set(
      reference.expected_assessment,
      assessmentCounts.get(reference.expected_assessment) + 1,
    );
    claimVerdicts.add(reference.expected_claim_verdict);
    for (const error of reference.critical_error_conditions)
      errorConditions.add(error);
  }
  assert.deepEqual(Object.fromEntries(assessmentCounts), {
    trustworthy: 9,
    untrustworthy: 9,
  });
  assert.deepEqual([...claimVerdicts].toSorted(), [
    "conflicting",
    "insufficient",
    "refuted",
    "supported",
  ]);
  for (const requiredError of [
    "causal_overclaim",
    "fabricated_evidence",
    "false_conflict",
    "ignored_counterevidence",
    "misleading_evidence",
    "temporal_scope_mismatch",
  ])
    assert.ok(
      errorConditions.has(requiredError),
      `missing audit trap ${requiredError}`,
    );
  assert.deepEqual(
    [...auditById.keys()].toSorted(),
    [...referenceById.keys()].toSorted(),
  );

  for (const [auditId, audit] of auditById) {
    const sourceCase = sourceById.get(audit.source_case_id);
    const reference = referenceById.get(auditId);
    const sourceReference = sourceReferenceById.get(audit.source_case_id);
    assert.ok(sourceCase, `${auditId}: source case must exist`);
    assert.ok(
      sourceReference,
      `${auditId}: private source reference must exist`,
    );
    assert.equal(
      reference.expected_claim_verdict,
      sourceReference.expected_label,
    );
    assert.ok(
      ["trustworthy", "untrustworthy"].includes(reference.expected_assessment),
    );
    assert.equal(auditInputSchema.additionalProperties, false);
    assert.equal(auditReferenceSchema.additionalProperties, false);
    assert.equal(auditAnswerSchema.additionalProperties, false);
    assert.ok(!Object.hasOwn(audit, "expected_assessment"));
    assert.ok(!Object.hasOwn(audit, "critical_error_conditions"));
    assert.ok(!Object.hasOwn(audit, "producer_model_id"));
  }

  const tasks = buildCandidateAuditTasks(source, audits);
  assert.equal(tasks.length, audits.audits.length);
  assert.deepEqual(Object.keys(tasks[0]).toSorted(), [
    "audit_id",
    "candidate_answer",
    "claim",
    "context",
    "evidence",
  ]);
  assert.equal(tasks[0].claim, sourceById.get("EJ-9M4K").claim);
  assert.ok(!Object.hasOwn(tasks[0], "expected_assessment"));
  assert.ok(!Object.hasOwn(tasks[0], "producer_model_id"));

  const fabricatedCitationTask = tasks.find(
    ({ audit_id }) => audit_id === "CA-0018",
  );
  assert.ok(fabricatedCitationTask);
  assert.deepEqual(
    fabricatedCitationTask.candidate_answer.supporting_evidence_ids,
    ["SRC-99Z"],
    "the syntactically valid but absent citation must reach the auditor",
  );
  assert.ok(
    !fabricatedCitationTask.evidence.some(
      ({ evidence_id }) => evidence_id === "SRC-99Z",
    ),
  );

  assert.throws(
    () =>
      buildCandidateAuditTasks(source, {
        ...audits,
        audits: [{ ...audits.audits[0], source_case_id: "EJ-XXXX" }],
      }),
    /unknown source case/u,
  );
});

test("synthetic evidence cases stay separate from their private reference labels", async () => {
  const input = await readJson("dev-input.synthetic.json");
  const reference = await readJson("dev-reference.synthetic.json");
  const caseSchema = await readJson("case-input.schema.json");
  const referenceSchema = await readJson("reference.schema.json");
  const answerSchema = await readJson("answer.schema.json");
  const ratingSchema = await readJson("rating.schema.json");
  const annotationSchema = await readJson("annotation.schema.json");
  const adjudicationSchema = await readJson("adjudication.schema.json");
  const statisticsContextSchema = await readJson(
    "official-statistics-context.schema.json",
  );

  assert.equal(input.dataset_id, reference.dataset_id);
  assert.equal(input.dataset_version, "0.1");
  assert.equal(input.dataset_kind, "synthetic_development_fixture");
  assert.equal(
    caseSchema.$schema,
    "https://json-schema.org/draft/2019-09/schema",
  );
  for (const schema of [
    referenceSchema,
    answerSchema,
    ratingSchema,
    annotationSchema,
    adjudicationSchema,
    statisticsContextSchema,
  ])
    assert.equal(schema.$schema, caseSchema.$schema);

  const inputCases = new Map(input.cases.map((item) => [item.case_id, item]));
  const referenceCases = new Map(
    reference.cases.map((item) => [item.case_id, item]),
  );
  assert.equal(inputCases.size, input.cases.length, "case IDs must be unique");
  assert.equal(
    referenceCases.size,
    reference.cases.length,
    "reference IDs must be unique",
  );
  assert.deepEqual(
    [...referenceCases.keys()].toSorted(),
    [...inputCases.keys()].toSorted(),
  );
  assert.equal(input.cases.length, 12);
  assert.ok(
    Object.hasOwn(
      referenceSchema.$defs.referenceCase.properties,
      "dependency_group_id",
    ),
  );
  assert.ok(
    !Object.hasOwn(caseSchema.$defs.case.properties, "dependency_group_id"),
    "dependency grouping metadata must stay out of answer-generator input",
  );

  const counts = new Map(
    ["supported", "refuted", "insufficient", "conflicting"].map((label) => [
      label,
      0,
    ]),
  );
  for (const [caseId, sourceCase] of inputCases) {
    const gold = referenceCases.get(caseId);
    assertDateOnly(sourceCase.context.as_of, `${caseId}.context.as_of`);
    for (const evidence of sourceCase.evidence)
      assertDateOnly(
        evidence.published_at,
        `${caseId}.${evidence.evidence_id}.published_at`,
      );
    counts.set(gold.expected_label, counts.get(gold.expected_label) + 1);
    const evidenceIds = sourceCase.evidence.map(
      ({ evidence_id }) => evidence_id,
    );
    assert.equal(
      new Set(evidenceIds).size,
      evidenceIds.length,
      `${caseId}: evidence IDs must be unique`,
    );
    for (const evidenceId of [
      ...gold.supporting_evidence_ids,
      ...gold.refuting_evidence_ids,
      ...gold.relevant_evidence_ids,
    ])
      assert.ok(
        evidenceIds.includes(evidenceId),
        `${caseId}: unknown evidence ${evidenceId}`,
      );
    for (const evidenceId of [
      ...gold.supporting_evidence_ids,
      ...gold.refuting_evidence_ids,
    ])
      assert.ok(
        gold.relevant_evidence_ids.includes(evidenceId),
        `${caseId}: decisive evidence must be relevant`,
      );

    if (gold.expected_label === "supported") {
      assert.ok(gold.supporting_evidence_ids.length > 0);
      assert.equal(gold.refuting_evidence_ids.length, 0);
    } else if (gold.expected_label === "refuted") {
      assert.ok(gold.refuting_evidence_ids.length > 0);
      assert.equal(gold.supporting_evidence_ids.length, 0);
    } else if (gold.expected_label === "insufficient") {
      assert.equal(gold.supporting_evidence_ids.length, 0);
      assert.equal(gold.refuting_evidence_ids.length, 0);
    } else {
      assert.ok(gold.supporting_evidence_ids.length > 0);
      assert.ok(gold.refuting_evidence_ids.length > 0);
    }
  }
  assert.deepEqual(Object.fromEntries(counts), {
    supported: 3,
    refuted: 3,
    insufficient: 3,
    conflicting: 3,
  });

  const inputKeys = keysDeep(input);
  for (const hiddenKey of [
    "expected_label",
    "rationale",
    "critical_error_conditions",
  ])
    assert.ok(
      !inputKeys.has(hiddenKey),
      `private key leaked into input: ${hiddenKey}`,
    );

  const dateTrap = referenceCases.get("EJ-8L6P");
  assert.equal(dateTrap.expected_label, "refuted");
  assert.deepEqual(dateTrap.supporting_evidence_ids, []);
  assert.deepEqual(dateTrap.refuting_evidence_ids, ["SRC-05A"]);

  assert.ok(!Object.hasOwn(answerSchema.properties, "provider_id"));
  assert.ok(!Object.hasOwn(ratingSchema.properties, "provider_id"));
  assert.ok(Object.hasOwn(ratingSchema.properties, "judge_id"));
});

test("official-statistics profile requires scope and rate components", async () => {
  const statisticsContextSchema = await readJson(
    "official-statistics-context.schema.json",
  );
  assert.ok(statisticsContextSchema.required.includes("series_kind"));
  assert.deepEqual(statisticsContextSchema.properties.series_kind.enum, [
    "census_population",
    "census_households",
    "census_dwellings",
    "registered_population",
  ]);
  assert.ok(statisticsContextSchema.required.includes("reference_period"));
  assert.ok(statisticsContextSchema.required.includes("source_vintage"));
  assert.ok(statisticsContextSchema.required.includes("rounding_precision"));
  const rateRule = statisticsContextSchema.allOf.find(({ if: condition }) =>
    condition.properties.measure_type.enum.includes("rate"),
  );
  assert.ok(rateRule);
  assert.deepEqual(rateRule.then.required, [
    "numerator_definition",
    "denominator_definition",
  ]);
});

test("official-statistics packet schema keeps private metadata out of model input", async () => {
  const caseSchema = await readJson(
    "official-statistics-case-input.schema.json",
  );
  const caseProperties = caseSchema.$defs.case.properties;
  const evidenceProperties = caseSchema.$defs.evidence.properties;

  assert.equal(
    caseSchema.properties.dataset_kind.const,
    "official_statistics_evaluation",
  );
  assert.equal(
    caseProperties.context.$ref,
    "https://schemas.tooai.invalid/rea/brain-evidence/official-statistics-context/0.1",
  );
  for (const privateField of [
    "dependency_group_id",
    "expected_label",
    "license_or_terms",
    "rights_status",
  ])
    assert.ok(!Object.hasOwn(caseProperties, privateField));
  assert.ok(!Object.hasOwn(evidenceProperties, "license_or_terms"));
  assert.ok(!Object.hasOwn(evidenceProperties, "rights_status"));
});

test("Korean source intake keeps packet use gated on rights review and archival evidence", async () => {
  const sourceSchema = await readJson("official-statistics-source.schema.json");
  assert.equal(sourceSchema.properties.jurisdiction_code.const, "KR");
  assert.ok(sourceSchema.required.includes("rights_status"));
  assert.ok(sourceSchema.required.includes("license_or_terms"));
  assert.ok(sourceSchema.required.includes("approved_for_packet"));
  assert.ok(sourceSchema.required.includes("snapshot_sha256"));
  const approvalRule = sourceSchema.allOf.find(
    ({ if: condition }) =>
      condition.properties.approved_for_packet.const === true,
  );
  assert.ok(approvalRule);
  assert.equal(approvalRule.then.properties.rights_status.const, "approved");
  assert.equal(
    approvalRule.then.properties.snapshot_sha256.pattern,
    "^[a-fA-F0-9]{64}$",
  );
});

test("human review schemas support blinded annotation without forcing disputed labels", async () => {
  const annotationSchema = await readJson("annotation.schema.json");
  const adjudicationSchema = await readJson("adjudication.schema.json");

  assert.ok(annotationSchema.required.includes("reviewer_id"));
  assert.ok(annotationSchema.required.includes("phase"));
  assert.ok(!Object.hasOwn(annotationSchema.properties, "reviewer_name"));
  assert.deepEqual(adjudicationSchema.properties.resolution.enum, [
    "agreement",
    "adjudicated",
    "unresolved",
    "excluded",
  ]);
  assert.ok(adjudicationSchema.required.includes("final_label"));
  assert.ok(adjudicationSchema.allOf.length >= 4);
});

test("Graphify lessons are recorded as retrieval guidance, not an adjudication implementation", async () => {
  const notes = await readFile(
    join(datasetRoot, "GRAPH_RETRIEVAL_ADOPTION.md"),
    "utf8",
  );
  const readme = await readFile(join(datasetRoot, "README.md"), "utf8");
  const guidance = await readFile(join(root, "AGENTS.md"), "utf8");

  assert.match(notes, /16218bfc80d4ca2799734d045039f7ed1a5fa9fb/u);
  assert.match(notes, /were not independently reproduced/u);
  assert.match(notes, /provenance-aware index and retrieval layer/u);
  assert.match(notes, /not as REA's evidence-judgment core/u);
  assert.match(notes, /Independence is an adjudicated source-dependency fact/u);
  assert.match(notes, /bounded retrieval result should include/u);
  assert.match(notes, /No REA source content may be sent to a Provider/u);
  assert.match(readme, /GRAPH_RETRIEVAL_ADOPTION\.md/u);
  assert.match(guidance, /Evidence graph and retrieval/u);
  assert.match(guidance, /Never infer support, contradiction, source independence/u);
});

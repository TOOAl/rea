import { z } from "zod";

import { STABLE_IDENTIFIER_PATTERN } from "./stringPatterns.js";

import { evidenceBundleSchema } from "./evidenceBundle.js";
import { digestSchema } from "./../domain/digests.js";
import { prefixedDigestSchema } from "./../domain/digests.js";
import { canonicalJson } from "./comparisonSemantics.js";
import {
  reconstructionObligationCoverage,
  reconstructionObligationDependencyGraph,
  reconstructionObligationLedgerClosureDigest,
  reconstructionObligationLedgerStatus,
  reconstructionObligationEvidenceIds,
  reconstructionObligationOwnershipGraph,
  reconstructionObligationReports,
  summarizeReconstructionObligations,
} from "./reconstructionObligationLedgerIntegrity.js";

export const reconstructionObligationSchema = z.strictObject({
  obligation_id: stableIdSchema,
  obligation_version: z.number().int().min(1),
  title: textSchema,
  origin: z.enum(["generated", "reviewed"]),
  application_layer: obligationLayerSchema,
  family: textSchema,
  target: obligationTargetSchema,
  authority_references: z.array(authorityReferenceSchema).min(1),
  source_state: z.enum(["candidate", "observed", "reviewed", "unknown"]),
  observed_cases: z.array(observedCaseSchema),
  required: z.boolean(),
  required_case_kinds: z.array(obligationCaseKindSchema).min(1),
  required_original_authority: obligationOriginalAuthoritySchema,
  required_fixture_authority: obligationProofAuthoritySchema,
  required_verifier_authority: obligationProofAuthoritySchema,
  requires_parser_type: z.boolean(),
  dependency_obligation_ids: z.array(stableIdSchema),
  residual_unknown_ids: z.array(stableIdSchema),
  unavailable_authority: z.array(textSchema),
  required_next_evidence: z.array(textSchema),
  binding: reconstructionObligationManifestBindingSchema.nullable(),
  status: obligationStatusSchema,
  diagnostics: z.array(diagnosticSchema),
});

const countBySchema = <Schema extends z.ZodType>(
  key: Schema,
): z.ZodArray<
  z.ZodObject<{
    key: Schema;
    count: z.ZodNumber;
  }>
> =>
  z.array(
    z.strictObject({
      key,
      count: z.number().int().min(0),
    }),
  );

const countEntriesMatch = (
  actual: readonly { readonly key: string; readonly count: number }[],
  expected: readonly { readonly key: string; readonly count: number }[],
): boolean => {
  const actualCounts = new Map(actual.map(({ key, count }) => [key, count]));
  return (
    actualCounts.size === actual.length &&
    actual.length === expected.length &&
    expected.every(({ key, count }) => actualCounts.get(key) === count)
  );
};

const obligationSummariesMatch = (
  actual: ReconstructionObligationLedger["summary"],
  expected: ReconstructionObligationLedger["summary"],
): boolean =>
  actual.total === expected.total &&
  actual.required === expected.required &&
  actual.verified === expected.verified &&
  actual.required_open === expected.required_open &&
  countEntriesMatch(actual.by_status, expected.by_status) &&
  countEntriesMatch(
    actual.by_application_layer,
    expected.by_application_layer,
  ) &&
  countEntriesMatch(
    actual.by_evidence_authority,
    expected.by_evidence_authority,
  );

export const reconstructionObligationLedgerSchema = z
  .strictObject({
    schema: z.literal("ReconstructionObligationLedger"),
    ledger_id: prefixedDigestSchema("rol"),
    closure_digest: digestSchema,
    status: z.enum(["ready", "open", "failed", "unknown"]),
    coverage: z.strictObject({
      status: z.enum(["complete", "partial"]),
    }),
    summary: z.strictObject({
      total: z.number().int().min(0),
      required: z.number().int().min(0),
      verified: z.number().int().min(0),
      required_open: z.number().int().min(0),
      by_status: countBySchema(obligationStatusSchema),
      by_application_layer: countBySchema(obligationLayerSchema),
      by_evidence_authority: countBySchema(
        z.enum(["candidate", "observed", "reviewed", "unknown"]),
      ),
    }),
    reports: z.strictObject({
      missing_owner_obligation_ids: z.array(stableIdSchema),
      missing_verifier_obligation_ids: z.array(stableIdSchema),
      contradicted_obligation_ids: z.array(stableIdSchema),
      residual_unknown_ids: z.array(stableIdSchema),
    }),
    ownership_graph: z.array(
      z.strictObject({
        obligation_id: stableIdSchema,
        module_path: textSchema,
        symbol: textSchema,
      }),
    ),
    dependency_graph: z.array(
      z.strictObject({
        obligation_id: stableIdSchema,
        depends_on_obligation_id: stableIdSchema,
      }),
    ),
    obligations: z.array(reconstructionObligationSchema),
    evidence_links: z.array(evidenceIdSchema),
    limitations: z.array(textSchema),
  })
  .superRefine((ledger, context) => {
    if (
      ledger.status !==
      reconstructionObligationLedgerStatus(
        ledger.obligations,
        ledger.limitations,
      )
    )
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Ledger status does not match its obligations",
      });
    if (
      !obligationSummariesMatch(
        ledger.summary,
        summarizeReconstructionObligations(ledger.obligations),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "Ledger summary does not match its obligations",
      });
    if (
      ledger.closure_digest !==
      reconstructionObligationLedgerClosureDigest(ledger)
    )
      context.addIssue({
        code: "custom",
        path: ["closure_digest"],
        message: "Ledger closure digest does not match its contents",
      });
    if (
      ledger.coverage.status !==
      reconstructionObligationCoverage(ledger.limitations).status
    )
      context.addIssue({
        code: "custom",
        path: ["coverage"],
        message: "Ledger coverage does not match its limitations",
      });
    const expectedReports = reconstructionObligationReports(ledger.obligations);
    for (const key of [
      "missing_owner_obligation_ids",
      "missing_verifier_obligation_ids",
      "contradicted_obligation_ids",
      "residual_unknown_ids",
    ] as const)
      if (!sameProjection(ledger.reports[key], expectedReports[key]))
        context.addIssue({
          code: "custom",
          path: ["reports", key],
          message: "Ledger report does not match its obligations",
        });
    if (
      !sameProjection(
        ledger.ownership_graph,
        reconstructionObligationOwnershipGraph(ledger.obligations),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["ownership_graph"],
        message: "Ownership graph does not match its obligations",
      });
    if (
      !sameProjection(
        ledger.dependency_graph,
        reconstructionObligationDependencyGraph(ledger.obligations),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["dependency_graph"],
        message: "Dependency graph does not match its obligations",
      });
    const ledgerEvidenceIds = new Set(ledger.evidence_links);
    if (ledgerEvidenceIds.size !== ledger.evidence_links.length)
      context.addIssue({
        code: "custom",
        path: ["evidence_links"],
        message: "Evidence links must be unique",
      });
    if (
      reconstructionObligationEvidenceIds(ledger.obligations).some(
        (evidenceId) => !ledgerEvidenceIds.has(evidenceId),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["evidence_links"],
        message: "Evidence links omit Evidence referenced by an obligation",
      });
  });

export const reconstructionObligationLedgerInputSchema = z.strictObject({
  evidence_bundle: evidenceBundleSchema,
  reviewed_obligations: z.array(reviewedReconstructionObligationSchema),
  manifest: reconstructionObligationManifestSchema,
});

export type ReconstructionObligation = z.infer<
  typeof reconstructionObligationSchema
>;
export type ReconstructionObligationLedger = z.infer<
  typeof reconstructionObligationLedgerSchema
>;
export type ReconstructionObligationLedgerInput = z.infer<
  typeof reconstructionObligationLedgerInputSchema
>;
export type ReviewedReconstructionObligation = z.infer<
  typeof reviewedReconstructionObligationSchema
>;
export type ReconstructionObligationManifest = z.infer<
  typeof reconstructionObligationManifestSchema
>;

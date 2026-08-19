import {
  createBranch,
  createItemType,
  fetchBranches,
  fetchItemTypes,
  patchBranch,
  patchOnboardingState,
  updateBusiness,
  updateMyBranding,
  uploadMyBrandingLogo,
  type BusinessRecord,
} from "@/lib/api";
import {
  branchCountToNumber,
  formatBranchDisplayName,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
} from "@/lib/onboarding-questionnaire";
import {
  buildPendingSectionCreates,
  labelToItemTypeKey,
} from "@/lib/item-type-suggestions";
import { isButcheryBusiness } from "@/lib/business-store-type";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
} from "@/lib/storefront-templates";

export type OnboardingApplyPhaseId =
  | "branches"
  | "storefront"
  | "item-types"
  | "branding"
  | "logo";

export type OnboardingApplyPhaseResult = {
  phase: OnboardingApplyPhaseId;
  status: "done" | "skipped";
};

export type OnboardingApplyResult = {
  /** First active branch id, when branches were created/found. */
  firstBranchId: string | null;
  /** Phases that ran before any failure (skipped phases included). */
  phases: OnboardingApplyPhaseResult[];
  /** The phase that threw, or null when everything (incl. finalize) succeeded. */
  failedPhase: OnboardingApplyPhaseId | null;
  /** The phase's error message, when a phase threw. */
  error: string | null;
  /** True when every phase AND the server `completed` patch succeeded. */
  completed: boolean;
};

/** Human labels so the questionnaire can say exactly which step failed. */
export const ONBOARDING_APPLY_PHASE_LABELS: Record<
  OnboardingApplyPhaseId,
  string
> = {
  branches: "Your shop locations",
  storefront: "Your online shop settings",
  "item-types": "Your product sections",
  branding: "Your branding",
  logo: "Your logo",
};

type PhaseRunner = {
  id: OnboardingApplyPhaseId;
  run: () => Promise<OnboardingApplyPhaseResult>;
};

async function runPhasesUntilFailure(
  runners: readonly PhaseRunner[],
): Promise<{
  phases: OnboardingApplyPhaseResult[];
  failedPhase: OnboardingApplyPhaseId | null;
  error: string | null;
}> {
  const phases: OnboardingApplyPhaseResult[] = [];
  for (const runner of runners) {
    try {
      phases.push(await runner.run());
    } catch (error) {
      return {
        phases,
        failedPhase: runner.id,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong during setup.",
      };
    }
  }
  return { phases, failedPhase: null, error: null };
}

/** Builds a user-facing failure message for {@link OnboardingApplyResult}. */
export function formatApplyFailureMessage(result: OnboardingApplyResult): string {
  if (!result.failedPhase) {
    return "Your shop was saved, but we couldn't mark setup as finished. Tap Create my shop to retry.";
  }
  const phaseLabel = ONBOARDING_APPLY_PHASE_LABELS[result.failedPhase];
  const savedCount = result.phases.length;
  const savedPart =
    savedCount > 0
      ? `We saved the first ${savedCount} step${savedCount === 1 ? "" : "s"}. `
      : "";
  const detail = result.error ? ` ${result.error}` : "";
  const hint =
    result.failedPhase === "logo"
      ? " Remove the logo on the previous step, or tap Create my shop to retry."
      : " Tap Create my shop to retry — already-saved steps won't repeat.";
  return `${savedPart}${phaseLabel} could not be saved.${detail}${hint}`;
}

/**
 * Applies all questionnaire answers to the tenant, phase by phase, so a failure
 * mid-way reports exactly which step failed and a retry only re-runs the
 * remaining phases (each phase is idempotent — it re-reads current state
 * before creating entities).
 *
 * Phases: branches → storefront (+ butcher flag) → item types → branding → logo.
 */
export async function applyOnboardingQuestionnaire(
  answers: OnboardingQuestionnaireAnswers,
  opts: { business: BusinessRecord | null } & OnboardingQuestionnaireFinishExtras,
): Promise<OnboardingApplyResult> {
  let firstBranchId: string | null = null;

  const { phases, failedPhase, error } = await runPhasesUntilFailure([
    {
      id: "branches",
      run: async () => {
        const count = branchCountToNumber(answers.branchCount);
        const names = answers.branchLocalities.map((loc, i) =>
          formatBranchDisplayName(loc || `Shop ${i + 1}`),
        );
        // Re-read so a retry after a partial failure does not double-create.
        const existing = [...(await fetchBranches())];
        for (let i = 0; i < count; i++) {
          const name = names[i]!;
          const branch = existing[i];
          if (branch) {
            if (branch.name !== name) {
              await patchBranch(branch.id, { name });
              existing[i] = { ...branch, name };
            }
          } else {
            await createBranch({ name });
          }
        }
        const activeBranches = (await fetchBranches()).filter((b) => b.active);
        firstBranchId = activeBranches[0]?.id ?? null;
        return { phase: "branches", status: "done" };
      },
    },
    {
      id: "storefront",
      run: async () => {
        const storeThemeId = normalizeStoreThemeId(
          answers.storeThemeId || DEFAULT_STORE_THEME_ID,
        );
        const landingTemplateId = normalizeLandingTemplateId(
          answers.landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
        );
        const storefrontPatch = {
          storeThemeId,
          landingTemplateId,
          ...(answers.landingWhatsapp?.trim()
            ? {
                landingContent: {
                  whatsapp: answers.landingWhatsapp.trim(),
                },
              }
            : {}),
        };
        if (answers.onlineStore === "yes" && firstBranchId) {
          await updateBusiness({
            storefront: {
              enabled: true,
              catalogBranchId: firstBranchId,
              ...storefrontPatch,
            },
          });
        } else {
          await updateBusiness({ storefront: storefrontPatch });
        }
        if (isButcheryBusiness({ onboarding: { answers } })) {
          await updateBusiness({
            featureFlags: {
              butcherPosEnabled: true,
            },
          });
        }
        return { phase: "storefront", status: "done" };
      },
    },
    {
      id: "item-types",
      run: async () => {
        // Re-read so a retry does not duplicate sections already created.
        const freshTypes = await fetchItemTypes();
        const existingKeys = new Set(
          freshTypes.map((t) =>
            (t.key ?? labelToItemTypeKey(t.label)).toLowerCase(),
          ),
        );
        const existingLabels = new Set(
          freshTypes.map((t) => t.label.trim().toLowerCase()),
        );
        const pendingSections = buildPendingSectionCreates({
          pickedLabels: answers.selectedDepartments,
          extraNames: [],
          existingKeys,
          existingLabels,
        });
        for (const row of pendingSections) {
          await createItemType({ key: row.key, label: row.label });
        }
        return { phase: "item-types", status: "done" };
      },
    },
    {
      id: "branding",
      run: async () => {
        const displayName =
          answers.displayName.trim() || opts.business?.name?.trim() || "";
        const brandingPatch: {
          displayName?: string;
          primaryColor?: string;
          accentColor?: string;
        } = {};
        if (displayName) {
          brandingPatch.displayName = displayName;
        }
        if (answers.primaryColor.trim()) {
          brandingPatch.primaryColor = answers.primaryColor.trim();
        }
        if (answers.accentColor.trim()) {
          brandingPatch.accentColor = answers.accentColor.trim();
        }
        if (Object.keys(brandingPatch).length > 0) {
          await updateMyBranding(brandingPatch);
        }
        return { phase: "branding", status: "done" };
      },
    },
    {
      id: "logo",
      run: async () => {
        const businessId = opts.business?.id?.trim();
        if (!opts.logoFile || !businessId) {
          return { phase: "logo", status: "skipped" };
        }
        await uploadMyBrandingLogo(opts.logoFile, businessId);
        return { phase: "logo", status: "done" };
      },
    },
  ]);

  if (failedPhase) {
    return { firstBranchId, phases, failedPhase, error, completed: false };
  }

  const storeThemeId = normalizeStoreThemeId(
    answers.storeThemeId || DEFAULT_STORE_THEME_ID,
  );
  const landingTemplateId = normalizeLandingTemplateId(
    answers.landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
  );
  try {
    await patchOnboardingState({
      status: "completed",
      step: 6,
      answers: {
        branchCount: answers.branchCount,
        branchLocalities: answers.branchLocalities,
        storeTypes: answers.storeTypes,
        selectedDepartments: answers.selectedDepartments,
        onlineStore: answers.onlineStore,
        storeThemeId,
        landingTemplateId,
        displayName: answers.displayName.trim(),
        primaryColor: answers.primaryColor.trim(),
        accentColor: answers.accentColor.trim(),
      },
    });
  } catch (finalizeError) {
    return {
      firstBranchId,
      phases,
      failedPhase: null,
      error:
        finalizeError instanceof Error
          ? finalizeError.message
          : "Could not finish setup.",
      completed: false,
    };
  }

  return { firstBranchId, phases, failedPhase: null, error: null, completed: true };
}

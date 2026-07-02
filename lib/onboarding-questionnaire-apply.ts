import {
  createBranch,
  createItemType,
  fetchBranches,
  patchBranch,
  updateBusiness,
  updateMyBranding,
  uploadMyBrandingLogo,
  type BranchRecord,
  type BusinessRecord,
  type ItemTypeRecord,
} from "@/lib/api";
import {
  branchCountToNumber,
  formatBranchDisplayName,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
} from "@/lib/onboarding-questionnaire";
import { patchOnboardingState } from "@/lib/api";
import {
  buildPendingSectionCreates,
  labelToItemTypeKey,
} from "@/lib/item-type-suggestions";
import { isButcheryBusiness } from "@/lib/business-store-type";

export async function applyOnboardingQuestionnaire(
  answers: OnboardingQuestionnaireAnswers,
  opts: {
    business: BusinessRecord | null;
    branches: readonly BranchRecord[];
    itemTypes: readonly ItemTypeRecord[];
  } & OnboardingQuestionnaireFinishExtras,
): Promise<{ firstBranchId: string | null }> {
  const count = branchCountToNumber(answers.branchCount);
  const names = answers.branchLocalities.map((loc, i) =>
    formatBranchDisplayName(loc || `Shop ${i + 1}`),
  );
  const existing = [...opts.branches];

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

  const refreshed = await fetchBranches();
  const activeBranches = refreshed.filter((b) => b.active);
  const firstBranchId = activeBranches[0]?.id ?? null;

  if (answers.onlineStore === "yes" && firstBranchId) {
    await updateBusiness({
      storefront: {
        enabled: true,
        catalogBranchId: firstBranchId,
      },
    });
  }

  if (isButcheryBusiness({ onboarding: { answers } })) {
    await updateBusiness({
      featureFlags: {
        butcherPosEnabled: true,
      },
    });
  }

  const existingKeys = new Set(
    opts.itemTypes.map((t) =>
      (t.key ?? labelToItemTypeKey(t.label)).toLowerCase(),
    ),
  );
  const existingLabels = new Set(
    opts.itemTypes.map((t) => t.label.trim().toLowerCase()),
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

  const businessId = opts.business?.id?.trim();
  if (opts.logoFile && businessId) {
    await uploadMyBrandingLogo(opts.logoFile, businessId);
  }

  await patchOnboardingState({
    status: "completed",
    step: 5,
    answers: {
      branchCount: answers.branchCount,
      branchLocalities: answers.branchLocalities,
      storeTypes: answers.storeTypes,
      selectedDepartments: answers.selectedDepartments,
      onlineStore: answers.onlineStore,
      displayName: answers.displayName.trim(),
      primaryColor: answers.primaryColor.trim(),
      accentColor: answers.accentColor.trim(),
    },
  });

  return { firstBranchId };
}

"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useDashboard } from "@/components/dashboard-provider";
import { OnboardingQuestionnaire } from "@/components/onboarding/onboarding-questionnaire";
import { APP_ROUTES } from "@/lib/config";
import { isButcheryOnlyBusiness } from "@/lib/business-store-type";
import { hasPermission, Permission } from "@/lib/permissions";
import { applyOnboardingQuestionnaire } from "@/lib/onboarding-questionnaire-apply";
import {
  fetchGlobalCatalogMeta,
  fetchGlobalCatalogPack,
  type GlobalProductPackRecord,
  type GlobalProductRecord,
} from "@/lib/api";
import { isGlobalCatalogShellEmpty } from "@/lib/global-catalog-empty";
import { pickSuggestedOnboardingPack } from "@/lib/onboarding-suggested-pack";
import type { OnboardingSuggestedPackPreview } from "@/lib/onboarding-suggested-pack";
import { formatMoney } from "@/lib/money";
import {
  activateOnboardingQuestionnaire,
  completeOnboardingQuestionnaire,
  dismissOnboardingQuestionnaire,
  getOnboardingQuestionnaireState,
  hydrateOnboardingQuestionnaireFromServer,
  saveQuestionnaireProgress,
  shouldStartOnboardingQuestionnaire,
  type OnboardingQuestionnaireAnswers,
  type OnboardingQuestionnaireFinishExtras,
} from "@/lib/onboarding-questionnaire";

type OnboardingQuestionnaireContextValue = {
  active: boolean;
  reopen: () => void;
};

const OnboardingQuestionnaireContext =
  createContext<OnboardingQuestionnaireContextValue>({
    active: false,
    reopen: () => undefined,
  });

export function useOnboardingQuestionnaire() {
  return useContext(OnboardingQuestionnaireContext);
}

function isCompleteAnswers(
  answers: Partial<OnboardingQuestionnaireAnswers>,
): answers is OnboardingQuestionnaireAnswers {
  return (
    Boolean(answers.branchCount) &&
    Array.isArray(answers.branchLocalities) &&
    answers.branchLocalities.length > 0 &&
    answers.branchLocalities.every((loc) => loc.trim().length > 0) &&
    Array.isArray(answers.storeTypes) &&
    answers.storeTypes.length > 0 &&
    Array.isArray(answers.selectedDepartments) &&
    Boolean(answers.onlineStore) &&
    Boolean(answers.displayName?.trim()) &&
    Boolean(answers.primaryColor?.trim()) &&
    Boolean(answers.accentColor?.trim())
  );
}

function buildPackPreview(
  pack: GlobalProductPackRecord,
  currency: string,
  products: GlobalProductRecord[],
): OnboardingSuggestedPackPreview {
  const samples = products.slice(0, 4);
  const priced = samples.find((p) => p.recommendedSellingPrice != null);
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    productCount: pack.productCount,
    currency,
    sampleNames: samples.map((p) => p.name).filter(Boolean),
    samplePriceLabel:
      priced?.recommendedSellingPrice != null
        ? `from ${formatMoney(priced.recommendedSellingPrice, currency)}`
        : null,
  };
}

export function OnboardingQuestionnaireProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const {
    me,
    business,
    branches,
    itemTypes,
    refreshBranches,
    refreshItemTypes,
    refreshSession,
    setBranchId,
  } = useDashboard();

  const canGlobalCatalog = hasPermission(
    me?.permissions,
    Permission.CatalogGlobalRead,
  );

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<
    Partial<OnboardingQuestionnaireAnswers>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [catalogShellEmpty, setCatalogShellEmpty] = useState(false);
  const [catalogLabel, setCatalogLabel] = useState<string | null>(null);
  const [suggestedPack, setSuggestedPack] =
    useState<OnboardingSuggestedPackPreview | null>(null);
  const [packLoading, setPackLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (step !== 6 || !canGlobalCatalog) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPackLoading(true);
      try {
        const meta = await fetchGlobalCatalogMeta();
        if (cancelled) return;
        const empty = isGlobalCatalogShellEmpty({
          meta,
          productCount: 0,
          totalElements: 0,
          search: "",
          categoryId: null,
          packId: null,
        });
        setCatalogShellEmpty(empty);
        setCatalogLabel(meta.catalogName?.trim() || meta.catalogCode || null);

        if (empty) {
          setSuggestedPack(null);
          return;
        }

        const storeTypes = answers.storeTypes ?? [];
        const pick = pickSuggestedOnboardingPack(meta.packs, storeTypes);
        if (!pick) {
          setSuggestedPack(null);
          return;
        }

        try {
          const detail = await fetchGlobalCatalogPack(pick.id, {
            onlyNotImported: false,
          });
          if (cancelled) return;
          setSuggestedPack(
            buildPackPreview(pick, meta.currency, detail.products),
          );
        } catch {
          if (!cancelled) {
            setSuggestedPack(
              buildPackPreview(pick, meta.currency, []),
            );
          }
        }
      } catch {
        if (!cancelled) {
          setCatalogShellEmpty(false);
          setCatalogLabel(null);
          setSuggestedPack(null);
        }
      } finally {
        if (!cancelled) {
          setPackLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, canGlobalCatalog, answers.storeTypes]);

  const startQuestionnaire = useCallback(() => {
    const stored = getOnboardingQuestionnaireState();
    activateOnboardingQuestionnaire();
    setStep(stored.step || 1);
    setAnswers(stored.answers);
    setActive(true);
    setErrorMessage("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateOnboardingQuestionnaireFromServer();
      if (cancelled) {
        return;
      }
      if (shouldStartOnboardingQuestionnaire()) {
        startQuestionnaire();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startQuestionnaire]);

  const finish = useCallback(() => {
    setActive(false);
    router.replace(
      isButcheryOnlyBusiness(business) ? APP_ROUTES.butcher : APP_ROUTES.business,
    );
  }, [router, business]);

  const handleBrowseCatalog = useCallback(() => {
    setActive(false);
    router.replace(`${APP_ROUTES.productsCatalog}?from=onboarding`);
  }, [router]);

  const handleImportSuggestedPack = useCallback(() => {
    if (!suggestedPack) {
      handleBrowseCatalog();
      return;
    }
    setActive(false);
    router.replace(
      `${APP_ROUTES.productsCatalog}?from=onboarding&packId=${encodeURIComponent(suggestedPack.id)}`,
    );
  }, [router, suggestedPack, handleBrowseCatalog]);

  const handleAddProductsManually = useCallback(() => {
    setActive(false);
    router.replace(APP_ROUTES.products);
  }, [router]);

  const handleFinishLater = useCallback(() => {
    finish();
  }, [finish]);

  const handleSkip = useCallback(() => {
    dismissOnboardingQuestionnaire();
    setActive(false);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
    setErrorMessage("");
  }, []);

  const handleContinue = useCallback(
    async (
      patch: Partial<OnboardingQuestionnaireAnswers>,
      extras?: OnboardingQuestionnaireFinishExtras,
    ) => {
      const merged = { ...answers, ...patch };
      setAnswers(merged);
      setErrorMessage("");

      if (step < 5) {
        const nextStep = step + 1;
        saveQuestionnaireProgress(nextStep, merged);
        setStep(nextStep);
        return;
      }

      if (step === 5) {
        if (!isCompleteAnswers(merged)) {
          setErrorMessage("Please complete all steps before finishing.");
          return;
        }

        setSubmitting(true);
        try {
          const { firstBranchId } = await applyOnboardingQuestionnaire(merged, {
            business,
            branches,
            itemTypes,
            logoFile: extras?.logoFile ?? null,
          });
          await Promise.all([
            refreshBranches(),
            refreshItemTypes(),
            refreshSession(),
          ]);
          if (firstBranchId) {
            setBranchId(firstBranchId);
          }
          completeOnboardingQuestionnaire(merged);
          saveQuestionnaireProgress(6, merged);
          setStep(6);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not finish setup. Try again.",
          );
        } finally {
          setSubmitting(false);
        }
        return;
      }
    },
    [
      answers,
      step,
      business,
      branches,
      itemTypes,
      refreshBranches,
      refreshItemTypes,
      refreshSession,
      setBranchId,
    ],
  );

  const contextValue = useMemo(
    () => ({ active, reopen: startQuestionnaire }),
    [active, startQuestionnaire],
  );

  const layer =
    active && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[600] overflow-y-auto bg-white">
            <OnboardingQuestionnaire
              step={step}
              initialAnswers={answers}
              businessName={business?.name}
              businessSlug={business?.slug}
              brandingDisplayName={business?.branding?.displayName}
              countryCode={business?.countryCode}
              currency={business?.currency}
              catalogShellEmpty={catalogShellEmpty}
              catalogLabel={catalogLabel}
              suggestedPack={suggestedPack}
              packLoading={packLoading}
              submitting={submitting}
              errorMessage={errorMessage}
              onContinue={(patch, extras) => {
                void handleContinue(patch, extras);
              }}
              onBack={handleBack}
              onSkip={handleSkip}
              canBrowseGlobalCatalog={canGlobalCatalog}
              onBrowseCatalog={handleBrowseCatalog}
              onImportSuggestedPack={handleImportSuggestedPack}
              onAddProductsManually={handleAddProductsManually}
              onFinishLater={handleFinishLater}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <OnboardingQuestionnaireContext.Provider value={contextValue}>
      {children}
      {layer}
    </OnboardingQuestionnaireContext.Provider>
  );
}

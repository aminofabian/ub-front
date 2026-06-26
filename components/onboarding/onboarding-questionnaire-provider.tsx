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
import { hasPermission, Permission } from "@/lib/permissions";
import { applyOnboardingQuestionnaire } from "@/lib/onboarding-questionnaire-apply";
import {
  QUESTIONNAIRE_STEP_COUNT,
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
};

const OnboardingQuestionnaireContext =
  createContext<OnboardingQuestionnaireContextValue>({
    active: false,
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
    Boolean(answers.storeType) &&
    Array.isArray(answers.selectedDepartments) &&
    answers.selectedDepartments.length > 0 &&
    Boolean(answers.onlineStore) &&
    Boolean(answers.displayName?.trim()) &&
    Boolean(answers.primaryColor?.trim()) &&
    Boolean(answers.accentColor?.trim())
  );
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    router.replace(APP_ROUTES.overview);
  }, [router]);

  const handleBrowseCatalog = useCallback(() => {
    setActive(false);
    router.replace(`${APP_ROUTES.productsCatalog}?from=onboarding`);
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

  const contextValue = useMemo(() => ({ active }), [active]);

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
              submitting={submitting}
              errorMessage={errorMessage}
              onContinue={(patch, extras) => {
                void handleContinue(patch, extras);
              }}
              onBack={handleBack}
              onSkip={handleSkip}
              canBrowseGlobalCatalog={canGlobalCatalog}
              onBrowseCatalog={handleBrowseCatalog}
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

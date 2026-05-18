"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { OnboardingSpotlight } from "@/components/onboarding/onboarding-spotlight";
import { OnboardingTourCard } from "@/components/onboarding/onboarding-tour-card";
import {
  ONBOARDING_TOUR_STEPS,
  activateOnboardingTour,
  completeOnboardingTour,
  dismissOnboardingTour,
  emitOnboardingTourEvent,
  getOnboardingTourState,
  needsBranchSetup,
  nextStepId,
  prevStepId,
  setOnboardingTourStep,
  shouldStartOnboardingTour,
  stepById,
  stepIndex,
  tourRouteForStep,
  type OnboardingStepId,
  type OnboardingTourStep,
} from "@/lib/onboarding-tour";

type OnboardingTourContextValue = {
  active: boolean;
  resumeTour: () => void;
};

const OnboardingTourContext = createContext<OnboardingTourContextValue>({
  active: false,
  resumeTour: () => {},
});

export function useOnboardingTour() {
  return useContext(OnboardingTourContext);
}

function resolveStep(stepId: OnboardingStepId | null): OnboardingTourStep {
  return stepById(stepId ?? "branch") ?? ONBOARDING_TOUR_STEPS[0]!;
}

export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { branchId, branches } = useDashboard();
  const [active, setActive] = useState(false);
  const [stepId, setStepId] = useState<OnboardingStepId>("branch");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const step = useMemo(() => resolveStep(stepId), [stepId]);
  const stepNumber = stepIndex(step.id) + 1;
  const totalSteps = ONBOARDING_TOUR_STEPS.length;

  const goToStep = useCallback(
    (id: OnboardingStepId) => {
      const next = resolveStep(id);
      const num = stepIndex(id) + 1;
      setOnboardingTourStep(id);
      setStepId(id);
      emitOnboardingTourEvent({
        kind: "step-entered",
        stepId: id,
        stepNumber: num,
      });
      router.push(tourRouteForStep(next));
    },
    [router],
  );

  const startTour = useCallback(() => {
    const stored = getOnboardingTourState();
    const initial = stored.stepId ?? "branch";
    activateOnboardingTour(initial);
    setStepId(initial);
    setActive(true);
    goToStep(initial);
  }, [goToStep]);

  useEffect(() => {
    if (shouldStartOnboardingTour()) {
      startTour();
    }
  }, [startTour]);

  const advance = useCallback(() => {
    const currentNum = stepNumber;
    const nextId = nextStepId(step.id);
    emitOnboardingTourEvent({
      kind: "step-completed",
      stepId: step.id,
      stepNumber: currentNum,
    });
    if (!nextId) {
      completeOnboardingTour();
      emitOnboardingTourEvent({ kind: "tour-completed" });
      setActive(false);
      return;
    }
    if (nextId === "complete") {
      goToStep(nextId);
      return;
    }
    goToStep(nextId);
  }, [goToStep, step.id, stepNumber]);

  const goBack = useCallback(() => {
    const prevId = prevStepId(step.id);
    if (!prevId) {
      return;
    }
    goToStep(prevId);
  }, [goToStep, step.id]);

  const canGoBack = prevStepId(step.id) !== null;

  const branchSetupRequired = useMemo(
    () => needsBranchSetup(branches, branchId),
    [branches, branchId],
  );

  const goToBranchStep = useCallback(() => {
    goToStep("branch");
  }, [goToStep]);

  const skipStep = useCallback(() => {
    emitOnboardingTourEvent({
      kind: "step-skipped",
      stepId: step.id,
      stepNumber: stepNumber,
    });
    advance();
  }, [advance, step.id, stepNumber]);

  const skipTour = useCallback(() => {
    emitOnboardingTourEvent({ kind: "tour-dismissed", lastStepId: step.id });
    dismissOnboardingTour();
    setActive(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("onboarding");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams, step.id]);

  const finishComplete = useCallback(() => {
    completeOnboardingTour();
    setActive(false);
  }, []);

  useEffect(() => {
    if (active && step.id === "complete" && pathname === step.route) {
      // User landed on overview for completion — keep card visible until they click a CTA
    }
  }, [active, pathname, step]);

  const resumeTour = useCallback(() => {
    const stored = getOnboardingTourState();
    if (stored.status === "completed" || stored.status === "dismissed") {
      return;
    }
    activateOnboardingTour(stored.stepId ?? "branch");
    startTour();
  }, [startTour]);

  const contextValue = useMemo(
    () => ({ active, resumeTour }),
    [active, resumeTour],
  );

  const isCompleteStep = step.id === "complete";

  const pageOnly = step.cardAnchor === "page-left";

  const tourLayer =
    active && mounted
      ? createPortal(
          <>
            <OnboardingSpotlight
              target={step.target}
              emphasisTarget={step.emphasisTarget ?? null}
              active={active}
              dimMode={pageOnly ? "page-only" : "full"}
            />
            <div
              className="pointer-events-none fixed inset-0"
              style={{ zIndex: 500 }}
            >
              <OnboardingTourCard
                step={step}
                stepNumber={stepNumber}
                totalSteps={totalSteps}
                onNext={isCompleteStep ? finishComplete : advance}
                onBack={goBack}
                canGoBack={canGoBack && !isCompleteStep}
                branchSetupRequired={
                  isCompleteStep && branchSetupRequired
                }
                onBackToBranch={goToBranchStep}
                onSkipStep={skipStep}
                onSkipTour={skipTour}
                isCompleteStep={isCompleteStep}
              />
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <OnboardingTourContext.Provider value={contextValue}>
      {children}
      {tourLayer}
    </OnboardingTourContext.Provider>
  );
}

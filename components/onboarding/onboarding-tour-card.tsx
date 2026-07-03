"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  ONBOARDING_CARD_SIZE_DEFAULT,
  computeTourCardPosition,
  useOnboardingTargetAnchor,
} from "@/lib/onboarding-anchor";
import type { OnboardingTourStep } from "@/lib/onboarding-tour";
import { cn } from "@/lib/utils";

type Props = {
  step: OnboardingTourStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  onSkipStep: () => void;
  onSkipTour: () => void;
  isCompleteStep?: boolean;
  /** Step 9 — no branch yet; show back to branch setup. */
  branchSetupRequired?: boolean;
  onBackToBranch?: () => void;
};

export function OnboardingTourCard({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  canGoBack,
  onSkipStep,
  onSkipTour,
  isCompleteStep,
  branchSetupRequired = false,
  onBackToBranch,
}: Props) {
  const router = useRouter();
  const isLast = step.id === "complete";
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState(ONBOARDING_CARD_SIZE_DEFAULT);
  const anchor = useOnboardingTargetAnchor(
    isCompleteStep ? null : step.target,
    !isCompleteStep,
  );

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) {
        setCardSize({ width: box.width, height: box.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step.id, stepNumber, isCompleteStep]);

  const positionStyle = useMemo(() => {
    if (isCompleteStep || !anchor) {
      return undefined;
    }
    const pos = computeTourCardPosition(
      anchor,
      cardSize,
      step.cardAnchor ?? "near-target",
    );
    return { top: pos.top, left: pos.left };
  }, [anchor, cardSize, isCompleteStep, step.cardAnchor]);

  return (
    <div
      ref={cardRef}
      role="region"
      aria-labelledby="onboarding-tour-title"
      style={positionStyle}
      className={cn(
        "pointer-events-auto fixed z-[500] w-[min(100vw-2rem,24rem)] rounded-2xl border border-border/80 bg-card p-5 shadow-2xl transition-[top,left] duration-200",
        isCompleteStep || !positionStyle
          ? "bottom-6 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2"
          : "translate-x-0 translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Setup guide
        </p>
        <button
          type="button"
          onClick={onSkipTour}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Skip tour
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <span>
          Step {stepNumber} of {totalSteps}
          {step.optional ? (
            <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Optional
            </span>
          ) : null}
        </span>
      </div>

      <h2
        id="onboarding-tour-title"
        className="mt-3 text-lg font-semibold tracking-tight text-foreground"
      >
        {step.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {step.keyMessage}
      </p>

      {step.instructions.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-foreground/90">
          {step.instructions.map((line) => (
            <li key={line} className="flex gap-2">
              <span
                className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {isCompleteStep ? (
        <div className="mt-4 flex flex-col gap-2">
          {branchSetupRequired ? (
            <>
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                Branch is required. Select a branch or add your first shop
                location before using the dashboard.
              </p>
              <Button
                type="button"
                className="w-full gap-2"
                onClick={onBackToBranch}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back to add a branch
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            className="w-full gap-2"
            disabled={branchSetupRequired}
            onClick={() => {
              onNext();
              router.push(APP_ROUTES.business);
            }}
          >
            Go to dashboard
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={branchSetupRequired}
            onClick={() => {
              onNext();
              router.push(APP_ROUTES.products);
            }}
          >
            Add more products
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={branchSetupRequired}
            onClick={() => {
              onNext();
              router.push(APP_ROUTES.analytics);
            }}
          >
            Explore reports
          </Button>
          {canGoBack && !branchSetupRequired ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {canGoBack ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          ) : null}
          <Button type="button" className="gap-2" onClick={onNext}>
            {isLast ? "Finish" : "Next"}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          {step.optional ? (
            <Button type="button" variant="ghost" onClick={onSkipStep}>
              Skip step
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

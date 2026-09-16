"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList } from "lucide-react";

import { useOnboardingQuestionnaire } from "@/components/onboarding/onboarding-questionnaire-provider";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import {
  getOnboardingQuestionnaireState,
  needsOnboardingQuestionnaireResume,
} from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";

type QuestionnaireResumeBannerProps = {
  /** Server onboarding.status from business payload. */
  businessOnboardingStatus?: string | null;
  /** When catalog has zero sellable items — completed shops still need stock. */
  catalogEmpty?: boolean;
  enabled?: boolean;
  className?: string;
};

/**
 * Durable hub CTA when shop setup was skipped or never finished.
 * Soft-skip only parks the overlay for this session; this banner brings it back.
 */
export function QuestionnaireResumeBanner({
  businessOnboardingStatus,
  catalogEmpty = false,
  enabled = true,
  className,
}: QuestionnaireResumeBannerProps) {
  const { active, reopen } = useOnboardingQuestionnaire();
  const [visible, setVisible] = useState(false);
  const [stepLabel, setStepLabel] = useState("Finish setting up your shop");

  useEffect(() => {
    if (!enabled || active) {
      setVisible(false);
      return;
    }
    const needs = needsOnboardingQuestionnaireResume(businessOnboardingStatus, {
      catalogEmpty,
    });
    setVisible(needs);
    if (needs) {
      const state = getOnboardingQuestionnaireState();
      const step = Math.max(1, state.step || 1);
      const awaitingStock =
        step >= 8 ||
        (businessOnboardingStatus?.trim().toLowerCase() === "completed" &&
          catalogEmpty);
      setStepLabel(
        awaitingStock
          ? "Stock your shelves to finish setup"
          : step > 1
            ? `Resume shop setup · step ${step}`
            : "Finish setting up your shop",
      );
    }
  }, [enabled, active, businessOnboardingStatus, catalogEmpty]);

  if (!enabled || active || !visible) {
    return null;
  }

  return (
    <section
      className={cn(HUB_SURFACE, "overflow-hidden bg-[#ffffff]", className)}
      aria-label="Resume shop setup"
    >
      <div className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-[#0f766e]/10 text-[#0f766e]"
            aria-hidden
          >
            <ClipboardList className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#141414]">{stepLabel}</p>
            <p className={cn("mt-0.5 text-[12px] leading-snug", HUB_MUTED)}>
              Branches, branding, and shelves — pick up where you left off. Takes
              a minute.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => reopen()}
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 bg-[#0f766e] px-3 text-sm font-semibold text-white hover:opacity-90 sm:h-8 sm:w-auto sm:text-xs sm:font-medium"
        >
          Resume setup
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}

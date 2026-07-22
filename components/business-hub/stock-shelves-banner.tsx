"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";

import { useOnboardingQuestionnaire } from "@/components/onboarding/onboarding-questionnaire-provider";
import { APP_ROUTES } from "@/lib/config";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import {
  getOnboardingQuestionnaireState,
  resumeOnboardingQuestionnaire,
} from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";

const STOCK_BANNER_DISMISSED_KEY = "palmart.stock-shelves-banner.dismissed";

type StockShelvesBannerProps = {
  /** When null, banner stays hidden until count is known. */
  catalogueCount: number | null;
  className?: string;
};

/**
 * Persistent nudge for shops that finished (or skipped) onboarding
 * without importing products yet.
 */
export function StockShelvesBanner({
  catalogueCount,
  className,
}: StockShelvesBannerProps) {
  const { reopen } = useOnboardingQuestionnaire();
  const [dismissed, setDismissed] = useState(true);
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(STOCK_BANNER_DISMISSED_KEY) === "1");
    const state = getOnboardingQuestionnaireState();
    setCanResume(state.status === "dismissed");
  }, []);

  if (dismissed || catalogueCount == null || catalogueCount > 0) {
    return null;
  }

  return (
    <section
      className={cn(
        HUB_SURFACE,
        "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0D9488]">
          <Package className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-black">Stock your shelves</p>
          <p className={cn("text-xs", HUB_MUTED)}>
            Import a starter pack so you can start selling — prices and barcodes
            included.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
        {canResume ? (
          <button
            type="button"
            onClick={() => {
              resumeOnboardingQuestionnaire();
              reopen();
            }}
            className="px-2 text-xs font-medium text-[#0D9488] hover:underline"
          >
            Resume setup
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STOCK_BANNER_DISMISSED_KEY, "1");
            setDismissed(true);
          }}
          className="px-2 text-xs font-medium text-[#888888] hover:text-foreground"
        >
          Dismiss
        </button>
        <Link
          href={`${APP_ROUTES.productsCatalog}?from=onboarding`}
          className="inline-flex h-9 items-center rounded-lg bg-[#0D9488] px-3 text-xs font-semibold text-white hover:bg-[#0F766E]"
        >
          Browse catalog
        </Link>
      </div>
    </section>
  );
}

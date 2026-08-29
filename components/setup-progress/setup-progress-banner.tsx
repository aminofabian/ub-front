"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  X,
} from "lucide-react";

import { SetupProgressGuideDrawer } from "@/components/setup-progress/setup-progress-guide-drawer";
import { useSetupProgress } from "@/hooks/use-setup-progress";
import { dismissSetupProgress, snoozeSetupProgress } from "@/lib/api";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import type { SetupProgressStepRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type SetupProgressBannerProps = {
  enabled?: boolean;
  className?: string;
};

export function SetupProgressBanner({
  enabled = true,
  className,
}: SetupProgressBannerProps) {
  const { data, reload } = useSetupProgress({ enabled });
  const [expanded, setExpanded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!enabled || !data?.visible) {
    return null;
  }

  const current = data.steps.find((s) => s.status === "current") ?? null;
  const currentLabel = current?.label ?? "Getting your shop ready";
  const actionUrl = current?.actionUrl ?? "/business";

  const onSnooze = async () => {
    setBusy(true);
    try {
      await snoozeSetupProgress(24);
      await reload();
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  };

  const onDismiss = async () => {
    setBusy(true);
    try {
      await dismissSetupProgress();
      await reload();
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section
        className={cn(
          HUB_SURFACE,
          "overflow-hidden border-[#B08D48]/30 bg-[#FCFAF6]",
          className,
        )}
        aria-label="Shop setup progress"
      >
        <div className="flex flex-col">
          <div className="flex min-h-11 items-center gap-2.5 px-3 py-2 sm:px-3.5">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <div className="flex shrink-0 items-center gap-1">
                {data.steps.map((step) => (
                  <StepDot key={step.key} step={step} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#141414]">
                  {currentLabel}
                </p>
                <p className={cn("text-[11px]", HUB_MUTED)}>
                  {data.percentComplete}% complete
                </p>
              </div>
              {expanded ? (
                <ChevronUp className="size-3.5 shrink-0 text-[#888888]" aria-hidden />
              ) : (
                <ChevronDown className="size-3.5 shrink-0 text-[#888888]" aria-hidden />
              )}
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="px-2 text-xs font-medium text-[#8A6B2E] hover:underline"
                onClick={() => setGuideOpen(true)}
              >
                How?
              </button>
              <Link
                href={actionUrl}
                className="inline-flex h-8 items-center gap-1 bg-[#141414] px-2.5 text-xs font-semibold text-[#F5E6C8] hover:bg-[#2A2A2A]"
              >
                <span className="hidden sm:inline">Go</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          {expanded ? (
            <div className="border-t border-[#E6E1D8]/80 px-3.5 py-3 sm:px-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#141414]">
                  Getting your shop ready
                </p>
                <p className="text-xs text-[#888888]">{data.percentComplete}%</p>
              </div>

              <ul className="space-y-2">
                {data.steps.map((step) => (
                  <li key={step.key}>
                    <ExpandedStepRow step={step} />
                  </li>
                ))}
              </ul>

              {current?.subMilestones.length ? (
                <div className="mt-3 space-y-1.5 border-t border-[#E6E1D8]/70 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#888888]">
                    Current · {current.label}
                  </p>
                  {current.subMilestones.map((sub) => (
                    <div
                      key={sub.key}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span
                        className={cn(
                          sub.completed ? "text-[#0D9488]" : "text-[#141414]",
                        )}
                      >
                        {sub.completed ? "✓ " : "○ "}
                        {sub.label}
                      </span>
                      <span className="shrink-0 text-[#888888]">{sub.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[#E6E1D8]/70 pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSnooze()}
                  className="px-2 text-xs font-medium text-[#888888] hover:text-foreground disabled:opacity-50"
                >
                  Remind later
                </button>
                {data.percentComplete >= 80 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDismiss()}
                    className="inline-flex items-center gap-1 px-2 text-xs font-medium text-[#888888] hover:text-foreground disabled:opacity-50"
                  >
                    <X className="size-3" aria-hidden />
                    Dismiss
                  </button>
                ) : null}
                <Link
                  href={actionUrl}
                  className="inline-flex h-8 items-center gap-1 bg-[#141414] px-3 text-xs font-semibold text-[#F5E6C8] hover:bg-[#2A2A2A]"
                >
                  Do this
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <SetupProgressGuideDrawer
        open={guideOpen}
        onOpenChange={setGuideOpen}
        stepKey={data.currentStepKey}
        recommendedSubKey={current?.recommendedSubKey}
      />
    </>
  );
}

function StepDot({ step }: { step: SetupProgressStepRecord }) {
  const done = step.status === "completed";
  const current = step.status === "current";
  return (
    <span
      className={cn(
        "size-2 rounded-full transition-colors",
        done && "bg-[#0D9488]",
        current && "bg-[#B08D48] ring-2 ring-[#B08D48]/25",
        !done && !current && "bg-[#E6E1D8]",
      )}
      title={step.label}
      aria-hidden
    />
  );
}

function ExpandedStepRow({ step }: { step: SetupProgressStepRecord }) {
  const done = step.status === "completed";
  const current = step.status === "current";
  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs",
        done && "text-[#0D9488]",
        current && "text-[#141414]",
        !done && !current && "text-[#AAAAAA]",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {done ? (
          <Check className="size-3.5" aria-hidden />
        ) : current ? (
          <Package className="size-3.5 text-[#B08D48]" aria-hidden />
        ) : (
          <span className="inline-block size-3.5 rounded-full border border-[#E6E1D8]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", current && "text-[#141414]")}>{step.label}</p>
        {step.earnedPoints > 0 ? (
          <p className="text-[#888888]">
            {step.earnedPoints}/{step.maxPoints} pts
          </p>
        ) : null}
      </div>
    </div>
  );
}

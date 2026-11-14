"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { DASHBOARD_TABLE_SURFACE, dashboardHintClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { CommissionPlanRecord } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { commissionSetupSteps } from "./commission-summary";

const DISMISSED_KEY = "kiosk.commissions.guide.dismissed.v1";
export const PAY_MODEL_CHOSEN_KEY = "kiosk.commissions.payModelChosen.v1";
export const PAY_MODEL_CHOSEN_EVENT = "kiosk:pay-model-chosen";

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Brings a part of the page into view and puts the keyboard there. */
function goTo(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  const field = target.querySelector<HTMLElement>("input, select, button");
  field?.focus({ preventScroll: true });
}

/**
 * The order of work for an owner setting up pay for the first time: add the team, choose what
 * commission is worked out on, set each person's share, send them their sign-ins. It reads what
 * is already there, so it is right on a second visit, and goes away once the pay is set up.
 */
export function GetStartedGuide({ plans, canManage }: { plans: CommissionPlanRecord[]; canManage: boolean }) {
  // Read after mount: the server cannot know what this browser has dismissed or chosen.
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modelChosen, setModelChosen] = useState(false);

  useEffect(() => {
    setDismissed(read(DISMISSED_KEY));
    setModelChosen(read(PAY_MODEL_CHOSEN_KEY));
    setReady(true);
    const onChosen = () => setModelChosen(true);
    window.addEventListener(PAY_MODEL_CHOSEN_EVENT, onChosen);
    return () => window.removeEventListener(PAY_MODEL_CHOSEN_EVENT, onChosen);
  }, []);

  const steps = commissionSetupSteps(plans, modelChosen);
  const needed = steps.filter((step) => !step.optional);
  const left = needed.filter((step) => !step.done).length;
  if (!ready || dismissed || !canManage || left === 0) return null;
  const next = steps.find((step) => !step.done) ?? null;

  return (
    <section className={DASHBOARD_TABLE_SURFACE} aria-labelledby="commission-guide-heading">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-3 pb-1 pt-2.5 sm:px-3.5">
        <div className="min-w-0">
          <h2 id="commission-guide-heading" className="font-heading text-[1.15rem] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">
            Get your team paid
          </h2>
          <p className={cn("mt-0.5", dashboardHintClass())}>
            {needed.length - left} of the {needed.length} steps you need are done. Do them in order; each takes a minute. The
            last one is optional.
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 text-[13px] text-[var(--op-muted)] underline decoration-[var(--op-rule)] underline-offset-2 hover:text-[var(--op-ink)] sm:min-h-0"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISSED_KEY, "1");
            } catch {
              // Private browsing: it just comes back next time.
            }
            setDismissed(true);
          }}
        >
          Hide this
        </button>
      </div>
      <ol className="mt-1.5 grid gap-px bg-[var(--op-rule)] sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const isNext = next?.id === step.id;
          return (
            <li key={step.id} className={cn("flex flex-col gap-1.5 bg-[var(--op-surface)] px-3 py-2.5 sm:px-3.5", isNext && "bg-[var(--op-accent-soft)]")}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold tabular-nums",
                    step.done
                      ? "border-[var(--op-accent)] bg-[var(--op-accent)] text-[var(--op-surface)]"
                      : "border-[color-mix(in_srgb,var(--op-ink)_32%,transparent)] text-[var(--op-ink)]",
                  )}
                >
                  {step.done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">
                  {step.title}
                  <span className="sr-only">{step.done ? ", done" : isNext ? ", next" : ""}</span>
                </span>
              </span>
              <span className="text-[12.5px] leading-snug text-[var(--op-muted)]">{step.detail}</span>
              <Button
                size="sm"
                variant={isNext ? "default" : "ghost"}
                className="mt-auto h-11 w-fit rounded-[2px] px-2.5 text-[13px] shadow-none sm:h-8"
                onClick={() => goTo(step.target)}
              >
                {step.done ? step.changeLabel : step.actionLabel}
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

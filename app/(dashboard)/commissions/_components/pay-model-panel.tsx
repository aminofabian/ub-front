"use client";

import { useEffect, useState } from "react";

import { DASHBOARD_TABLE_HEAD, DASHBOARD_TABLE_SURFACE, dashboardHintClass } from "@/components/dashboard-page-ui";
import { fetchPayModel, setPayModel, type ServicePayModel } from "@/lib/service-business-api";
import { cn } from "@/lib/utils";

import { PAY_MODEL_CHOSEN_EVENT, PAY_MODEL_CHOSEN_KEY } from "./get-started-guide";

/** Remembers on this device that the owner has looked at the choice and made it. */
function markChosen() {
  try {
    window.localStorage.setItem(PAY_MODEL_CHOSEN_KEY, "1");
  } catch {
    // Private browsing: the guide just asks again next time.
  }
  window.dispatchEvent(new Event(PAY_MODEL_CHOSEN_EVENT));
}

const CHOICES: { id: ServicePayModel; title: string; how: string; example: string }[] = [
  {
    id: "GROSS",
    title: "On the full price",
    how: "Each person's commission is worked out on everything the customer pays. The shop pays for products out of its own part.",
    example: "Ksh 1,000 gel set, 50% commission: staff Ksh 500, shop Ksh 500, and the Ksh 300 of gel comes out of the shop's 500.",
  },
  {
    id: "NET_OF_PRODUCT",
    title: "After product cost",
    how: "The service's product cost is taken off the price first and stays with the shop. Commission is worked out on what is left.",
    example: "Ksh 1,000 gel set with Ksh 300 of gel, 50% commission: staff Ksh 350, shop Ksh 350 plus the Ksh 300 for the gel.",
  },
];

/**
 * How the shop works out commission on a service: on the whole price, or after the service's
 * product cost. One choice for the shop; it applies to services sold from then on.
 */
export function PayModelPanel({ canManage }: { canManage: boolean }) {
  const [model, setModel] = useState<ServicePayModel | null>(null);
  const [saving, setSaving] = useState<ServicePayModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchPayModel().then((found) => {
      if (!live) return;
      setModel(found);
      // Anything but the starting model was chosen by someone.
      if (found === "NET_OF_PRODUCT") markChosen();
    });
    return () => {
      live = false;
    };
  }, []);

  async function choose(next: ServicePayModel) {
    if (!canManage || saving) return;
    // Tapping the one already on is the owner saying "yes, this one".
    markChosen();
    if (next === model) return;
    setError(null);
    setSaving(next);
    try {
      setModel(await setPayModel(next));
    } catch {
      setError("Could not change it. Check your connection and try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section id="pay-model" className={cn(DASHBOARD_TABLE_SURFACE, "scroll-mt-4")} aria-labelledby="pay-model-heading">
      <div className={DASHBOARD_TABLE_HEAD}>
        <h2 id="pay-model-heading" className="text-[13px] font-semibold tracking-[-0.02em]">
          What commission is worked out on
        </h2>
        <p className={cn("mt-0.5", dashboardHintClass())}>
          A change applies to services sold from now on. What was already earned stays as it was.
        </p>
      </div>
      <div className="grid gap-px bg-[var(--op-rule)] sm:grid-cols-2" role="radiogroup" aria-labelledby="pay-model-heading">
        {CHOICES.map((choice) => {
          const on = model === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!canManage || model == null || saving != null}
              onClick={() => void choose(choice.id)}
              className={cn(
                "flex flex-col gap-1.5 bg-[var(--op-surface)] px-3 py-2.5 text-left sm:px-3.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--op-accent)]",
                canManage && !on && "hover:bg-[var(--op-bg)]",
                on && "bg-[var(--op-accent-soft)]",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded-full border",
                    on ? "border-[var(--op-accent)]" : "border-[color-mix(in_srgb,var(--op-ink)_32%,transparent)]",
                  )}
                >
                  {on ? <span className="size-2 rounded-full bg-[var(--op-accent)]" /> : null}
                </span>
                <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">{choice.title}</span>
                {saving === choice.id ? <span className="text-[12px] text-[var(--op-muted)]">Saving…</span> : null}
              </span>
              <span className="text-[13px] leading-snug text-[var(--op-ink)]">{choice.how}</span>
              <span className="text-[12px] leading-snug text-[var(--op-muted)]">{choice.example}</span>
            </button>
          );
        })}
      </div>
      {model === "NET_OF_PRODUCT" ? (
        <p className={cn("border-t border-[var(--op-rule)] px-3 py-2 sm:px-3.5", dashboardHintClass())}>
          Set each service&apos;s product cost where you edit the service. A service with none is paid on its full price.
        </p>
      ) : null}
      {!canManage ? (
        <p className={cn("border-t border-[var(--op-rule)] px-3 py-2 sm:px-3.5", dashboardHintClass())}>
          Only someone who manages commission plans can change this.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="border-t border-[var(--op-rule)] px-3 py-2 text-[13px] text-[var(--op-highlight)] sm:px-3.5">
          {error}
        </p>
      ) : null}
    </section>
  );
}

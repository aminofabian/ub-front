"use client";

import { Button } from "@/components/ui/button";

import {
  ABANDONED_CART_MAX_ATTEMPTS,
  AUTOMATIONS,
  FEATURE_DRIP_INTERVAL_DAYS,
  FEATURE_DRIP_MAX_EMAIL_ATTEMPTS,
  TEMPLATES,
} from "./campaigns-model";

export function CampaignsTemplates({
  onUse,
  onCopy,
  automations,
}: {
  onUse?: (t: (typeof TEMPLATES)[number]) => void;
  onCopy?: (t: (typeof TEMPLATES)[number]) => void;
  automations?: boolean;
}) {
  if (automations) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold">Automations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lifecycle sequences. Emails every {FEATURE_DRIP_INTERVAL_DAYS} days —
          never two emails the same day. Cap {FEATURE_DRIP_MAX_EMAIL_ATTEMPTS}{" "}
          emails per topic; abandoned carts stop after{" "}
          {ABANDONED_CART_MAX_ATTEMPTS} attempts.
        </p>
        <ul className="mt-6 space-y-3">
          {AUTOMATIONS.map((a) => (
            <li key={a.id} className="rounded-xl border border-border/70 bg-white p-4">
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Trigger: {a.trigger}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                {a.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const families = [...new Set(TEMPLATES.map((t) => t.family))];
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Templates</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Onboarding through re-engagement — reuse structure, copy, and CTA.
        Feature guides auto-schedule on Day 0 / 2 / 4 so they never collide.
      </p>
      {families.map((family) => (
        <div key={family} className="mt-6">
          <h2 className="text-sm font-semibold">{family}</h2>
          <ul className="mt-2 divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-white">
            {TEMPLATES.filter((t) => t.family === family).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.subject} · typical open {(t.openRate * 100).toFixed(0)}%
                    {typeof t.dripDayOffset === "number"
                      ? ` · schedule Day ${t.dripDayOffset}`
                      : ""}
                  </p>
                  {t.smsBody ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-emerald-800/80">
                      SMS companion ready · audience:{" "}
                      {t.defaultFilters?.join(", ") || "manual"}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onCopy?.(t)}>
                    Use as template
                  </Button>
                  <Button type="button" size="sm" onClick={() => onUse?.(t)}>
                    Use template
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

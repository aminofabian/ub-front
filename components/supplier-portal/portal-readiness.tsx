"use client";

import { useEffect, useState } from "react";

import {
  fetchSupplierPortalOverview,
  fetchSupplierPortalReadiness,
  type SupplierPortalOverview,
  type SupplierPortalReadiness,
} from "@/lib/marketplace-api";
import { timeAgo } from "@/lib/time-ago";

/**
 * The supplier portal's own overview, for a supplier with or without a shop: what is waiting for an answer, how
 * quickly it answers the orders shops send it, its milestones, and the readiness checklist. A step that needs a
 * shop is shown as what comes after opening one, never as a failure. No score, nothing about money. Renders
 * nothing unless platform staff switched it on for this supplier.
 */
export function PortalReadiness() {
  const [readiness, setReadiness] = useState<SupplierPortalReadiness | null>(null);
  const [overview, setOverview] = useState<SupplierPortalOverview | null>(null);

  useEffect(() => {
    fetchSupplierPortalReadiness()
      .then(setReadiness)
      .catch(() => setReadiness(null));
    fetchSupplierPortalOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

  const steps = readiness?.enabled ? readiness.steps : [];
  const showSteps = steps.length > 0 && !steps.every((step) => step.state === "done");
  const showOverview = overview?.enabled === true;
  if (!showSteps && !showOverview) {
    return null;
  }

  return (
    <section aria-label="Your overview" className="space-y-3 border border-black/10 px-3 py-3 text-sm">
      {showOverview && overview ? (
        <>
          {overview.nextThing ? (
            <p>
              <a href={overview.nextThing.url} className="font-medium underline underline-offset-4">
                {overview.nextThing.text}
              </a>
              {overview.oldestWaitingSince ? `. The oldest was sent ${timeAgo(overview.oldestWaitingSince)}.` : ""}
            </p>
          ) : null}
          <p className="text-black/70">
            {overview.state === "measured" && overview.medianAnswerWorkingHours != null
              ? `You usually answer within ${overview.medianAnswerWorkingHours} working hours. Based on ${overview.answeredOrders} orders from ${overview.shops} shops in the last 90 days.`
              : "New on Kiosk. How quickly you answer appears after 10 answered orders from 3 shops."}
          </p>
          {overview.milestones.length > 0 ? (
            <ul className="space-y-0.5">
              {overview.milestones.map((milestone) => (
                <li key={milestone}>{milestone}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {showSteps ? (
        <div>
          <h2 className="font-semibold">Getting ready</h2>
          <ul className="mt-2 space-y-1">
            {steps.map((step) => (
              <li key={step.key}>
                {step.state === "done" ? (
                  <span>{step.label}: Done</span>
                ) : step.state === "after_shop" ? (
                  <span className="text-black/60">{step.label}: After you open a shop</span>
                ) : (
                  <a href={step.actionUrl} className="underline underline-offset-4">
                    {step.label}: To do
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

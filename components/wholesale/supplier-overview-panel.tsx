"use client";

import { useEffect, useState } from "react";

import { fetchSupplierOverview, markSupplierMilestonesSeen, type SupplierOverview } from "@/lib/api";
import { timeAgo } from "@/lib/time-ago";

/** Why a product cannot be ordered yet, what to do about it, and a short guide for the moment it is needed. */
const MISSING: Record<string, { label: string; guide: string }> = {
  price: {
    label: "No selling price",
    guide:
      "A buyer cannot order a product with no price. Open the product, set its selling price and save. A pack needs its own price.",
  },
  online: {
    label: "Not shown in your shop",
    guide:
      "The product exists but is not published to your online shop, so buyers never see it. Open the product and turn on selling online.",
  },
  stock: {
    label: "Out of stock",
    guide:
      "Stock is tracked for this product and none is on hand, so it cannot be ordered. Receive stock for it. A pack takes its stock from the product it is a pack of.",
  },
};

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/**
 * The supplier's overview: the one next thing, the readiness steps, which products a buyer can order and why the
 * others cannot, milestones, repeat buyers, and the signed-in person's own work. No score, no ranking, and
 * nothing about money. Renders nothing while supplier engagement is off for the shop.
 */
export function SupplierOverviewPanel({ quietWhenOff = false }: { quietWhenOff?: boolean } = {}) {
  const [data, setData] = useState<SupplierOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  useEffect(() => {
    fetchSupplierOverview()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  // On the Today page the orders that need the supplier are already listed above this panel, so when the rest is
  // switched off for the shop it simply is not there, instead of saying so.
  if (failed) {
    return quietWhenOff ? null : <p className="mt-6 text-[14px] text-foreground">Could not load the overview.</p>;
  }
  if (!data) {
    return quietWhenOff ? null : <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>;
  }
  if (!data.enabled) {
    return quietWhenOff ? null : (
      <p className="mt-6 text-[14px] text-muted-foreground">The overview is not switched on for this shop.</p>
    );
  }

  const products = data.products;
  const newMilestones = data.milestones.filter((milestone) => !milestone.seen);
  const dismissMilestones = () => {
    // Hidden at once; if the save fails the note simply shows again next time.
    setData({ ...data, milestones: data.milestones.map((milestone) => ({ ...milestone, seen: true })) });
    void markSupplierMilestonesSeen().catch(() => undefined);
  };
  return (
    <div className="mt-4 space-y-6 text-[14px]">
      {newMilestones.length > 0 ? (
        <section
          aria-label="New"
          className="border border-foreground/15 px-3 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        >
          <ul className="space-y-1">
            {newMilestones.map((milestone) => (
              <li key={milestone.key} className="font-medium">
                {milestone.label}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 min-h-11 underline underline-offset-4 sm:min-h-0"
            onClick={dismissMilestones}
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {data.recoveryGoals.length > 0 ? (
        <section aria-label="Worth a look">
          <ul className="space-y-1">
            {data.recoveryGoals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Next" hidden={quietWhenOff && data.waitingToAnswer > 0}>
        {data.nextThing ? (
          <p>
            <a href={data.nextThing.url} className="font-medium underline underline-offset-4">
              {data.nextThing.text}
            </a>
            {data.waitingToAnswer > 0 && data.oldestWaitingSince
              ? `. The oldest was placed ${timeAgo(data.oldestWaitingSince)}.`
              : ""}
          </p>
        ) : (
          <p className="text-muted-foreground">Nothing is waiting for you.</p>
        )}
      </section>

      {data.steps.length > 0 ? (
        <section aria-label="Getting ready">
          <h2 className="font-semibold">Getting ready</h2>
          <ul className="mt-2 space-y-1">
            {data.steps.map((step) => (
              <li key={step.key}>
                {step.done ? (
                  <span>{step.label}: Done</span>
                ) : (
                  <a href={step.actionUrl} className="underline underline-offset-4">
                    {step.label}: To do
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {products ? (
        <section aria-label="Can a buyer order this?">
          <h2 className="font-semibold">Can a buyer order this?</h2>
          <p className="mt-1 text-muted-foreground">
            {products.orderable} of {products.total} products can be ordered.
            {products.orderableWithoutPhoto > 0
              ? ` ${products.orderableWithoutPhoto} of those have no photo; a photo helps a buyer but is not required.`
              : ""}
            {products.packsWithoutSize > 0
              ? ` ${products.packsWithoutSize} ${products.packsWithoutSize === 1 ? "pack has" : "packs have"} no pack size.`
              : ""}
            {products.soldAtCounterOnly > 0
              ? ` ${products.soldAtCounterOnly} ${products.soldAtCounterOnly === 1 ? "medicine is" : "medicines are"} sold at the counter only and ${products.soldAtCounterOnly === 1 ? "is" : "are"} not counted here.`
              : ""}
          </p>
          {products.close.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {products.close.map((product) => (
                <li key={product.itemId} className="border-b border-foreground/10 pb-2">
                  <a href={`/products?item=${encodeURIComponent(product.itemId)}`} className="font-medium underline underline-offset-4">
                    {product.name}
                  </a>
                  <ul className="mt-1 space-y-1">
                    {product.missing.map((reason) => {
                      const entry = MISSING[reason] ?? { label: reason, guide: "" };
                      const guideId = `${product.itemId}:${reason}`;
                      return (
                        <li key={reason}>
                          {entry.label}
                          {entry.guide ? (
                            <>
                              {" "}
                              <button
                                type="button"
                                className="min-h-11 underline underline-offset-4 sm:min-h-0"
                                aria-expanded={openGuide === guideId}
                                onClick={() => setOpenGuide(openGuide === guideId ? null : guideId)}
                              >
                                Why?
                              </button>
                              {openGuide === guideId ? (
                                <p className="mt-1 text-[13px] text-muted-foreground">{entry.guide}</p>
                              ) : null}
                            </>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}
          {products.notOrderable > products.close.length ? (
            <p className="mt-2 text-muted-foreground">
              Showing the {products.close.length} nearest to ready, of {products.notOrderable} that cannot be ordered yet.
            </p>
          ) : null}
        </section>
      ) : null}

      {data.milestones.length > 0 || data.repeatBuyers != null ? (
        <section aria-label="So far">
          <h2 className="font-semibold">So far</h2>
          {data.milestones.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {data.milestones.map((milestone) => (
                <li key={milestone.key}>
                  {milestone.label}
                  {when(milestone.achievedAt) ? `, ${when(milestone.achievedAt)}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {data.repeatBuyers != null ? (
            <p className="mt-2 text-muted-foreground">
              {data.repeatBuyers === 1
                ? "1 shop has ordered from you more than once."
                : `${data.repeatBuyers} shops have ordered from you more than once.`}
            </p>
          ) : null}
        </section>
      ) : null}

      {data.contribution ? (
        <section aria-label="Your own work">
          <h2 className="font-semibold">Your own work</h2>
          <p className="mt-1 text-muted-foreground">
            You have answered {data.contribution.ordersAnsweredWithinAWorkingDay}{" "}
            {data.contribution.ordersAnsweredWithinAWorkingDay === 1 ? "order" : "orders"} within a working day
            {data.contribution.productsMadeOrderable > 0
              ? `, and made ${data.contribution.productsMadeOrderable} ${data.contribution.productsMadeOrderable === 1 ? "product" : "products"} ready for buyers to order`
              : ""}
            . Only you see this.
          </p>
        </section>
      ) : null}
    </div>
  );
}

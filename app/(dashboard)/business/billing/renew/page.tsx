"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BillingPeriodToggle,
  BillingSurface,
  BillingUsageMeter,
  formatBillingMoney,
} from "@/components/billing/billing-ui";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import {
  fetchMe,
  fetchSubscriptionBillingStatus,
  fetchSubscriptionPlans,
  fetchSubscriptionRenewalQuote,
  type SubscriptionBillingStatusRecord,
  type SubscriptionPlanRecord,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  formatPlanCount,
  planFitsUsage,
} from "@/lib/subscription-plan-fit";
import { cn } from "@/lib/utils";

type BillingPeriod = 1 | 12;

export default function BillingRenewPage() {
  const searchParams = useSearchParams();
  const requestedTier = searchParams.get("tier")?.trim().toLowerCase() ?? "";

  const [periodMonths, setPeriodMonths] = useState<BillingPeriod>(1);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    null,
  );
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [quote, setQuote] = useState<SubscriptionRenewalQuoteRecord | null>(
    null,
  );
  const [canPay, setCanPay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const fit = status?.planFit ?? null;
  const productCount = fit?.productCount ?? 0;
  const userCount = fit?.userCount ?? 0;

  const selectedPlan = useMemo(
    () => plans.find((p) => p.tierCode === selectedTier) ?? null,
    [plans, selectedTier],
  );

  const selectedFits = selectedPlan
    ? planFitsUsage(
        selectedPlan.productLimit,
        selectedPlan.cashierLimit,
        productCount,
        userCount,
      )
    : false;

  const talkToUs =
    Boolean(fit?.negotiable) ||
    selectedPlan?.tierCode === "enterprise" ||
    selectedPlan?.tierCode === "free";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [me, billing, catalogue] = await Promise.all([
          fetchMe(),
          fetchSubscriptionBillingStatus(),
          fetchSubscriptionPlans(),
        ]);
        if (cancelled) return;
        setCanPay(
          hasPermission(me.permissions, Permission.BusinessManageSubscription),
        );
        setStatus(billing);
        setPlans(catalogue.filter((p) => p.active));
        const recommended = billing.planFit?.recommendedTier?.trim().toLowerCase();
        const current = billing.tier?.trim().toLowerCase();
        const next =
          (requestedTier &&
            catalogue.some((p) => p.tierCode === requestedTier) &&
            requestedTier) ||
          recommended ||
          current ||
          catalogue[0]?.tierCode ||
          "";
        setSelectedTier(next);
      } catch {
        if (!cancelled) {
          setStatus(null);
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedTier]);

  const loadQuote = useCallback(
    async (tier: string, months: BillingPeriod) => {
      if (!tier || tier === "free" || tier === "enterprise") {
        setQuote(null);
        return;
      }
      setQuoteLoading(true);
      try {
        const q = await fetchSubscriptionRenewalQuote(months, tier);
        setQuote(q);
      } catch {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedTier) return;
    void loadQuote(selectedTier, periodMonths);
  }, [loadQuote, selectedTier, periodMonths]);

  const currentName =
    status?.tierDisplayName?.trim() || status?.tier || "this plan";

  return (
    <BusinessPageLayout
      title="Plan that fits this shop"
      description="We pick the cheapest published plan that covers your catalog and team."
    >
      <div className="mx-auto max-w-2xl space-y-4">
        {fit?.needsUpgrade ? (
          <BillingSurface className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                {currentName} is too small for this shop
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {fit.reasons[0] ??
                  "Usage is above this plan. Choose the plan that matches the shelf you already run."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BillingUsageMeter
                label="Products"
                used={fit.productCount}
                limit={fit.productLimit}
                unit="products"
              />
              <BillingUsageMeter
                label="People"
                used={fit.userCount}
                limit={fit.userLimit}
                unit="people"
              />
            </div>
          </BillingSurface>
        ) : null}

        <BillingSurface className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Reading this shop's usage…
            </div>
          ) : (
            <>
              {plans.length > 0 ? (
                <div className="grid gap-2">
                  {plans.map((plan) => {
                    const fits = planFitsUsage(
                      plan.productLimit,
                      plan.cashierLimit,
                      productCount,
                      userCount,
                    );
                    const isCurrent =
                      plan.tierCode === status?.tier?.trim().toLowerCase();
                    const isRecommended =
                      plan.tierCode === fit?.recommendedTier;
                    const selected = plan.tierCode === selectedTier;
                    return (
                      <button
                        key={plan.tierCode}
                        type="button"
                        disabled={!fits && plan.tierCode !== "enterprise"}
                        onClick={() => setSelectedTier(plan.tierCode)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "border-primary/40 bg-primary/[0.06]"
                            : "border-border/60 bg-muted/10 hover:bg-muted/20",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-heading text-sm font-semibold text-foreground">
                            {plan.displayName}
                            {isCurrent ? (
                              <span className="ml-2 text-xs font-medium text-muted-foreground">
                                Current
                              </span>
                            ) : null}
                            {isRecommended && !isCurrent ? (
                              <span className="ml-2 text-xs font-medium text-primary">
                                Fits this shop
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {plan.productLimit == null
                              ? "Unlimited products"
                              : `${formatPlanCount(plan.productLimit)} products`}
                            {" · "}
                            {plan.cashierLimit == null
                              ? "Unlimited people"
                              : `${formatPlanCount(plan.cashierLimit)} ${plan.cashierLimit === 1 ? "person" : "people"}`}
                          </p>
                          {!fits && plan.tierCode !== "enterprise" ? (
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                              Too small for this shop
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {plan.tierCode === "free"
                            ? "Free"
                            : plan.tierCode === "enterprise"
                              ? "Custom"
                              : formatBillingMoney(plan.monthlyPriceKes)}
                          {plan.tierCode !== "free" &&
                          plan.tierCode !== "enterprise" ? (
                            <span className="block text-right text-[11px] font-medium text-muted-foreground">
                              / mo
                            </span>
                          ) : null}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Could not load plans. Try again later.
                </p>
              )}

              {selectedPlan && !talkToUs ? (
                <BillingPeriodToggle
                  value={periodMonths}
                  onChange={setPeriodMonths}
                />
              ) : null}

              {talkToUs && selectedPlan ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedPlan.tierCode === "free"
                      ? "Free does not cover this shop. Pick a paid plan that fits, or talk to us if you need a custom quote."
                      : "This shop is past self-serve plans. We will quote Enterprise around what you already run."}
                  </p>
                  <Button type="button" className="h-11 w-full sm:w-auto" asChild>
                    <Link href={APP_ROUTES.support}>Talk to us</Link>
                  </Button>
                </div>
              ) : quoteLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading quote…
                </div>
              ) : quote && selectedFits ? (
                <SubscriptionRenewalForm quote={quote} canPay={canPay} />
              ) : selectedPlan && !selectedFits ? (
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.displayName} is still too small for this shop.
                  Pick the highlighted plan.
                </p>
              ) : quote ? (
                <SubscriptionRenewalForm quote={quote} canPay={canPay} />
              ) : selectedPlan ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Could not load a quote for {selectedPlan.displayName}.
                </p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href={APP_ROUTES.businessSettings}>
                  <ArrowLeft className="size-4" aria-hidden />
                  Back to settings
                </Link>
              </Button>
            </>
          )}
        </BillingSurface>
      </div>
    </BusinessPageLayout>
  );
}

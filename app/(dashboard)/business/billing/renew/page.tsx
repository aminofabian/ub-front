"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  formatPlanMoney,
  isPlanDowngrade,
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
  const dailyRevenue = fit?.dailyRevenueKes ?? 0;
  const currentTier = status?.tier?.trim().toLowerCase() ?? "";

  const selectedPlan = useMemo(
    () => plans.find((p) => p.tierCode === selectedTier) ?? null,
    [plans, selectedTier],
  );
  const currentPlan = useMemo(
    () => plans.find((p) => p.tierCode === currentTier) ?? null,
    [plans, currentTier],
  );
  const currentSortOrder = currentPlan?.sortOrder ?? null;

  const selectedFits = selectedPlan
    ? planFitsUsage(
        selectedPlan.productLimit,
        selectedPlan.cashierLimit,
        productCount,
        userCount,
        selectedPlan.dailyRevenueLimitKes,
        dailyRevenue,
      )
    : false;
  const selectedDowngrade = selectedPlan
    ? isPlanDowngrade(selectedPlan.sortOrder, currentSortOrder)
    : false;
  const selectedCustomEnterprise =
    selectedPlan?.tierCode === "enterprise" &&
    selectedPlan.monthlyPriceKes <= 0;

  const talkToUs =
    Boolean(fit?.negotiable) ||
    selectedPlan?.tierCode === "free" ||
    selectedCustomEnterprise;

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
        const active = catalogue
          .filter((p) => p.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setPlans(active);
        const recommended = billing.planFit?.recommendedTier
          ?.trim()
          .toLowerCase();
        const current = billing.tier?.trim().toLowerCase();
        const currentRow = active.find((p) => p.tierCode === current);
        const requestedRow = active.find((p) => p.tierCode === requestedTier);
        const requestedAllowed =
          requestedRow != null &&
          (currentRow == null ||
            !isPlanDowngrade(requestedRow.sortOrder, currentRow.sortOrder));
        const next =
          (requestedAllowed ? requestedTier : "") ||
          recommended ||
          current ||
          active[0]?.tierCode ||
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

  useEffect(() => {
    if (
      !selectedTier ||
      selectedDowngrade ||
      selectedPlan?.tierCode === "free" ||
      selectedCustomEnterprise
    ) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    void fetchSubscriptionRenewalQuote(periodMonths, selectedTier)
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedTier,
    selectedDowngrade,
    selectedPlan,
    selectedCustomEnterprise,
    periodMonths,
  ]);

  const currentName =
    status?.tierDisplayName?.trim() || status?.tier || "this plan";

  return (
    <BusinessPageLayout
      title="Choose a package"
      description="Pick a bigger package and pay with M-Pesa. We highlight the one that fits your catalog, team, and daily sales — packages only move up."
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
            <div className="grid gap-4 sm:grid-cols-3">
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
              <BillingUsageMeter
                label="Daily sales (KES)"
                used={Math.round(fit.dailyRevenueKes ?? 0)}
                limit={fit.dailyRevenueLimit}
                unit="KES/day"
              />
            </div>
          </BillingSurface>
        ) : null}

        <BillingSurface className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Reading this shop’s usage…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
                  Packages
                </h2>
                <p className="text-xs text-muted-foreground">
                  Switch any time · pay with M-Pesa
                </p>
              </div>
              {plans.length > 0 ? (
                <div className="grid gap-2">
                  {plans.map((plan) => {
                    const fits = planFitsUsage(
                      plan.productLimit,
                      plan.cashierLimit,
                      productCount,
                      userCount,
                      plan.dailyRevenueLimitKes,
                      dailyRevenue,
                    );
                    const isCurrent =
                      plan.tierCode === status?.tier?.trim().toLowerCase();
                    const isRecommended =
                      plan.tierCode === fit?.recommendedTier;
                    const selected = plan.tierCode === selectedTier;
                    const downgrade = isPlanDowngrade(
                      plan.sortOrder,
                      currentSortOrder,
                    );
                    const upgrade =
                      currentSortOrder != null &&
                      plan.sortOrder > currentSortOrder;
                    const customEnterprise =
                      plan.tierCode === "enterprise" &&
                      plan.monthlyPriceKes <= 0;
                    return (
                      <button
                        key={plan.tierCode}
                        type="button"
                        disabled={
                          downgrade ||
                          (!fits && plan.tierCode !== "enterprise")
                        }
                        onClick={() => setSelectedTier(plan.tierCode)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-none border px-4 py-3 text-left transition-colors",
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
                            {downgrade ? (
                              <span className="ml-2 text-xs font-medium text-muted-foreground">
                                Lower package
                              </span>
                            ) : null}
                            {isRecommended && !isCurrent && !downgrade ? (
                              <span className="ml-2 text-xs font-medium text-primary">
                                Fits this shop
                              </span>
                            ) : null}
                            {upgrade ? (
                              <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                Upgrade
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
                            {" · "}
                            {plan.dailyRevenueLimitKes == null
                              ? "unlimited daily sales"
                              : `${formatPlanMoney(plan.dailyRevenueLimitKes)}/day`}
                          </p>
                          {downgrade ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Downgrades are not available — talk to us.
                            </p>
                          ) : !fits && plan.tierCode !== "enterprise" ? (
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                              Too small for this shop
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {plan.tierCode === "free"
                            ? "Free"
                            : customEnterprise
                              ? "Custom"
                              : formatBillingMoney(plan.monthlyPriceKes)}
                          {plan.tierCode !== "free" &&
                          !customEnterprise ? (
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
                <p className="rounded-none border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
                  Could not load plans. Try again later.
                </p>
              )}

              <p className="rounded-none border border-border/50 bg-muted/10 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                Packages only move up. Lower packages stay visible so you can
                see what this shop has outgrown — talk to us if you need a
                downgrade.
              </p>

              {selectedPlan && !talkToUs ? (
                <BillingPeriodToggle
                  value={periodMonths}
                  onChange={setPeriodMonths}
                />
              ) : null}

              {selectedDowngrade ? (
                <p className="text-sm text-muted-foreground">
                  Packages only move up. You cannot switch to a lower package —
                  talk to us if you need to.
                </p>
              ) : talkToUs && selectedPlan ? (
                <div className="space-y-3 rounded-none border border-border/60 bg-muted/15 px-4 py-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {selectedPlan.tierCode === "free"
                      ? currentTier === "free"
                        ? "You're on Free. Pick a paid package above to upgrade — lower packages aren't available."
                        : "Free does not cover this shop. Pick a paid plan that fits, or talk to us if you need a custom quote."
                      : selectedCustomEnterprise
                        ? "Enterprise is quoted around what this shop already runs. Talk to us and we will build the package."
                        : "This shop is past self-serve plans. We will quote Enterprise around what you already run."}
                  </p>
                  <Button
                    type="button"
                    className="h-11 w-full sm:w-auto"
                    asChild
                  >
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
                <p className="rounded-none border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
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

"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  BillingPeriodToggle,
  BillingSurface,
} from "@/components/billing/billing-ui";
import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { SubscriptionRenewalForm } from "@/components/subscription-renewal-form";
import { Button } from "@/components/ui/button";
import {
  fetchMe,
  fetchSubscriptionRenewalQuote,
  type SubscriptionRenewalQuoteRecord,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";

type BillingPeriod = 1 | 12;

export default function BillingRenewPage() {
  const [periodMonths, setPeriodMonths] = useState<BillingPeriod>(1);
  const [quote, setQuote] = useState<SubscriptionRenewalQuoteRecord | null>(
    null,
  );
  const [canPay, setCanPay] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuote = useCallback(async (months: BillingPeriod) => {
    setLoading(true);
    try {
      const [me, q] = await Promise.all([
        fetchMe(),
        fetchSubscriptionRenewalQuote(months),
      ]);
      setCanPay(hasPermission(me.permissions, Permission.BusinessManageSubscription));
      setQuote(q);
    } catch {
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuote(periodMonths);
  }, [loadQuote, periodMonths]);

  return (
    <BusinessPageLayout
      title="Renew subscription"
      description="Extend your Kiosk plan with M-Pesa."
    >
      <div className="mx-auto max-w-lg">
        <BillingSurface className="space-y-5">
          <BillingPeriodToggle value={periodMonths} onChange={setPeriodMonths} />

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading quote…
            </div>
          ) : quote ? (
            <SubscriptionRenewalForm quote={quote} canPay={canPay} />
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
              Could not load renewal quote. Try again later or contact support.
            </p>
          )}

          <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href={APP_ROUTES.businessSettings}>
              <ArrowLeft className="size-4" aria-hidden />
              Back to settings
            </Link>
          </Button>
        </BillingSurface>
      </div>
    </BusinessPageLayout>
  );
}

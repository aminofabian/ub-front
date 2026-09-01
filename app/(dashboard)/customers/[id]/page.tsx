"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  User,
  Wallet,
} from "lucide-react";

import {
  DASHBOARD_MAX,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardLoading,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { CustomerEditCard } from "@/components/credits/customer-edit-card";
import { CustomerPurchasesSection } from "@/components/credits/customer-purchases-section";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { useDashboard } from "@/components/dashboard-provider";
import { useFormatMoney } from "@/hooks/use-format-money";
import { fetchCustomerById, type CustomerRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function toNum(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function CustomerOriginBadge({ customer }: { customer: CustomerRecord }) {
  const verified = customer.phones.some(
    (p) => Boolean(p.verifiedAt) && Boolean(p.phone),
  );
  const inferred = customer.origin === "mpesa_inferred";

  if (inferred && !verified) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50">
        Inferred
      </span>
    );
  }
  if (verified) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50">
        Verified
      </span>
    );
  }
  return null;
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "default" | "warning" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums tracking-tight",
          tone === "warning" && "text-amber-700 dark:text-amber-400",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = typeof params.id === "string" ? params.id : "";
  const { loading, canViewCustomers, canManageCustomers } = useDashboard();
  const { formatMoneyCompact: formatKes } = useFormatMoney();

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    kind: "error" | "success";
  } | null>(null);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    setPageLoading(true);
    setMessage(null);
    try {
      const row = await fetchCustomerById(customerId);
      setCustomer(row);
    } catch (e) {
      setCustomer(null);
      setMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not load customer.",
      });
    } finally {
      setPageLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (loading || !canViewCustomers || !customerId) return;
    void loadCustomer();
  }, [loading, canViewCustomers, customerId, loadCustomer]);

  const owed = useMemo(
    () => (customer ? toNum(customer.credit.balanceOwed) : 0),
    [customer],
  );
  const wallet = useMemo(
    () => (customer ? toNum(customer.credit.walletBalance) : 0),
    [customer],
  );

  if (loading || pageLoading) {
    return <DashboardLoading label="Loading customer…" />;
  }

  if (!canViewCustomers) {
    return (
      <DashboardAccessDenied
        title="Customer"
        description="You do not have access to customer records."
        backHref={APP_ROUTES.customers}
        backLabel="All customers"
      />
    );
  }

  if (!customer) {
    return (
      <div className={cn(DASHBOARD_MAX, "space-y-4")}>
        <Link
          href={APP_ROUTES.customers}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All customers
        </Link>
        {message ? (
          <DashboardFeedback kind={message.kind} text={message.text} />
        ) : (
          <p className="text-sm text-muted-foreground">Customer not found.</p>
        )}
      </div>
    );
  }

  const customerLabel =
    customer.customerNo != null ? `C-${customer.customerNo}` : "Customer";

  return (
    <div className={cn(DASHBOARD_MAX, "space-y-5 pb-16")}>
      <div className="space-y-4">
        <Link
          href={APP_ROUTES.customers}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All customers
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {customerLabel}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {customer.name}
              </h1>
              <CustomerOriginBadge customer={customer} />
            </div>
            <p className={cn(dashboardHintClass(), "mt-1.5 max-w-xl")}>
              Profile, balances, and purchase history for this shopper.
            </p>
          </div>

          {owed > 0 && canManageCustomers ? (
            <RemindPaymentButtons
              customerId={customer.id}
              onResult={({ ok, text }) =>
                setMessage({ kind: ok ? "success" : "error", text })
              }
            />
          ) : null}
        </header>
      </div>

      {message ? (
        <DashboardFeedback kind={message.kind} text={message.text} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Tab balance"
          value={formatKes(owed)}
          icon={CreditCard}
          tone={owed > 0 ? "warning" : "muted"}
        />
        <SummaryStat
          label="Wallet"
          value={formatKes(wallet)}
          icon={Wallet}
        />
        <SummaryStat
          label="Loyalty points"
          value={String(customer.credit.loyaltyPoints ?? 0)}
          icon={User}
        />
      </div>

      <CustomerEditCard
        customer={customer}
        canEdit={canManageCustomers}
        onUpdated={setCustomer}
        onFeedback={(kind, text) => setMessage({ kind, text })}
      />

      <CustomerPurchasesSection customerId={customer.id} />

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={APP_ROUTES.creditsOnTab}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted/40"
        >
          <Receipt className="size-4 text-muted-foreground" aria-hidden />
          Credit activity
        </Link>
      </div>
    </div>
  );
}

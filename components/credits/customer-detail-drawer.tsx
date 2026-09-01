"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  History,
  UserRound,
} from "lucide-react";

import { DashboardFeedback, DashboardLoading } from "@/components/dashboard-page-ui";
import { CustomerEditCard } from "@/components/credits/customer-edit-card";
import { CustomerPurchasesSection } from "@/components/credits/customer-purchases-section";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { FormDrawer } from "@/components/form-drawer";
import { useFormatMoney } from "@/hooks/use-format-money";
import { fetchCustomerById, type CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { customerInitials } from "@/components/credits/customer-crm-ui";

type Tab = "profile" | "history";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  canEdit: boolean;
  canRemind: boolean;
  onCustomerUpdated?: (customer: CustomerRecord) => void;
};

export function CustomerDetailDrawer({
  open,
  onOpenChange,
  customerId,
  canEdit,
  canRemind,
  onCustomerUpdated,
}: Props) {
  const { formatMoneyCompact: formatKes } = useFormatMoney();
  const [tab, setTab] = useState<Tab>("profile");
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!customerId || !open) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [customerId, open]);

  useEffect(() => {
    if (!open) {
      setTab("profile");
      return;
    }
    void load();
  }, [open, load]);

  const owed = useMemo(
    () => Number(customer?.credit.balanceOwed ?? 0),
    [customer],
  );

  const onUpdated = (next: CustomerRecord) => {
    setCustomer(next);
    onCustomerUpdated?.(next);
  };

  const tabs: { id: Tab; label: string; icon: typeof UserRound }[] = [
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "history", label: "Purchases", icon: History },
  ];

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      width="extraWide"
      contextLabel="Customer"
      title={customer?.name ?? "Customer profile"}
      description={
        customer?.customerNo != null
          ? `C-${customer.customerNo} · balances, contact, and purchase history`
          : "Balances, contact, and purchase history"
      }
      icon={
        customer ? (
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#F9F6F0] text-xs font-bold text-[#8B6F3A]">
            {customerInitials(customer.name)}
          </span>
        ) : undefined
      }
      banner={
        message ? (
          <DashboardFeedback kind={message.kind} text={message.text} />
        ) : undefined
      }
    >
      {loading ? (
        <DashboardLoading label="Loading customer…" />
      ) : !customer ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Customer not found.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Tab balance
              </p>
              <p
                className={cn(
                  "mt-0.5 text-lg font-semibold tabular-nums",
                  owed > 0 && "text-amber-700 dark:text-amber-400",
                )}
              >
                {formatKes(owed)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Wallet
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatKes(customer.credit.walletBalance)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Loyalty
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {customer.credit.loyaltyPoints ?? 0} pts
              </p>
            </div>
          </div>

          {owed > 0 && canRemind ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="size-4 text-amber-700 dark:text-amber-400" />
                <span className="font-medium">Outstanding tab</span>
              </div>
              <RemindPaymentButtons
                customerId={customer.id}
                onResult={({ ok, text }) =>
                  setMessage({ kind: ok ? "success" : "error", text })
                }
              />
            </div>
          ) : null}

          <div
            className="flex gap-1 rounded-xl border border-border/60 bg-muted/25 p-1"
            role="tablist"
            aria-label="Customer sections"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {tab === "profile" ? (
              <CustomerEditCard
                customer={customer}
                canEdit={canEdit}
                onUpdated={onUpdated}
                onFeedback={(kind, text) => setMessage({ kind, text })}
              />
            ) : (
              <CustomerPurchasesSection customerId={customer.id} />
            )}
          </div>
        </div>
      )}
    </FormDrawer>
  );
}

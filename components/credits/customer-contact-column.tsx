"use client";

import {
  CreditCard,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Wallet,
} from "lucide-react";

import { CustomerPhoneFlag, customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  CRM_INSPECTOR,
  CRM_PANEL,
  customerInitials,
} from "@/components/credits/customer-crm-ui";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { LoyaltyCardLink } from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import type { CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  customer: CustomerRecord | null;
  formatKes: (n: number | string) => string;
  canManage: boolean;
  onEdit: () => void;
  onMessage: () => void;
  onLoyaltyCard: () => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

function BalanceHero({
  label,
  value,
  icon: Icon,
  warning,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        warning
          ? "border-amber-200/70 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
          : "border-border/55 bg-card/80",
      )}
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums tracking-tight",
          warning && "text-amber-800 dark:text-amber-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CustomerContactColumn({
  customer,
  formatKes,
  canManage,
  onEdit,
  onMessage,
  onLoyaltyCard,
  onFeedback,
}: Props) {
  const owed = customer ? Number(customer.credit.balanceOwed ?? 0) : 0;

  return (
    <aside className={cn(CRM_INSPECTOR, "!flex lg:max-w-[20rem]")}>
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Contact & account
        </p>
      </div>

      {!customer ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center text-muted-foreground">
          <Phone className="size-8 opacity-30" />
          <p className="text-sm font-medium text-foreground">Contact panel</p>
          <p className="text-xs leading-relaxed">
            Phones, email, tab balance, and wallet appear here.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#F9F6F0,#efe6d4)] text-base font-bold text-[#8B6F3A] shadow-inner ring-1 ring-[#8B6F3A]/10">
              {customerInitials(customer.name)}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] text-muted-foreground">
                {customer.customerNo != null ? `C-${customer.customerNo}` : "Customer"}
              </p>
              <h2 className="truncate text-base font-bold leading-tight">
                {customer.name}
              </h2>
              <LoyaltyCardLink onClick={onLoyaltyCard} />
            </div>
          </div>

          <div className="space-y-2">
            <BalanceHero
              label="Amount owed"
              value={formatKes(owed)}
              icon={CreditCard}
              warning={owed > 0}
            />
            <BalanceHero
              label="Wallet credit"
              value={formatKes(customer.credit.walletBalance)}
              icon={Wallet}
            />
            <div className={cn(CRM_PANEL, "px-3 py-2.5 text-center")}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Loyalty points
              </p>
              <p className="text-xl font-bold tabular-nums">
                {customer.credit.loyaltyPoints ?? 0}
              </p>
            </div>
          </div>

          {owed > 0 && canManage ? (
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 p-3 dark:bg-amber-950/15">
              <p className="mb-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                Send payment reminder
              </p>
              <RemindPaymentButtons
                customerId={customer.id}
                onResult={({ ok, text }) => onFeedback(ok ? "success" : "error", text)}
              />
            </div>
          ) : null}

          <div className={cn(CRM_PANEL, "space-y-3 p-3")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Reach them
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium">
                    {customerPrimaryPhone(customer.phones) || "No phone"}
                  </p>
                  {customer.phones.map((p) => (
                    <div key={p.id} className="mt-1 text-xs text-muted-foreground">
                      {p.phone}
                      {p.primary ? " · primary" : ""}
                      <CustomerPhoneFlag phone={p.phone} className="block" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 truncate">
                  {customer.email?.trim() || "No email"}
                </p>
              </div>
            </div>
            {customer.notes?.trim() ? (
              <p className="rounded-lg bg-muted/30 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
                {customer.notes.trim()}
              </p>
            ) : null}
          </div>

          {canManage ? (
            <div className="mt-auto flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={onEdit}
              >
                <Pencil className="mr-2 size-4" />
                Edit profile
              </Button>
              <Button
                type="button"
                className="w-full rounded-xl"
                onClick={onMessage}
              >
                <MessageSquare className="mr-2 size-4" />
                Send SMS
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}

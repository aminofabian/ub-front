"use client";

import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";

import { WhiteCard } from "@/components/credits/customer-board-theme";
import { CustomerPhoneFlag } from "@/components/credits/customer-phone-flag";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { LoyaltyCardLink } from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import type { CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

function contactMoney(
  n: number | string | null | undefined,
  currency: string,
): string {
  const val = Number(n ?? 0);
  if (!Number.isFinite(val)) return currency === "KES" ? "KSh 0" : "0";
  const body = val.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const prefix = currency === "KES" ? "KSh " : `${currency.trim()} `;
  return `${prefix}${body}`;
}

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canManage: boolean;
  onEdit: () => void;
  onMessage: () => void;
  onLoyaltyCard: () => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

function BalanceCell({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 px-1 py-1.5 text-center">
      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[11px] font-semibold leading-snug break-words tabular-nums",
          warn ? "text-amber-700 dark:text-amber-400" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CustomerContactColumn({
  customer,
  currency,
  canManage,
  onEdit,
  onMessage,
  onLoyaltyCard,
  onFeedback,
}: Props) {
  const money = (n: number | string | null | undefined) => contactMoney(n, currency);

  if (!customer) {
    return (
      <p className="px-1 py-4 text-xs leading-relaxed text-muted-foreground">
        Pick someone to see phone, email, tab balance, and wallet.
      </p>
    );
  }

  const owed = Number(customer.credit.balanceOwed ?? 0);

  return (
    <div className="flex flex-col gap-1.5">
      <WhiteCard className="overflow-hidden">
        <div className="flex items-start justify-between gap-2 border-b border-border/50 px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {customer.customerNo != null ? `C-${customer.customerNo}` : "Profile"}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug break-words text-foreground">
              {customer.name}
            </p>
          </div>
          <LoyaltyCardLink
            onClick={onLoyaltyCard}
            className="shrink-0 text-[10px]"
          />
        </div>

        <div className="flex divide-x divide-border/50 border-b border-border/50">
          <BalanceCell label="Owed" value={money(owed)} warn={owed > 0} />
          <BalanceCell
            label="Wallet"
            value={money(customer.credit.walletBalance)}
          />
          <BalanceCell
            label="Loyalty"
            value={`${customer.credit.loyaltyPoints ?? 0}`}
          />
        </div>

        <div className="space-y-1.5 px-2.5 py-2">
          <div className="flex gap-1.5">
            <Phone className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1">
              {customer.phones.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No phone</p>
              ) : (
                customer.phones.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0"
                  >
                    <span
                      className={cn(
                        "text-[11px] leading-snug break-all",
                        p.primary
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {p.phone}
                    </span>
                    {p.primary ? (
                      <span className="text-[9px] text-muted-foreground">primary</span>
                    ) : null}
                    <CustomerPhoneFlag phone={p.phone} compact />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-1.5 border-t border-border/40 pt-1.5">
            <Mail className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden />
            <p className="min-w-0 flex-1 text-[11px] leading-snug break-words text-foreground">
              {customer.email?.trim() || (
                <span className="text-muted-foreground">No email</span>
              )}
            </p>
          </div>

          {customer.notes?.trim() ? (
            <p className="border-t border-border/40 pt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              {customer.notes.trim()}
            </p>
          ) : null}
        </div>

        {owed > 0 && canManage ? (
          <div className="border-t border-border/50 px-2 py-1.5">
            <RemindPaymentButtons
              customerId={customer.id}
              onResult={({ ok, text }) => onFeedback(ok ? "success" : "error", text)}
            />
          </div>
        ) : null}

        {canManage ? (
          <div className="grid grid-cols-2 gap-1 border-t border-border/50 p-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 text-[11px]"
              onClick={onEdit}
            >
              <Pencil className="mr-1 size-3" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={onMessage}
            >
              <MessageSquare className="mr-1 size-3" />
              SMS
            </Button>
          </div>
        ) : null}
      </WhiteCard>
    </div>
  );
}

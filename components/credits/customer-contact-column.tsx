"use client";

import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";

import { WhiteCard, boardMoney } from "@/components/credits/customer-board-theme";
import { CustomerPhoneFlag, customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { LoyaltyCardLink } from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import type { CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  customer: CustomerRecord | null;
  currency: string;
  canManage: boolean;
  onEdit: () => void;
  onMessage: () => void;
  onLoyaltyCard: () => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

export function CustomerContactColumn({
  customer,
  currency,
  canManage,
  onEdit,
  onMessage,
  onLoyaltyCard,
  onFeedback,
}: Props) {
  const money = (n: number | string | null | undefined) => boardMoney(n, currency);

  if (!customer) {
    return (
      <WhiteCard className="px-4 py-5">
        <h2 className="text-sm font-semibold text-foreground">Contact & balance</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Phones, email, tab balance, and wallet show here when you pick someone.
        </p>
      </WhiteCard>
    );
  }

  const owed = Number(customer.credit.balanceOwed ?? 0);

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-3 lg:self-start">
      <WhiteCard className="px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {customer.customerNo != null ? `C-${customer.customerNo}` : "Customer"}
        </p>
        <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-foreground">
          {customer.name}
        </p>
        <div className="mt-2">
          <LoyaltyCardLink onClick={onLoyaltyCard} />
        </div>
      </WhiteCard>

      <WhiteCard className="px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Amount owed
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums tracking-tight",
            owed > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {money(owed)}
        </p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Wallet
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
          {money(customer.credit.walletBalance)}
        </p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Loyalty
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
          {customer.credit.loyaltyPoints ?? 0} pts
        </p>
      </WhiteCard>

      <WhiteCard className="px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">Reach them</h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 size-4 shrink-0 text-foreground" />
            <div>
              <p className="font-medium text-foreground">
                {customerPrimaryPhone(customer.phones) || "No phone"}
              </p>
              {customer.phones.map((p) => (
                <p key={p.id} className="mt-1 text-xs">
                  {p.phone}
                  {p.primary ? " · primary" : ""}
                  <CustomerPhoneFlag phone={p.phone} className="block" />
                </p>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0 text-foreground" />
            <p>{customer.email?.trim() || "No email"}</p>
          </div>
          {customer.notes?.trim() ? (
            <p className="border-t border-border/60 pt-3 text-xs leading-relaxed">
              {customer.notes.trim()}
            </p>
          ) : null}
        </div>
      </WhiteCard>

      {owed > 0 && canManage ? (
        <WhiteCard className="px-3 py-3">
          <p className="mb-2 text-sm font-medium text-foreground">Payment reminder</p>
          <RemindPaymentButtons
            customerId={customer.id}
            onResult={({ ok, text }) => onFeedback(ok ? "success" : "error", text)}
          />
        </WhiteCard>
      ) : null}

      {canManage ? (
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={onEdit}>
            <Pencil className="mr-2 size-4" />
            Edit profile
          </Button>
          <Button type="button" variant="outline" onClick={onMessage}>
            <MessageSquare className="mr-2 size-4" />
            Send SMS
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

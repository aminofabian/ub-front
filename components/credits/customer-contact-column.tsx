"use client";

import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";

import {
  INK,
  MUTED,
  NAVY_DEEP,
  WhiteCard,
  boardMoney,
} from "@/components/credits/customer-board-theme";
import { CustomerPhoneFlag, customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import { RemindPaymentButtons } from "@/components/credits/remind-payment-buttons";
import { LoyaltyCardLink } from "@/components/credits/loyalty-card-preview";
import { Button } from "@/components/ui/button";
import type { CustomerRecord } from "@/lib/api";

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
      <section className="overflow-hidden rounded-none" style={{ background: NAVY_DEEP }}>
        <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
          Contact & balance
        </h2>
        <p className="px-3 pb-4 text-[12px] leading-relaxed text-white/80">
          Phones, email, tab balance, and wallet show here when you pick someone.
        </p>
      </section>
    );
  }

  const owed = Number(customer.credit.balanceOwed ?? 0);

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-3 lg:self-start">
      <WhiteCard className="px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
          {customer.customerNo != null ? `C-${customer.customerNo}` : "Customer"}
        </p>
        <p className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em]" style={{ color: INK }}>
          {customer.name}
        </p>
        <div className="mt-2">
          <LoyaltyCardLink onClick={onLoyaltyCard} />
        </div>
      </WhiteCard>

      <WhiteCard className="px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
          Amount owed
        </p>
        <p
          className="mt-1 text-[1.75rem] font-bold tabular-nums tracking-[-0.03em]"
          style={{ color: owed > 0 ? INK : MUTED }}
        >
          {money(owed)}
        </p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
          Wallet
        </p>
        <p className="mt-1 text-[1.15rem] font-bold tabular-nums" style={{ color: INK }}>
          {money(customer.credit.walletBalance)}
        </p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[-0.02em]" style={{ color: MUTED }}>
          Loyalty
        </p>
        <p className="mt-1 text-[1.15rem] font-bold tabular-nums" style={{ color: INK }}>
          {customer.credit.loyaltyPoints ?? 0} pts
        </p>
      </WhiteCard>

      <section className="overflow-hidden rounded-none" style={{ background: NAVY_DEEP }}>
        <h2 className="px-3 pt-3 pb-2 text-[13px] font-semibold tracking-[-0.02em] text-white">
          Reach them
        </h2>
        <div className="space-y-2 px-3 pb-3 text-[13px] text-white/90">
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium text-white">
                {customerPrimaryPhone(customer.phones) || "No phone"}
              </p>
              {customer.phones.map((p) => (
                <p key={p.id} className="mt-1 text-[12px] text-white/75">
                  {p.phone}
                  {p.primary ? " · primary" : ""}
                  <CustomerPhoneFlag phone={p.phone} className="block text-white/90" />
                </p>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <p>{customer.email?.trim() || "No email"}</p>
          </div>
          {customer.notes?.trim() ? (
            <p className="border-t border-white/10 pt-2 text-[12px] leading-relaxed text-white/75">
              {customer.notes.trim()}
            </p>
          ) : null}
        </div>
      </section>

      {owed > 0 && canManage ? (
        <WhiteCard className="px-3 py-3">
          <p className="mb-2 text-[12px] font-medium" style={{ color: INK }}>
            Payment reminder
          </p>
          <RemindPaymentButtons
            customerId={customer.id}
            onResult={({ ok, text }) => onFeedback(ok ? "success" : "error", text)}
          />
        </WhiteCard>
      ) : null}

      {canManage ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="h-11 rounded-none bg-white hover:bg-white/90"
            style={{ color: INK }}
            onClick={onEdit}
          >
            <Pencil className="mr-2 size-4" />
            Edit profile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-none border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onMessage}
          >
            <MessageSquare className="mr-2 size-4" />
            Send SMS
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

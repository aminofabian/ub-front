"use client";

import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";

import { WhiteCard, boardMoney } from "@/components/credits/customer-board-theme";
import { DirectoryStat } from "@/components/credits/directory-workspace-ui";
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
      <p className="px-1 py-4 text-xs leading-relaxed text-muted-foreground">
        Pick someone to see phone, email, tab balance, and wallet.
      </p>
    );
  }

  const owed = Number(customer.credit.balanceOwed ?? 0);

  return (
    <div className="flex flex-col gap-2">
      <WhiteCard className="px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {customer.customerNo != null ? `C-${customer.customerNo}` : "Profile"}
        </p>
        <p className="mt-0.5 truncate text-base font-semibold text-foreground">
          {customer.name}
        </p>
        <div className="mt-1.5">
          <LoyaltyCardLink onClick={onLoyaltyCard} />
        </div>
      </WhiteCard>

      <div className="grid grid-cols-2 gap-1.5">
        <DirectoryStat
          label="Owed"
          value={money(owed)}
          warn={owed > 0}
        />
        <DirectoryStat label="Wallet" value={money(customer.credit.walletBalance)} />
        <DirectoryStat
          label="Loyalty"
          value={`${customer.credit.loyaltyPoints ?? 0}`}
          className="col-span-2"
        />
      </div>

      <WhiteCard className="px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Reach
        </p>
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <Phone className="mt-0.5 size-3.5 shrink-0 text-foreground" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {customerPrimaryPhone(customer.phones) || "No phone"}
              </p>
              {customer.phones.map((p) => (
                <p key={p.id} className="mt-0.5 text-[10px]">
                  {p.phone}
                  {p.primary ? " · primary" : ""}
                  <CustomerPhoneFlag phone={p.phone} className="block" />
                </p>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-foreground" />
            <p className="min-w-0 break-words">{customer.email?.trim() || "No email"}</p>
          </div>
          {customer.notes?.trim() ? (
            <p className="border-t border-border/50 pt-2 text-[10px] leading-relaxed">
              {customer.notes.trim()}
            </p>
          ) : null}
        </div>
      </WhiteCard>

      {owed > 0 && canManage ? (
        <WhiteCard className="px-2.5 py-2">
          <RemindPaymentButtons
            customerId={customer.id}
            onResult={({ ok, text }) => onFeedback(ok ? "success" : "error", text)}
          />
        </WhiteCard>
      ) : null}

      {canManage ? (
        <div className="grid grid-cols-2 gap-1.5">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={onEdit}>
            <Pencil className="mr-1 size-3" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={onMessage}
          >
            <MessageSquare className="mr-1 size-3" />
            SMS
          </Button>
        </div>
      ) : null}
    </div>
  );
}

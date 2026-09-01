"use client";

import {
  ArrowUpRight,
  CreditCard,
  MessageSquare,
  Pencil,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { customerPrimaryPhone } from "@/components/credits/customer-phone-flag";
import {
  LoyaltyCardLink,
} from "@/components/credits/loyalty-card-preview";
import type { CustomerRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CRM_INSPECTOR,
  CRM_PANEL,
  customerInitials,
} from "@/components/credits/customer-crm-ui";

type Props = {
  customer: CustomerRecord | null;
  formatKes: (n: number | string) => string;
  canManage: boolean;
  onOpenFull: () => void;
  onMessage: () => void;
  onLoyaltyCard: () => void;
};

function OriginChip({ customer }: { customer: CustomerRecord }) {
  const verified = customer.phones.some(
    (p) => Boolean(p.verifiedAt) && Boolean(p.phone),
  );
  if (customer.origin === "mpesa_inferred" && !verified) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/70">
        Inferred
      </span>
    );
  }
  if (verified) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70">
        Verified
      </span>
    );
  }
  return null;
}

export function CustomerInspectorPanel({
  customer,
  formatKes,
  canManage,
  onOpenFull,
  onMessage,
  onLoyaltyCard,
}: Props) {
  return (
    <aside className={CRM_INSPECTOR}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Inspector
        </p>
        {customer ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-lg px-2 text-xs"
            onClick={onOpenFull}
          >
            Expand
            <ArrowUpRight className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {!customer ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20">
            <Sparkles className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">Select a customer</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Preview balances and quick actions here, or expand for the full profile.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#F9F6F0,#efe6d4)] text-sm font-bold text-[#8B6F3A] shadow-inner ring-1 ring-[#8B6F3A]/10"
              aria-hidden
            >
              {customerInitials(customer.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] text-muted-foreground">
                {customer.customerNo != null ? `C-${customer.customerNo}` : "Customer"}
              </p>
              <h2 className="truncate text-base font-semibold leading-tight">
                {customer.name}
              </h2>
              <div className="mt-1 flex flex-wrap gap-1">
                <OriginChip customer={customer} />
                <LoyaltyCardLink onClick={onLoyaltyCard} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className={cn(CRM_PANEL, "px-3 py-2.5")}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <CreditCard className="size-3" />
                Tab
              </div>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold tabular-nums",
                  Number(customer.credit.balanceOwed) > 0 &&
                    "text-amber-700 dark:text-amber-400",
                )}
              >
                {formatKes(customer.credit.balanceOwed)}
              </p>
            </div>
            <div className={cn(CRM_PANEL, "px-3 py-2.5")}>
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Wallet className="size-3" />
                Wallet
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums">
                {formatKes(customer.credit.walletBalance)}
              </p>
            </div>
          </div>

          <div className={cn(CRM_PANEL, "space-y-2 px-3 py-3 text-sm")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Contact
            </p>
            <p className="font-medium">
              {customerPrimaryPhone(customer.phones) || "No phone on file"}
            </p>
            {customer.email ? (
              <p className="truncate text-muted-foreground">{customer.email}</p>
            ) : null}
          </div>

          {canManage ? (
            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button
                type="button"
                className="w-full rounded-xl"
                onClick={onOpenFull}
              >
                <Pencil className="mr-2 size-4" />
                Open profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={onMessage}
              >
                <MessageSquare className="mr-2 size-4" />
                Send SMS
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="mt-auto w-full rounded-xl"
              onClick={onOpenFull}
            >
              View profile
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}

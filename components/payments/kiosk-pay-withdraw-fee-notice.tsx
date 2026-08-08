import { cn } from "@/lib/utils";

/** Approximate Safaricom / KopoKopo Send Money fee (KES). Not a Kiosk fee. */
export const KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES = 50;

export function kioskPayWithdrawFeeLine(currency = "KES") {
  return `${currency} ${KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES} Safaricom / KopoKopo fee per withdrawal — not charged by Kiosk.`;
}

/**
 * Compact notice for withdraw UIs: provider transfer cost vs platform.
 */
export function KioskPayWithdrawFeeNotice({
  className,
  currency = "KES",
}: {
  className?: string;
  currency?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground",
        className,
      )}
    >
      <span className="font-semibold text-foreground">
        About {currency} {KIOSK_PAY_WITHDRAW_PROVIDER_FEE_KES}
      </span>{" "}
      is deducted by <span className="font-medium text-foreground">Safaricom / KopoKopo</span> on
      each M-Pesa payout. That is their transfer charge —{" "}
      <span className="font-medium text-foreground">Kiosk does not take a withdraw fee</span>.
    </p>
  );
}

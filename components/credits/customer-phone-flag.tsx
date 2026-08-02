import { AlertTriangle } from "lucide-react";

import { storedCustomerPhoneIssue } from "@/lib/customer-phone";
import { cn } from "@/lib/utils";

type Props = {
  phone: string | null | undefined;
  className?: string;
  /** Compact badge only; default shows phone + issue. */
  compact?: boolean;
};

/**
 * Flags a stored customer phone that fails current Kenyan mobile / digit rules
 * (e.g. legacy 9-digit 07… numbers entered before validation).
 */
export function CustomerPhoneFlag({
  phone,
  className,
  compact = false,
}: Props) {
  const issue = storedCustomerPhoneIssue(phone);
  if (!issue) return null;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold text-destructive",
          className,
        )}
        title={issue}
      >
        <AlertTriangle className="size-3 shrink-0" aria-hidden />
        Fix phone
      </span>
    );
  }

  return (
    <span
      className={cn(
        "mt-0.5 inline-flex max-w-full items-start gap-1 text-[11px] font-medium leading-snug text-destructive",
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span className="min-w-0">{issue} — edit customer to fix</span>
    </span>
  );
}

export function customerPrimaryPhone(
  phones: { phone?: string | null; primary?: boolean | null }[] | null | undefined,
): string {
  if (!phones?.length) return "";
  return (
    phones.find((p) => p.primary)?.phone?.trim() ||
    phones[0]?.phone?.trim() ||
    ""
  );
}

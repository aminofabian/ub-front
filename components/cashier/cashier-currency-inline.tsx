import { cn } from "@/lib/utils";

/** Tiny ISO-style currency code (e.g. KES) for inline amounts on the cashier UI. */
export function CashierCurrencySuffix({
  code,
  className,
  onPrimary,
}: {
  code: string;
  className?: string;
  /** When text sits on `var(--pos-primary)` (floating cart pill). */
  onPrimary?: boolean;
}) {
  const c = code.trim();
  if (!c) return null;
  return (
    <span
      className={cn(
        "font-medium uppercase leading-none tracking-wider",
        "text-[8px] sm:text-[10px]",
        onPrimary
          ? "text-[color-mix(in_srgb,var(--pos-primary-ink)_70%,transparent)]"
          : "text-muted-foreground",
        className,
      )}
    >
      {c}
    </span>
  );
}

/** Flex-growing dotted leader between a label and a money column. */
export function CashierDottedLeader({
  onPrimary,
  className,
}: {
  onPrimary?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[1em] min-w-4 flex-1 items-center self-end pb-px",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "h-0 w-full border-b border-dotted",
          onPrimary
            ? "border-[color-mix(in_srgb,var(--pos-primary-ink)_40%,transparent)]"
            : "border-muted-foreground/35",
        )}
      />
    </div>
  );
}

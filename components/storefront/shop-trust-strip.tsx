import { CreditCard, ShieldCheck, Tag, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, label: "Fast Delivery", sub: "Same-day dispatch" },
  { icon: ShieldCheck, label: "Quality Guarantee", sub: "100% satisfaction" },
  { icon: CreditCard, label: "Secure Payments", sub: "M-Pesa & cards" },
  { icon: Tag, label: "Best Prices", sub: "Everyday low prices" },
] as const;

export function ShopTrustStrip({ primaryHex }: { primaryHex: string | null }) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-card p-2.5 shadow-[0_1px_0_rgba(0,0,0,0.03),0_2px_10px_-4px_rgba(0,0,0,0.06)] sm:grid-cols-4 sm:gap-2.5 sm:p-3">
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          className="flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1.5 sm:gap-3 sm:px-1.5"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9"
            style={{
              backgroundColor: primary
                ? `color-mix(in srgb, ${primary} 10%, transparent)`
                : "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <Icon
              className="size-4 sm:size-[18px]"
              aria-hidden
              style={
                primary ? { color: primary } : { color: "var(--primary)" }
              }
            />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
              {label}
            </p>
            <p className="text-[10px] leading-snug text-muted-foreground/70 sm:text-[11px]">
              {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

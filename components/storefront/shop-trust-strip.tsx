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
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/30 bg-card/70 p-3 backdrop-blur-sm sm:grid-cols-4 sm:gap-3 sm:p-4">
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          className="group flex items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-muted/40 sm:p-2.5"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10"
            style={{
              backgroundColor: primary
                ? `${primary}12`
                : "color-mix(in srgb, var(--color-primary) 8%, transparent)",
            }}
          >
            <Icon
              className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
              aria-hidden
              style={
                primary ? { color: primary } : { color: "var(--color-primary)" }
              }
            />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight text-foreground sm:text-[13px]">
              {label}
            </p>
            <p className="text-[11px] text-muted-foreground/55 sm:text-xs">
              {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

import { CreditCard, ShieldCheck, Tag, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, label: "Fast Delivery", sub: "Same-day delivery" },
  { icon: ShieldCheck, label: "Quality", sub: "100% quality guarantee" },
  { icon: CreditCard, label: "Secure Pay", sub: "M-Pesa & card accepted" },
  { icon: Tag, label: "Low Prices", sub: "Everyday low prices" },
] as const;

export function ShopTrustStrip({ primaryHex }: { primaryHex: string | null }) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/40 bg-card px-4 py-3 sm:grid-cols-4 sm:gap-4 sm:px-5">
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div key={label} className="flex items-center gap-2.5">
          <Icon
            className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
            aria-hidden
            style={
              primary ? { color: primary } : { color: "var(--color-primary)" }
            }
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
              {label}
            </p>
            <p className="truncate text-[10px] text-muted-foreground/60 sm:text-[11px]">
              {sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

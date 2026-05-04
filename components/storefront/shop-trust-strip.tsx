import { CreditCard, ShieldCheck, Tag, Truck } from "lucide-react";

const ITEMS = [
  { icon: Truck, label: "Fast Delivery", sub: "Same-day delivery (where available)" },
  { icon: ShieldCheck, label: "Quality Guaranteed", sub: "100% quality products" },
  { icon: CreditCard, label: "Secure Payments", sub: "M-Pesa & Card accepted" },
  { icon: Tag, label: "Low Prices", sub: "Everyday low prices" },
] as const;

export function ShopTrustStrip({ primaryHex }: { primaryHex: string | null }) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim()) ? primaryHex.trim() : null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/60 bg-card px-4 py-4 text-sm shadow-sm sm:grid-cols-4 sm:gap-4 sm:px-6 sm:py-3">
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon
            className="h-7 w-7 shrink-0"
            aria-hidden
            style={primary ? { color: primary } : { color: "var(--color-primary)" }}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">{label}</p>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

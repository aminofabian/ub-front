import { CreditCard, Headphones, Lock, Smartphone } from "lucide-react";

const ITEMS = [
  { icon: Smartphone, label: "Download Our App", sub: "Coming Soon" },
  { icon: CreditCard, label: "Pay with M-Pesa", sub: "Fast and Secure" },
  { icon: Headphones, label: "24/7 Support", sub: "We are here to help" },
  { icon: Lock, label: "100% Secure", sub: "Your data is safe" },
] as const;

export function ShopFooterMart({
  primaryHex,
  storeName,
}: {
  primaryHex: string | null;
  storeName: string;
}) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  return (
    <footer
      className="mt-auto text-white"
      style={primary ? { backgroundColor: primary } : { backgroundColor: "var(--color-primary)" }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-4 sm:px-6 sm:py-6">
        {ITEMS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-[11px] text-white/75">{sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-3 text-center text-[11px] text-white/85">
        <p className="mx-auto max-w-7xl px-4">
          © {new Date().getFullYear()} {storeName}. Prices and availability may vary by branch.
        </p>
      </div>
    </footer>
  );
}

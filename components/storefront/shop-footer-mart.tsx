import { CreditCard, Headphones, Lock, Smartphone } from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";

const ITEMS = [
  { icon: Smartphone, label: "Mobile Friendly", sub: "Shop on any device" },
  { icon: CreditCard, label: "Pay with M-Pesa", sub: "Fast and secure" },
  { icon: Headphones, label: "Customer Support", sub: "We're here to help" },
  { icon: Lock, label: "100% Secure", sub: "Your data is protected" },
] as const;

export function ShopFooterMart({
  primaryHex,
  storeName,
  logoUrl,
}: {
  primaryHex: string | null;
  storeName: string;
  logoUrl?: string | null;
}) {
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 text-white shadow-[0_-4px_24px_rgba(0,0,0,0.10)]"
      style={
        primary
          ? { backgroundColor: primary }
          : { backgroundColor: "var(--color-primary)" }
      }
    >
      <div className="border-b border-white/12">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 sm:py-5">
          <TenantLogo
            brand={storeName}
            logoUrl={logoUrl}
            primaryColor={primary}
            variant="footer"
            size="md"
            tone="dark"
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-5 sm:grid-cols-4 sm:px-6 sm:py-5">
        {ITEMS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:h-10 sm:w-10">
              <Icon className="h-[18px] w-[18px] opacity-90" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight">{label}</p>
              <p className="text-[11px] text-white/65">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 py-3 text-center">
        <p className="mx-auto max-w-7xl px-4 text-[11px] text-white/70">
          &copy; {new Date().getFullYear()} {storeName}. Prices and availability
          may vary by branch.
        </p>
      </div>
    </footer>
  );
}

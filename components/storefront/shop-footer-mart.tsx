import { CreditCard, Headphones, Lock, Smartphone } from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";

const ITEMS = [
  { icon: Smartphone, label: "Mobile Friendly", shortLabel: "Mobile", sub: "Shop on any device" },
  { icon: CreditCard, label: "Pay with M-Pesa", shortLabel: "M-Pesa", sub: "Fast and secure" },
  { icon: Headphones, label: "Customer Support", shortLabel: "Support", sub: "We're here to help" },
  { icon: Lock, label: "100% Secure", shortLabel: "Secure", sub: "Your data is protected" },
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
  const year = new Date().getFullYear();

  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-40 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0px)]"
      style={
        primary
          ? { backgroundColor: primary }
          : { backgroundColor: "var(--color-primary)" }
      }
    >
      <div className="hidden border-b border-white/12 sm:block">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 sm:py-4">
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

      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-x-1 gap-y-0 px-2.5 py-2 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-5 sm:px-6 sm:py-5">
        {ITEMS.map(({ icon: Icon, label, shortLabel, sub }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 sm:size-10 sm:rounded-lg"
              aria-hidden
            >
              <Icon className="size-3.5 opacity-90 sm:size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold leading-tight sm:text-[13px]">
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </p>
              <p className="mt-0 hidden text-[11px] text-white/65 sm:block">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 py-1.5 text-center sm:py-3">
        <p className="mx-auto max-w-7xl px-3 text-[9px] leading-snug text-white/70 sm:px-4 sm:text-[11px]">
          <span className="sm:hidden">
            &copy; {year} {storeName}
          </span>
          <span className="hidden sm:inline">
            &copy; {year} {storeName}. Prices and availability may vary by branch.
          </span>
        </p>
      </div>
    </footer>
  );
}

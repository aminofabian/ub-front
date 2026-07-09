import Link from "next/link";
import type { ReactNode } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";

export function MarketplacePageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_40%,var(--background)))]">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <Link
              href={APP_ROUTES.marketplace}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

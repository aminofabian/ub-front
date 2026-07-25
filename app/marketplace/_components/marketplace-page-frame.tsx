import Link from "next/link";
import type { ReactNode } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { APP_ROUTES } from "@/lib/config";

export function MarketplacePageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_-10%,color-mix(in_srgb,#0f766e_10%,#f7f4ef),#efeae2_42%,#e7e1d6)]">
      <header className="sticky top-0 z-30 border-b border-[color-mix(in_srgb,#1c1915_8%,transparent)] bg-[color-mix(in_srgb,#faf8f4_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <KioskLogo size="sm" href="/" />
            <Link
              href={APP_ROUTES.marketplace}
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
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

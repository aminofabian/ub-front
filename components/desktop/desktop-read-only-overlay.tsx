"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { IS_DESKTOP } from "@/lib/runtime";

import { useDesktopLicense } from "./desktop-license-provider";

/** Pages that stay fully interactive in read-only mode (view reports / renew). */
const EXEMPT_PATH_PREFIXES: readonly string[] = [
  APP_ROUTES.desktopSettings,
  APP_ROUTES.overview,
  APP_ROUTES.analytics,
  APP_ROUTES.analyticsActivity,
  APP_ROUTES.salesTransactions,
  APP_ROUTES.salesReports,
  APP_ROUTES.products,
  APP_ROUTES.customers,
  APP_ROUTES.suppliers,
  APP_ROUTES.inventoryStock,
  APP_ROUTES.inventoryValuation,
  APP_ROUTES.shifts,
  APP_ROUTES.categories,
  APP_ROUTES.business,
  APP_ROUTES.users,
  APP_ROUTES.branches,
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Blocks interaction on write-heavy screens when the license is read-only.
 * Backend enforcement remains authoritative ({@code DesktopLicenseReadOnlyFilter}).
 */
export function DesktopReadOnlyOverlay() {
  const pathname = usePathname();
  const { readOnly, status } = useDesktopLicense();

  if (!IS_DESKTOP || !readOnly || isExemptPath(pathname)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center bg-background/55 p-6 backdrop-blur-[1px] md:items-center"
      aria-hidden
    >
      <div className="pointer-events-auto max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Read-only mode</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {status?.message ??
                  "Your trial or license has ended. You can still view reports and history, but new sales and stock changes are disabled."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={APP_ROUTES.desktopSettings}>Renew license</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={APP_ROUTES.salesTransactions}>View transactions</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { LogOut, Moon, Sun } from "lucide-react";

import { ButcherNav } from "@/components/butcher/butcher-nav";
import {
  ButcherThemeProvider,
  useButcherTheme,
} from "@/components/butcher/butcher-theme-provider";
import { TenantLogo } from "@/components/brand/tenant-logo";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { logoutRemoteAndRedirectToLogin } from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { APP_ROUTES } from "@/lib/config";
import { isButcheryOnlyBusiness } from "@/lib/business-store-type";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

type ButcherShellProps = {
  children: ReactNode;
};

export function ButcherShell({ children }: ButcherShellProps) {
  return (
    <ButcherThemeProvider>
      <ButcherShellFrame>{children}</ButcherShellFrame>
    </ButcherThemeProvider>
  );
}

function ButcherShellFrame({ children }: ButcherShellProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const { me, business, branches, branchId } = useDashboard();

  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";

  useEffect(() => {
    if (roleKey === "cashier") {
      router.replace(APP_ROUTES.cashier);
    }
  }, [roleKey, router]);

  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const tenantTitle =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "Butcher";

  const mounted = useClientMounted();
  const currentBranch = branches.find((b) => b.id === branchId);
  const showDashboardLink =
    mounted &&
    roleKey !== "butcher_cashier" &&
    !isButcheryOnlyBusiness(business);

  const displayName = useMemo(() => {
    const n = me?.name?.trim();
    if (n) return n;
    return me?.email?.trim() ?? "Staff";
  }, [me?.email, me?.name]);

  const { isDark, toggleTheme } = useButcherTheme();

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "butcher-pos flex h-dvh flex-col overflow-hidden bg-[rgb(var(--bp-bg))] text-[rgb(var(--bp-fg))]",
        isDark && "dark",
      )}
      style={brandTheme as CSSProperties}
    >
      <header className="shrink-0 border-b border-[rgb(var(--bp-border)/0.9)] bg-[rgb(var(--bp-bg)/0.95)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--bp-border))] bg-[rgb(var(--bp-surface))]">
              <TenantLogo
                brand={tenantTitle}
                logoUrl={business?.branding?.logoUrl}
                faviconUrl={business?.branding?.faviconUrl}
                primaryColor={business?.branding?.primaryColor}
                variant="sidebar-mark"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[rgb(var(--bp-fg))]">
                {business?.name?.trim() || "Butcher counter"}
              </p>
              <p className="truncate text-[11px] text-[rgb(var(--bp-fg-muted))]">
                {displayName}
                {currentBranch?.name?.trim()
                  ? ` · ${currentBranch.name.trim()}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!online ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                Offline
              </span>
            ) : null}

            {showDashboardLink ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden h-8 text-xs text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))] sm:inline-flex"
                asChild
              >
                <Link href={APP_ROUTES.business}>Dashboard</Link>
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))]"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
            >
              {isDark ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-[rgb(var(--bp-fg-faint))] hover:bg-[rgb(var(--bp-hover))] hover:text-[rgb(var(--bp-fg))]"
              aria-label="Sign out"
              onClick={() => {
                void logoutRemoteAndRedirectToLogin().catch(() => undefined);
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <ButcherNav />

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

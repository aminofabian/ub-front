"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Lock,
  LogOut,
  MapPin,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { shellPageTitle } from "@/lib/shell-page-titles";
import { cn } from "@/lib/utils";

export type TabletNavSection = {
  id: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  items: readonly { href: string; label: string }[];
};

export type TabletBottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  matchSectionIds: string[];
};

type TabletAppHeaderProps = {
  tenantTitle: string;
  businessName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  pageTitle?: string;
  branchName?: string | null;
  departmentName?: string | null;
  userInitial: string;
  canReadNotifications: boolean;
  onOpenMore: () => void;
};

export function TabletAppHeader({
  tenantTitle,
  businessName,
  logoUrl,
  faviconUrl,
  primaryColor,
  pageTitle,
  branchName,
  departmentName,
  userInitial,
  canReadNotifications,
  onOpenMore,
}: TabletAppHeaderProps) {
  const pathname = usePathname();
  const title = pageTitle ?? shellPageTitle(pathname);

  return (
    <header className="tablet-app-header sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top,0px)]">
      <div
        className={cn(
          "relative overflow-hidden border-b border-border/40",
          "bg-gradient-to-b from-background via-background to-background/92",
          "backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_1px_0_0_rgba(0,0,0,0.04)]",
        )}
      >
        {/* Ambient brand wash */}
        <div
          className="pointer-events-none absolute -right-8 -top-12 h-32 w-48 rounded-full opacity-[0.14] blur-3xl"
          style={{
            background: primaryColor
              ? `radial-gradient(circle, ${primaryColor}, transparent 70%)`
              : "radial-gradient(circle, rgb(40, 167, 69), transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="tablet-app-logo-ring flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
              <TenantLogo
                brand={tenantTitle}
                logoUrl={logoUrl}
                faviconUrl={faviconUrl}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tenantTitle}
              </p>
              <h1 className="truncate font-heading text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.35rem]">
                {title}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {branchName ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                    {branchName}
                  </span>
                ) : null}
                {departmentName ? (
                  <span className="inline-flex items-center gap-1 border-l border-border/50 pl-2">
                    {departmentName}
                  </span>
                ) : null}
                {businessName && businessName !== tenantTitle ? (
                  <span className="hidden sm:inline border-l border-border/50 pl-2 opacity-80">
                    {businessName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {canReadNotifications ? (
              <span className="tablet-app-icon-btn">
                <NotificationBell />
              </span>
            ) : (
              <span className="tablet-app-icon-btn text-muted-foreground/40">
                <Bell className="size-[18px]" aria-hidden />
              </span>
            )}
            <button
              type="button"
              onClick={onOpenMore}
              aria-label="Open menu"
              className={cn(
                "tablet-app-avatar flex size-10 items-center justify-center rounded-full",
                "bg-gradient-to-br from-foreground to-foreground/85 text-sm font-bold text-background",
                "shadow-md ring-2 ring-background transition-transform active:scale-95",
              )}
            >
              {userInitial}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

type TabletBottomNavProps = {
  tabs: readonly TabletBottomTab[];
  activeTabId: string | null;
  onMore: () => void;
};

export function TabletBottomNav({
  tabs,
  activeTabId,
  onMore,
}: TabletBottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="tablet-bottom-nav fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-2 pointer-events-none sm:px-5"
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto flex w-full max-w-[42rem] items-stretch justify-between gap-0.5",
          "rounded-[1.65rem] border border-white/25 bg-background/75 px-1.5 py-1.5",
          "shadow-[0_12px_48px_-14px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.04)_inset]",
          "backdrop-blur-2xl backdrop-saturate-[1.8]",
          "dark:border-white/10 dark:bg-background/65",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isMore = tab.id === "more";
          const isActive = activeTabId === tab.id;

          const inner = (
            <>
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-xl transition-all duration-200 sm:size-10",
                  isActive && "scale-105",
                )}
              >
                {isActive ? (
                  <span
                    className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/25"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative size-[1.15rem] sm:size-5",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  "max-w-[4.5rem] truncate text-[9px] font-semibold leading-none sm:text-[10px]",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </>
          );

          const className = cn(
            "tablet-nav-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 transition-colors",
            "active:scale-[0.97]",
            isActive && "tablet-nav-tab-active",
          );

          if (isMore) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={onMore}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type TabletMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  userDisplayName: string;
  userEmail?: string | null;
  tenantTitle: string;
  userInitial: string;
  primaryColor?: string | null;
  sections: readonly TabletNavSection[];
  pathname: string;
  branchName?: string | null;
  branchLocked: boolean;
  branches: { id: string; name: string }[];
  branchId: string;
  branchesLoading: boolean;
  onBranchChange: (id: string) => void;
  showBranchPicker: boolean;
  itemTypes: { id: string; label: string; isDefault?: boolean }[];
  itemTypeId: string;
  itemTypesLoading: boolean;
  onItemTypeChange: (id: string) => void;
  onLogout: () => void;
  itemIsActive: (pathname: string, href: string) => boolean;
  /** Cashier / stock manager / grocery: flat link list instead of launcher grid. */
  compactNav?: boolean;
};

export function TabletMoreSheet({
  open,
  onClose,
  userDisplayName,
  userEmail,
  tenantTitle,
  userInitial,
  primaryColor,
  sections,
  pathname,
  branchName,
  branchLocked,
  branches,
  branchId,
  branchesLoading,
  onBranchChange,
  showBranchPicker,
  itemTypes,
  itemTypeId,
  itemTypesLoading,
  onItemTypeChange,
  onLogout,
  itemIsActive,
  compactNav = false,
}: TabletMoreSheetProps) {
  const accent = primaryColor?.trim() || "#28a745";
  const heroWash = `${accent}1f`;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!open) return null;

  return (
    <div
      className="tablet-more-sheet fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
    >
      {/* Hero */}
      <div
        className="relative shrink-0 overflow-hidden bg-gradient-to-b from-primary/[0.08] to-background px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))]"
        style={{
          backgroundImage: `linear-gradient(165deg, ${heroWash} 0%, transparent 55%)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg"
            >
              {userInitial}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {greeting}
              </p>
              <p className="font-heading text-xl font-semibold tracking-tight">
                {userDisplayName}
              </p>
              <p className="text-xs text-muted-foreground">
                {userEmail?.trim() && userEmail !== userDisplayName
                  ? userEmail
                  : tenantTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Workspace chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {branchName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
              {branchLocked ? (
                <Lock className="size-3 text-muted-foreground" aria-hidden />
              ) : (
                <MapPin className="size-3 text-primary" aria-hidden />
              )}
              {branchName}
            </span>
          ) : null}
          {itemTypes.find((t) => t.id === itemTypeId) ? (
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              {itemTypes.find((t) => t.id === itemTypeId)?.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-5">
        {/* Branch & department — compact cards */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-muted/25 p-3.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Branch
            </label>
            {showBranchPicker ? (
              <select
                className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={branchId}
                onChange={(e) => onBranchChange(e.target.value)}
                disabled={branchesLoading || branches.length === 0}
              >
                {branches.length === 0 ? (
                  <option value="">
                    {branchesLoading ? "Loading…" : "No branches"}
                  </option>
                ) : (
                  <>
                    {!branchId ? <option value="">Select branch…</option> : null}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            ) : branchName ? (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium">
                {branchLocked ? (
                  <Lock className="size-3.5 text-muted-foreground" />
                ) : null}
                {branchName}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/25 p-3.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Department
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              value={itemTypeId}
              onChange={(e) => onItemTypeChange(e.target.value)}
              disabled={itemTypesLoading || itemTypes.length === 0}
            >
              {itemTypes.length === 0 ? (
                <option value="">
                  {itemTypesLoading ? "Loading…" : "No departments"}
                </option>
              ) : (
                <>
                  {!itemTypeId ? <option value="">All departments…</option> : null}
                  {itemTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {compactNav ? (
          <div className="space-y-1 rounded-2xl border border-border/50 bg-card p-2 shadow-sm">
            {sections.flatMap((s) => s.items).map((item) => {
              const active = itemIsActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-4 py-3.5 text-[15px] transition-colors",
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "hover:bg-muted/60",
                  )}
                >
                  <span>{item.label}</span>
                  <ChevronRight className="size-4 opacity-40" aria-hidden />
                </Link>
              );
            })}
          </div>
        ) : (
          <>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Explore
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const sectionActive = section.items.some((item) =>
              itemIsActive(pathname, item.href),
            );
            return (
              <div
                key={section.id}
                className={cn(
                  "tablet-launcher-card overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
                  sectionActive
                    ? "border-primary/25 ring-1 ring-primary/15"
                    : "border-border/50",
                )}
              >
                <div className="flex items-center gap-2.5 border-b border-border/40 bg-muted/20 px-3.5 py-2.5">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl",
                      sectionActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{section.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {section.blurb}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-border/30 p-1">
                  {section.items.map((item) => {
                    const active = itemIsActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-foreground/90 hover:bg-muted/60",
                          )}
                        >
                          <span className="min-w-0 truncate">{item.label}</span>
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 opacity-40",
                              active && "opacity-100",
                            )}
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
          </>
        )}

        <Button
          variant="outline"
          className="mt-6 w-full gap-2 rounded-xl py-5 text-sm"
          onClick={onLogout}
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </Button>
      </div>
    </div>
  );
}

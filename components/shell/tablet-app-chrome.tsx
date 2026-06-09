"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bell,
  ChevronRight,
  Compass,
  Lock,
  LogOut,
  MapPin,
  Search,
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

export type HeaderPosLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function headerPosLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    pathname.startsWith(`${href}?`)
  );
}

export function HeaderPosLinks({
  links,
  pathname,
  variant = "tablet",
}: {
  links: readonly HeaderPosLink[];
  pathname: string;
  variant?: "tablet" | "desktop";
}) {
  if (links.length === 0) return null;

  if (variant === "desktop") {
    return (
      <div className="flex items-center gap-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = headerPosLinkActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = headerPosLinkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex h-9 max-w-[5.5rem] items-center gap-1 rounded-full border px-2 text-[10px] font-semibold leading-none transition-colors sm:max-w-none sm:gap-1.5 sm:px-2.5 sm:text-[11px]",
              active
                ? "border-primary/35 bg-primary/12 text-primary shadow-sm"
                : "border-border/55 bg-background/85 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
            title={label}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

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
  posLinks?: readonly HeaderPosLink[];
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
  posLinks = [],
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
            <HeaderPosLinks links={posLinks} pathname={pathname} />
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
  logoUrl?: string | null;
  faviconUrl?: string | null;
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

const TILE_HUES = [0, 42, 84, 126, 168, 210, 252, 294] as const;

function itemMonogram(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return label.trim().slice(0, 2).toUpperCase() || "?";
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function resolveSectionId(
  sections: readonly TabletNavSection[],
  pathname: string,
  itemIsActive: (pathname: string, href: string) => boolean,
): string {
  return (
    sections.find((section) =>
      section.items.some((item) => itemIsActive(pathname, item.href)),
    )?.id ??
    sections[0]?.id ??
    ""
  );
}

function MoreWorkspaceConsole({
  accent,
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
}: {
  accent: string;
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
}) {
  const selectClass =
    "w-full appearance-none rounded-xl border border-white/20 bg-background/90 px-3 py-2 pr-8 text-sm font-medium shadow-sm backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-50 dark:border-white/10";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/30 bg-background/55 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-background/40"
      style={{
        boxShadow: `0 8px 32px -12px color-mix(in srgb, ${accent} 28%, transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background: `linear-gradient(135deg, ${accent}, transparent 65%)`,
        }}
        aria-hidden
      />
      <p className="relative mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <Compass className="size-3" aria-hidden />
        Workspace
      </p>
      <div className="relative grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
            Branch
          </label>
          {showBranchPicker ? (
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-primary/80"
                aria-hidden
              />
              <select
                className={cn(selectClass, "pl-8")}
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
            </div>
          ) : branchName ? (
            <p className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm font-medium">
              {branchLocked ? (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <MapPin className="size-3.5 shrink-0 text-primary" />
              )}
              <span className="truncate">{branchName}</span>
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">
            Department
          </label>
          <select
            className={selectClass}
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
    </div>
  );
}

export function TabletMoreSheet({
  open,
  onClose,
  userDisplayName,
  userEmail,
  tenantTitle,
  logoUrl,
  faviconUrl,
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
  const greeting = greetingForHour(new Date().getHours());
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState(() =>
    resolveSectionId(sections, pathname, itemIsActive),
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    setSectionId(resolveSectionId(sections, pathname, itemIsActive));
  }, [open, sections, pathname, itemIsActive]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const hits: {
      href: string;
      label: string;
      section: TabletNavSection;
    }[] = [];
    for (const section of sections) {
      for (const item of section.items) {
        if (item.label.toLowerCase().includes(q)) {
          hits.push({ ...item, section });
        }
      }
    }
    return hits;
  }, [search, sections]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === sectionId) ?? sections[0],
    [sections, sectionId],
  );

  const currentItem = useMemo(() => {
    for (const section of sections) {
      for (const item of section.items) {
        if (itemIsActive(pathname, item.href)) {
          return { item, section };
        }
      }
    }
    return null;
  }, [sections, pathname, itemIsActive]);

  if (!open) return null;

  const sheetStyle = {
    "--tablet-accent": accent,
  } as CSSProperties;

  return (
    <div
      className="tablet-more-sheet fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      style={sheetStyle}
    >
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="tablet-more-aurora absolute -left-[20%] -top-[30%] h-[70%] w-[70%] rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
        />
        <div
          className="tablet-more-aurora absolute -bottom-[25%] -right-[15%] h-[60%] w-[55%] rounded-full opacity-20 blur-3xl [animation-delay:2s]"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${accent} 70%, #6366f1), transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.45),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_50%)]" />
      </div>

      {/* Command deck header */}
      <div className="relative shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="tablet-more-avatar-ring relative flex size-[3.35rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-lg font-bold text-background"
            >
              {userInitial}
              <span
                className="pointer-events-none absolute -bottom-1 -right-1 flex size-6 items-center justify-center overflow-hidden rounded-lg bg-background shadow-md ring-2 ring-background"
              >
                <TenantLogo
                  brand={tenantTitle}
                  logoUrl={logoUrl}
                  faviconUrl={faviconUrl}
                  primaryColor={primaryColor}
                  variant="sidebar-mark"
                />
              </span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                {greeting}
              </p>
              <p className="truncate font-heading text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                {userDisplayName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {userEmail?.trim() && userEmail !== userDisplayName
                  ? userEmail
                  : tenantTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {currentItem ? (
          <div
            className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs backdrop-blur-md"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
              background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            }}
          >
            <span
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary"
              aria-hidden
            />
            <span className="font-medium text-foreground">You&apos;re on</span>
            <span className="truncate font-semibold text-primary">
              {currentItem.item.label}
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-5">
        <MoreWorkspaceConsole
          accent={accent}
          branchName={branchName}
          branchLocked={branchLocked}
          branches={branches}
          branchId={branchId}
          branchesLoading={branchesLoading}
          onBranchChange={onBranchChange}
          showBranchPicker={showBranchPicker}
          itemTypes={itemTypes}
          itemTypeId={itemTypeId}
          itemTypesLoading={itemTypesLoading}
          onItemTypeChange={onItemTypeChange}
        />

        <div className="relative mt-3 shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to any screen…"
            className="h-10 w-full rounded-xl border border-border/60 bg-background/80 pl-9 pr-9 text-sm shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="Search navigation"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {compactNav ? (
            <div className="space-y-4">
              {sections.map((section) => {
                const Icon = section.icon;
                const sectionHasActive = section.items.some((item) =>
                  itemIsActive(pathname, item.href),
                );
                return (
                  <div key={section.id}>
                    <div className="mb-1.5 flex items-center gap-2 px-0.5">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-lg",
                          sectionHasActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {section.title}
                      </p>
                    </div>
                    <ul className="space-y-1 rounded-2xl border border-border/50 bg-card/80 p-1.5 shadow-sm backdrop-blur-sm">
                      {section.items.map((item, index) => {
                        const active = itemIsActive(pathname, item.href);
                        const hue = TILE_HUES[index % TILE_HUES.length];
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                "tablet-more-link-tile group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                                active
                                  ? "bg-primary/12 font-semibold text-primary ring-1 ring-primary/20"
                                  : "hover:bg-muted/60",
                              )}
                              style={{ animationDelay: `${index * 0.03}s` }}
                            >
                              <span
                                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                                style={{
                                  background: `linear-gradient(135deg, hsl(${hue} 62% 48%), hsl(${(hue + 24) % 360} 58% 38%))`,
                                }}
                              >
                                {itemMonogram(item.label)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {item.label}
                              </span>
                              <ChevronRight
                                className={cn(
                                  "size-4 shrink-0 opacity-30 transition-transform group-hover:translate-x-0.5 group-hover:opacity-60",
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
          ) : search.trim() ? (
            <div>
              <p className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {searchHits.length > 0
                  ? `${searchHits.length} match${searchHits.length === 1 ? "" : "es"}`
                  : "No matches"}
              </p>
              {searchHits.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {searchHits.map((hit, index) => {
                    const active = itemIsActive(pathname, hit.href);
                    const SectionIcon = hit.section.icon;
                    return (
                      <li key={`${hit.href}-${hit.section.id}`}>
                        <Link
                          href={hit.href}
                          onClick={onClose}
                          className={cn(
                            "tablet-more-link-tile flex h-full flex-col gap-2 rounded-2xl border p-3 transition-all active:scale-[0.98]",
                            active
                              ? "border-primary/30 bg-primary/10 shadow-md ring-1 ring-primary/20"
                              : "border-border/50 bg-card/90 hover:border-border hover:shadow-md",
                          )}
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <SectionIcon className="size-4" aria-hidden />
                            </span>
                            <span className="truncate text-[10px] font-medium text-muted-foreground">
                              {hit.section.title}
                            </span>
                          </div>
                          <span className="text-sm font-semibold leading-snug">
                            {hit.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Try a different keyword — products, stock, settings…
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const selected = section.id === sectionId;
                  const hasActive = section.items.some((item) =>
                    itemIsActive(pathname, item.href),
                  );
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSectionId(section.id)}
                      className={cn(
                        "tablet-more-section-pill flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors",
                        selected
                          ? "tablet-more-section-pill-active border-primary/25 bg-primary text-primary-foreground shadow-md"
                          : "border-border/60 bg-background/80 text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full",
                          selected
                            ? "bg-primary-foreground/15"
                            : hasActive
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="max-w-[7.5rem] truncate text-xs font-semibold">
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeSection ? (
                <div>
                  <p className="mb-2 px-0.5 text-[10px] text-muted-foreground">
                    {activeSection.blurb}
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {activeSection.items.map((item, index) => {
                      const active = itemIsActive(pathname, item.href);
                      const hue = TILE_HUES[index % TILE_HUES.length];
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "tablet-more-link-tile group relative flex min-h-[4.5rem] flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-all active:scale-[0.98]",
                              active
                                ? "border-primary/35 bg-primary/10 shadow-lg ring-1 ring-primary/25"
                                : "border-border/50 bg-card/90 hover:-translate-y-0.5 hover:border-border hover:shadow-md",
                            )}
                            style={{ animationDelay: `${index * 0.04}s` }}
                          >
                            <div
                              className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full opacity-[0.12] blur-xl"
                              style={{ background: `hsl(${hue} 70% 55%)` }}
                              aria-hidden
                            />
                            <div className="relative flex items-start justify-between gap-2">
                              <span
                                className="flex size-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
                                style={{
                                  background: `linear-gradient(145deg, hsl(${hue} 65% 50%), hsl(${(hue + 30) % 360} 60% 40%))`,
                                }}
                              >
                                {itemMonogram(item.label)}
                              </span>
                              <ChevronRight
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5",
                                  active && "text-primary",
                                )}
                                aria-hidden
                              />
                            </div>
                            <span
                              className={cn(
                                "relative mt-2 text-sm font-semibold leading-snug",
                                active && "text-primary",
                              )}
                            >
                              {item.label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          <div className="mt-5 flex flex-col items-center gap-2 border-t border-border/40 pt-4">
            <Button
              variant="ghost"
              className="w-full max-w-xs gap-2 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onLogout}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
            <p className="text-[10px] text-muted-foreground/70">{tenantTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

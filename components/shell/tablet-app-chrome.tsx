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
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
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
    <div className="tablet-header-till flex items-stretch">
      {links.map(({ href, label, icon: Icon }) => {
        const active = headerPosLinkActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tablet-header-till-btn group relative inline-flex h-full min-w-10 flex-col items-center justify-center gap-0.5 px-2.5 transition-colors",
              active
                ? "bg-[var(--tablet-header-ink,#14201b)] text-[var(--tablet-header-paper,#eef3f0)]"
                : "text-[var(--tablet-header-ink,#14201b)]/70 hover:bg-[var(--tablet-header-ink,#14201b)]/8 hover:text-[var(--tablet-header-ink,#14201b)]",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.35 : 2} aria-hidden />
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em]">
              {label.slice(0, 4)}
            </span>
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[var(--tablet-header-accent,#0f766e)] transition-transform duration-300",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
              )}
              aria-hidden
            />
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
  const accent = primaryColor?.trim() || "#0f766e";

  const placeLine = [branchName?.trim(), departmentName?.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <header
      className="tablet-app-header sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top,0px)]"
      style={
        {
          "--tablet-header-accent": accent,
          "--tablet-header-ink": "#14201b",
          "--tablet-header-paper": "#eef3f0",
          "--tablet-header-leaf": "#1a3d30",
        } as CSSProperties
      }
    >
      <div className="tablet-header-fascia relative overflow-hidden border-b border-[var(--tablet-header-ink)]/15">
        {/* Market-awning wash + hatch */}
        <div className="tablet-header-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="tablet-header-hatch pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        <div className="relative flex min-h-[3.75rem] items-stretch">
          {/* Brand stamp block */}
          <div className="tablet-header-stamp flex shrink-0 items-center gap-2.5 bg-[var(--tablet-header-leaf)] px-3 py-2.5 text-[var(--tablet-header-paper)] sm:gap-3 sm:px-4">
            <div className="tablet-header-logo relative flex size-10 shrink-0 items-center justify-center overflow-hidden bg-[var(--tablet-header-paper)] sm:size-11">
              <TenantLogo
                brand={tenantTitle}
                logoUrl={logoUrl}
                faviconUrl={faviconUrl}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
              <span
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[var(--tablet-header-ink)]/20"
                aria-hidden
              />
            </div>
            <div className="min-w-0 max-w-[11rem] sm:max-w-[16rem]">
              <h1 className="tablet-header-brand truncate font-heading text-[1.35rem] font-semibold leading-[0.95] tracking-[-0.02em] sm:text-[1.55rem]">
                {tenantTitle}
              </h1>
            </div>
          </div>

          {/* Diagonal cut between stamp and deck */}
          <div
            className="tablet-header-cut relative hidden w-4 shrink-0 bg-[var(--tablet-header-leaf)] sm:block"
            aria-hidden
          />

          {/* Aisle deck */}
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
            <div className="tablet-header-aisle min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="tablet-header-page font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--tablet-header-accent)]">
                  Aisle
                </span>
                <p className="truncate font-heading text-xl font-semibold leading-none tracking-tight text-[var(--tablet-header-ink)] sm:text-[1.35rem]">
                  {title}
                </p>
              </div>
              {placeLine ? (
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--tablet-header-ink)]/55">
                  {placeLine}
                  {businessName?.trim() && businessName !== tenantTitle
                    ? ` · ${businessName.trim()}`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-stretch self-stretch border border-[var(--tablet-header-ink)]/12 bg-[var(--tablet-header-paper)]/70">
              <HeaderPosLinks links={posLinks} pathname={pathname} />
              {canReadNotifications ? (
                <span className="tablet-header-tool inline-flex items-center justify-center border-l border-[var(--tablet-header-ink)]/12 px-1.5">
                  <NotificationBell />
                </span>
              ) : (
                <span className="tablet-header-tool inline-flex items-center justify-center border-l border-[var(--tablet-header-ink)]/12 px-2.5 text-[var(--tablet-header-ink)]/35">
                  <Bell className="size-4" aria-hidden />
                </span>
              )}
              <button
                type="button"
                onClick={onOpenMore}
                aria-label="Open menu"
                className="tablet-header-avatar inline-flex size-11 shrink-0 items-center justify-center border-l border-[var(--tablet-header-ink)]/12 bg-[var(--tablet-header-ink)] font-mono text-sm font-bold text-[var(--tablet-header-paper)] transition-[letter-spacing,background-color] hover:tracking-widest"
              >
                {userInitial}
              </button>
            </div>
          </div>
        </div>

        {/* Shelf lip */}
        <div className="tablet-header-lip" aria-hidden>
          <span className="tablet-header-lip-fill" />
        </div>
      </div>
    </header>
  );
}

type TabletBottomNavProps = {
  tabs: readonly TabletBottomTab[];
  activeTabId: string | null;
  onMore: () => void;
  /** Equal-width grid tabs for kiosk roles with several direct destinations. */
  layout?: "default" | "compact";
};

export function TabletBottomNav({
  tabs,
  activeTabId,
  onMore,
  layout = "default",
}: TabletBottomNavProps) {
  const linkTabs = tabs.filter((tab) => tab.id !== "more");
  const moreTab = tabs.find((tab) => tab.id === "more");
  const isCompact =
    layout === "compact" || (linkTabs.length >= 4 && !moreTab);
  const tabCount = linkTabs.length + (moreTab ? 1 : 0);

  return (
    <nav
      aria-label="Main navigation"
      className="tablet-bottom-nav fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-2 pointer-events-none sm:px-4"
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto w-full",
          isCompact ? "max-w-[36rem]" : "max-w-[42rem]",
          "border border-border/60 bg-background/95",
          "shadow-[0_8px_28px_-12px_rgba(0,0,0,0.28)]",
          "backdrop-blur-xl",
          "dark:border-border/50 dark:bg-background/90",
          isCompact
            ? "grid gap-0 p-0.5"
            : "flex items-stretch justify-between gap-0 px-0.5 py-0.5",
        )}
        style={
          isCompact
            ? {
                gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {linkTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabId === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tablet-nav-tab flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 transition-colors duration-150",
                isActive && "tablet-nav-tab-active bg-primary/12",
                !isActive && "hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center transition-colors duration-150",
                  isCompact ? "size-8 sm:size-9" : "size-9 sm:size-10",
                )}
              >
                {isActive && !isCompact ? (
                  <span
                    className="absolute inset-0 bg-primary/15"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "relative",
                    isCompact ? "size-[1.05rem] sm:size-[1.15rem]" : "size-[1.15rem] sm:size-5",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  "w-full truncate text-center font-semibold leading-none",
                  isCompact
                    ? "text-[9px] sm:text-[10px]"
                    : "max-w-[4.5rem] text-[9px] sm:text-[10px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {moreTab ? (
          <CompactMoreTab
            tab={moreTab}
            isActive={activeTabId === moreTab.id}
            isCompact={isCompact}
            onMore={onMore}
          />
        ) : null}
      </div>
    </nav>
  );
}

function CompactMoreTab({
  tab,
  isActive,
  isCompact,
  onMore,
}: {
  tab: TabletBottomTab;
  isActive: boolean;
  isCompact: boolean;
  onMore: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onMore}
      aria-label={tab.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "tablet-nav-tab flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 transition-colors duration-150",
        isActive && "tablet-nav-tab-active bg-primary/12",
        !isActive && "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center transition-colors duration-150",
          isCompact ? "size-8 sm:size-9" : "size-9 sm:size-10",
        )}
      >
        {isActive && !isCompact ? (
          <span className="absolute inset-0 bg-primary/15" aria-hidden />
        ) : null}
        <Icon
          className={cn(
            "relative",
            isCompact ? "size-[1.05rem] sm:size-[1.15rem]" : "size-[1.15rem] sm:size-5",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
          strokeWidth={isActive ? 2.25 : 2}
          aria-hidden
        />
      </span>
      <span
        className={cn(
          "w-full truncate text-center font-semibold leading-none",
          isCompact
            ? "text-[9px] sm:text-[10px]"
            : "max-w-[4.5rem] text-[9px] sm:text-[10px]",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {tab.label}
      </span>
    </button>
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
  departmentLocked?: boolean;
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
    resolveActiveNavSectionId(sections, pathname, itemIsActive) ??
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
  departmentLocked = false,
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
  departmentLocked?: boolean;
}) {
  const selectClass =
    "w-full appearance-none border border-border bg-background px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-50";

  return (
    <div className="relative overflow-hidden border border-border bg-muted/30 p-3">
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
            <p className="flex items-center gap-2 border border-border/50 bg-muted/30 px-3 py-2 text-sm font-medium">
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
          {departmentLocked ? (
            <p className="flex items-center gap-2 border border-border/50 bg-muted/30 px-3 py-2 text-sm font-medium">
              <Lock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {itemTypes.find((t) => t.id === itemTypeId)?.label ??
                  "Department"}
              </span>
            </p>
          ) : (
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
                <option value="">{ALL_DEPARTMENTS_LABEL}</option>
                {itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.isDefault ? " ★" : ""}
                  </option>
                ))}
              </>
            )}
          </select>
          )}
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
  departmentLocked = false,
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

  let currentItem: {
    item: TabletNavSection["items"][number];
    section: TabletNavSection;
  } | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      if (itemIsActive(pathname, item.href)) {
        currentItem = { item, section };
        break;
      }
    }
    if (currentItem) break;
  }

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
          className="tablet-more-aurora absolute -left-[20%] -top-[30%] h-[70%] w-[70%] opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
        />
        <div
          className="tablet-more-aurora absolute -bottom-[25%] -right-[15%] h-[60%] w-[55%] opacity-20 blur-3xl [animation-delay:2s]"
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
              className="tablet-more-avatar-ring relative flex size-[3.35rem] shrink-0 items-center justify-center bg-foreground text-lg font-bold text-background"
            >
              {userInitial}
              <span
                className="pointer-events-none absolute -bottom-1 -right-1 flex size-6 items-center justify-center overflow-hidden bg-background ring-2 ring-background"
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
              <p className="truncate font-sans text-lg font-semibold leading-tight tracking-tight sm:text-xl">
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
            className="flex size-9 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {currentItem ? (
          <div
            className="mt-3 flex items-center gap-2 border px-3 py-2 text-xs"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
              background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            }}
          >
            <span
              className="size-1.5 shrink-0 animate-pulse bg-primary"
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
          departmentLocked={departmentLocked}
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
            className="h-10 w-full border border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label="Search navigation"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                          "flex size-6 items-center justify-center",
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
                    <ul className="space-y-1 border border-border/50 bg-card/80 p-1.5 shadow-sm backdrop-blur-sm">
                      {section.items.map((item, index) => {
                        const active = itemIsActive(pathname, item.href);
                        const hue = TILE_HUES[index % TILE_HUES.length];
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                "tablet-more-link-tile group flex items-center gap-3 px-3 py-3 transition-colors",
                                active
                                  ? "bg-primary/12 font-semibold text-primary"
                                  : "hover:bg-muted/60",
                              )}
                              style={{ animationDelay: `${index * 0.03}s` }}
                            >
                              <span
                                className="flex size-9 shrink-0 items-center justify-center text-xs font-bold text-white shadow-sm"
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
                            "tablet-more-link-tile flex h-full flex-col gap-2 border p-3 transition-colors",
                            active
                              ? "border-primary/30 bg-primary/10"
                              : "border-border/50 bg-card hover:border-border hover:bg-muted/40",
                          )}
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex size-8 items-center justify-center bg-muted text-muted-foreground">
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
                <p className="border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
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
                        "tablet-more-section-pill flex shrink-0 items-center gap-2 border px-3 py-2 text-left transition-colors",
                        selected
                          ? "tablet-more-section-pill-active border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center",
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
                              "tablet-more-link-tile group relative flex min-h-[4.5rem] flex-col justify-between overflow-hidden border p-3 transition-colors",
                              active
                                ? "border-primary/35 bg-primary/10"
                                : "border-border/50 bg-card hover:border-border hover:bg-muted/40",
                            )}
                            style={{ animationDelay: `${index * 0.04}s` }}
                          >
                            <div
                              className="pointer-events-none absolute -right-4 -top-4 size-16 opacity-[0.12] blur-xl"
                              style={{ background: `hsl(${hue} 70% 55%)` }}
                              aria-hidden
                            />
                            <div className="relative flex items-start justify-between gap-2">
                              <span
                                className="flex size-9 items-center justify-center text-xs font-bold text-white shadow-sm"
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
              className="w-full max-w-xs gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

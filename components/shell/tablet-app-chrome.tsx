"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  Compass,
  Lock,
  LogOut,
  MapPin,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { NotificationBell } from "@/components/notification-bell";
import {
  SHELL_WORKSPACE_BY_HREF,
  type ShellWorkspaceId,
} from "@/lib/shell-workspaces";
import { ALL_DEPARTMENTS_LABEL, ALL_SHELF_ZONES_LABEL, UNASSIGNED_SHELF_ZONE_VALUE } from "@/hooks/use-session-scope";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
import { shellPageTitle } from "@/lib/shell-page-titles";
import { requestOpenSupportChat } from "@/lib/support-open";
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
  /** Open as a shell FormDrawer instead of navigating. */
  workspace?: ShellWorkspaceId;
};

export type MoreQuickLink = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Open as shell FormDrawer instead of navigating. */
  workspace?: ShellWorkspaceId;
  href?: string;
  /** Special actions that aren't routes. */
  action?: "support";
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
  shelfZoneName?: string | null;
  userInitial: string;
  /** Optional tools rendered before the notification bell (e.g. Kiosk Pay). */
  headerTools?: ReactNode;
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
  shelfZoneName,
  userInitial,
  headerTools,
  posLinks = [],
  onOpenMore,
}: TabletAppHeaderProps) {
  const pathname = usePathname();
  const title = pageTitle ?? shellPageTitle(pathname);
  const accent = primaryColor?.trim() || "#0f766e";

  const placeLine = [branchName?.trim(), departmentName?.trim(), shelfZoneName?.trim()]
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
      {/* Phone: flat app bar. Sm+: market fascia. */}
      <div className="relative border-b border-[var(--tablet-header-ink)]/12 bg-white sm:hidden">
        <div className="flex h-12 items-center gap-2.5 px-3">
          <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden bg-[var(--tablet-header-leaf)]">
            <TenantLogo
              brand={tenantTitle}
              logoUrl={logoUrl}
              faviconUrl={faviconUrl}
              primaryColor={primaryColor}
              variant="sidebar-mark"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-[1.05rem] font-semibold leading-none tracking-tight text-[var(--tablet-header-ink)]">
              {title}
            </p>
            {placeLine ? (
              <p className="mt-0.5 truncate text-[10px] text-[var(--tablet-header-ink)]/50">
                {placeLine}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-[10px] text-[var(--tablet-header-ink)]/50">
                {tenantTitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            {headerTools}
            <NotificationBell />
            <button
              type="button"
              onClick={onOpenMore}
              aria-label="Open menu"
              className="ml-1 inline-flex size-9 items-center justify-center bg-[var(--tablet-header-ink)] font-mono text-xs font-bold text-white"
            >
              {userInitial}
            </button>
          </div>
        </div>
        <div
          className="h-0.5 w-full"
          style={{ background: accent }}
          aria-hidden
        />
      </div>

      <div className="tablet-header-fascia relative hidden overflow-hidden border-b border-[var(--tablet-header-ink)]/15 sm:block">
        <div className="tablet-header-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="tablet-header-hatch pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        <div className="relative flex min-h-[3.75rem] items-stretch">
          <div className="tablet-header-stamp flex shrink-0 items-center gap-3 bg-[var(--tablet-header-leaf)] px-4 py-2.5 text-[var(--tablet-header-paper)]">
            <div className="tablet-header-logo relative flex size-11 shrink-0 items-center justify-center overflow-hidden bg-[var(--tablet-header-paper)]">
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
            <div className="min-w-0 max-w-[16rem]">
              <h1 className="tablet-header-brand truncate font-heading text-[1.55rem] font-semibold leading-[0.95] tracking-[-0.02em]">
                {tenantTitle}
              </h1>
            </div>
          </div>

          <div
            className="tablet-header-cut relative w-4 shrink-0 bg-[var(--tablet-header-leaf)]"
            aria-hidden
          />

          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
            <div className="tablet-header-aisle min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-x-2 gap-y-0.5">
                <span className="tablet-header-page font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--tablet-header-accent)]">
                  Aisle
                </span>
                <p className="truncate font-heading text-[1.35rem] font-semibold leading-none tracking-tight text-[var(--tablet-header-ink)]">
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
              {headerTools}
              <span className="tablet-header-tool inline-flex items-center justify-center border-l border-[var(--tablet-header-ink)]/12 px-1.5">
                <NotificationBell />
              </span>
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
  onOpenWorkspace?: (workspace: ShellWorkspaceId) => void;
  /** Equal-width grid tabs for kiosk roles with several direct destinations. */
  layout?: "default" | "compact";
};

export function TabletBottomNav({
  tabs,
  activeTabId,
  onMore,
  onOpenWorkspace,
  layout: _layout = "default",
}: TabletBottomNavProps) {
  const linkTabs = tabs.filter((tab) => tab.id !== "more");
  const moreTab = tabs.find((tab) => tab.id === "more");
  const tabCount = linkTabs.length + (moreTab ? 1 : 0);
  void _layout;

  return (
    <nav
      aria-label="Main navigation"
      className="tablet-bottom-nav fixed inset-x-0 bottom-0 z-40 pointer-events-none"
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto w-full",
          "border-t border-border/70 bg-background/95",
          "pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1",
          "backdrop-blur-xl supports-[backdrop-filter]:bg-background/88",
          "dark:border-border/50 dark:bg-background/92",
          "grid gap-0",
        )}
        style={{
          gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
        }}
      >
        {linkTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabId === tab.id;
          const tabClass = cn(
            "tablet-nav-tab relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-150",
            "active:bg-muted/60",
            isActive && "tablet-nav-tab-active",
          );
          const tabBody = (
            <>
              {isActive ? (
                <span
                  className="absolute inset-x-3 top-0 h-0.5 bg-primary"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={cn(
                  "size-[1.35rem]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                strokeWidth={isActive ? 2.35 : 1.9}
                aria-hidden
              />
              <span
                className={cn(
                  "w-full truncate text-center text-[11px] font-semibold leading-none tracking-[-0.01em]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </>
          );

          if (tab.workspace && onOpenWorkspace) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onOpenWorkspace(tab.workspace!)}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                className={tabClass}
              >
                {tabBody}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              aria-current={isActive ? "page" : undefined}
              className={tabClass}
            >
              {tabBody}
            </Link>
          );
        })}

        {moreTab ? (
          <CompactMoreTab
            tab={moreTab}
            isActive={activeTabId === moreTab.id}
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
  onMore,
}: {
  tab: TabletBottomTab;
  isActive: boolean;
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
        "tablet-nav-tab relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors duration-150",
        "active:bg-muted/60",
        isActive && "tablet-nav-tab-active",
      )}
    >
      {isActive ? (
        <span
          className="absolute inset-x-3 top-0 h-0.5 bg-primary"
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn(
          "size-[1.35rem]",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
        strokeWidth={isActive ? 2.35 : 1.9}
        aria-hidden
      />
      <span
        className={cn(
          "w-full truncate text-center text-[11px] font-semibold leading-none tracking-[-0.01em]",
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
  aisles?: { id: string; name: string; code: string; productCount?: number }[];
  aisleId?: string;
  aislesLoading?: boolean;
  onAisleChange?: (id: string) => void;
  showShelfZonePicker?: boolean;
  showUnassignedAisleOption?: boolean;
  onLogout: () => void;
  itemIsActive: (pathname: string, href: string) => boolean;
  /** Cashier / stock manager / grocery: flat link list instead of launcher grid. */
  compactNav?: boolean;
  /** Live unread counts keyed by nav href (e.g. the support thread). */
  badgeByHref?: Readonly<Record<string, number>>;
  /** Personal staff payslip portal link. */
  myPayHref?: string | null;
  /** Staff profile — pay, advances, workplace concern. */
  profileHref?: string | null;
  /** Owner shortcuts shown above section browse. */
  quickLinks?: readonly MoreQuickLink[];
  /** Open Order / Credits / Settings as drawers instead of pages. */
  onOpenWorkspace?: (workspace: ShellWorkspaceId) => void;
};

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

function MoreDestControl({
  href,
  onClose,
  onOpenWorkspace,
  className,
  style,
  children,
}: {
  href: string;
  onClose: () => void;
  onOpenWorkspace?: (workspace: ShellWorkspaceId) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const workspace = SHELL_WORKSPACE_BY_HREF[href];
  if (workspace && onOpenWorkspace) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={() => {
          onClose();
          window.setTimeout(() => onOpenWorkspace(workspace), 40);
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <Link href={href} onClick={onClose} className={className} style={style}>
      {children}
    </Link>
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
  aisles = [],
  aisleId = "",
  aislesLoading = false,
  onAisleChange,
  showShelfZonePicker = false,
  showUnassignedAisleOption = true,
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
  aisles?: { id: string; name: string; code: string; productCount?: number }[];
  aisleId?: string;
  aislesLoading?: boolean;
  onAisleChange?: (id: string) => void;
  showShelfZonePicker?: boolean;
  showUnassignedAisleOption?: boolean;
}) {
  const field =
    "w-full appearance-none bg-transparent py-2.5 pl-0 pr-6 text-[13px] font-medium tracking-[-0.01em] text-[var(--order-ink,#15231f)] focus:outline-none disabled:opacity-50";
  const row =
    "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] last:border-b-0";

  return (
    <section
      className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
      aria-label="Workspace scope"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pos-primary,#0f766e)]">
          <Compass className="size-3" aria-hidden />
          Scope
        </p>
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
      </div>

      <div className="px-3">
        <div className={row}>
          <label className="pt-2.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            Branch
          </label>
          {showBranchPicker ? (
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-[var(--pos-primary,#0f766e)]"
                aria-hidden
              />
              <select
                className={cn(field, "pl-5")}
                value={branchId}
                onChange={(e) => onBranchChange(e.target.value)}
                disabled={branchesLoading || branches.length === 0}
                aria-label="Select branch"
                data-shell-branch-select=""
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
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
                aria-hidden
              />
            </div>
          ) : branchName ? (
            <p className="flex items-center gap-2 py-2.5 text-[13px] font-medium text-[var(--order-ink,#15231f)]">
              {branchLocked ? (
                <Lock className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]" />
              ) : (
                <MapPin className="size-3.5 shrink-0 text-[var(--pos-primary,#0f766e)]" />
              )}
              <span className="truncate">{branchName}</span>
            </p>
          ) : null}
        </div>

        <div className={row}>
          <label className="pt-2.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            Department
          </label>
          {departmentLocked ? (
            <p className="flex items-center gap-2 py-2.5 text-[13px] font-medium text-[var(--order-ink,#15231f)]">
              <Lock className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]" />
              <span className="truncate">
                {itemTypes.find((t) => t.id === itemTypeId)?.label ??
                  "Department"}
              </span>
            </p>
          ) : (
            <div className="relative">
              <select
                className={field}
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
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
                aria-hidden
              />
            </div>
          )}
        </div>

        {showShelfZonePicker && onAisleChange ? (
          <div className={row}>
            <label className="pt-2.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Shelf zone
            </label>
            <div className="relative">
              <select
                className={field}
                value={aisleId}
                onChange={(e) => onAisleChange(e.target.value)}
                disabled={aislesLoading || aisles.length === 0}
                aria-label="Select shelf zone"
              >
                {aisles.length === 0 ? (
                  <option value="">
                    {aislesLoading
                      ? "Loading…"
                      : itemTypeId.trim()
                        ? "No zones in department"
                        : "No shelf zones"}
                  </option>
                ) : (
                  <>
                    <option value="">{ALL_SHELF_ZONES_LABEL}</option>
                    {showUnassignedAisleOption ? (
                      <option value={UNASSIGNED_SHELF_ZONE_VALUE}>
                        No shelf zone
                      </option>
                    ) : null}
                    {aisles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                        {itemTypeId.trim() && a.productCount != null
                          ? ` · ${a.productCount}`
                          : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
                aria-hidden
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
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
  aisles = [],
  aisleId = "",
  aislesLoading = false,
  onAisleChange,
  showShelfZonePicker = false,
  showUnassignedAisleOption = true,
  onLogout,
  itemIsActive,
  compactNav = false,
  badgeByHref,
  myPayHref,
  profileHref,
  quickLinks = [],
  onOpenWorkspace,
}: TabletMoreSheetProps) {
  const accent = primaryColor?.trim() || "#0f766e";
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
        if (
          compactNav &&
          profileHref &&
          item.href === profileHref
        ) {
          continue;
        }
        if (item.label.toLowerCase().includes(q)) {
          hits.push({ ...item, section });
        }
      }
    }
    return hits;
  }, [search, sections, compactNav, profileHref]);

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

  const compactSections = useMemo(() => {
    if (!compactNav || !profileHref) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.href !== profileHref),
      }))
      .filter((section) => section.items.length > 0);
  }, [compactNav, profileHref, sections]);

  const runQuickLink = (link: MoreQuickLink) => {
    if (link.action === "support") {
      onClose();
      requestOpenSupportChat();
      return;
    }
    if (link.workspace && onOpenWorkspace) {
      onClose();
      window.setTimeout(() => onOpenWorkspace(link.workspace!), 40);
      return;
    }
    onClose();
  };

  if (!open) return null;

  const sheetStyle = {
    "--tablet-accent": accent,
    "--pos-primary": accent,
    "--order-ink": "#15231f",
  } as CSSProperties;

  const ink = "text-[var(--order-ink,#15231f)]";
  const mute =
    "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";
  const hair =
    "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

  return (
    <div
      className="tablet-more-sheet fixed inset-0 z-50 flex flex-col bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,#f7f5f1)]"
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      style={sheetStyle}
    >
      {/* Identity */}
      <header
        className="relative shrink-0 border-b bg-white px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5"
        style={{
          borderColor:
            "color-mix(in srgb, var(--order-ink, #15231f) 10%, transparent)",
        }}
      >
        <div className="mx-auto mb-2 flex justify-center sm:hidden" aria-hidden>
          <span className="h-0.5 w-8 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="relative flex size-10 shrink-0 items-center justify-center bg-[var(--order-ink,#15231f)] text-[14px] font-semibold tracking-[-0.02em] text-white"
              aria-hidden
            >
              {userInitial}
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center overflow-hidden bg-white ring-2 ring-white">
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
              <p
                className={cn(
                  "truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]",
                  ink,
                )}
              >
                {userDisplayName}
              </p>
              <p className={cn("truncate text-[11px]", mute)}>
                {currentItem
                  ? currentItem.item.label
                  : greeting}
                {userEmail?.trim() && userEmail !== userDisplayName && !currentItem
                  ? ` · ${tenantTitle}`
                  : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center border bg-white transition-colors",
              hair,
              mute,
              "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
            )}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {profileHref || myPayHref ? (
        <div className="shrink-0 px-4 pt-3 sm:px-5">
          {profileHref ? (
            <Link
              href={profileHref}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 border bg-white px-3.5 py-3 transition-colors",
                hair,
                "hover:border-[var(--pos-primary,#0f766e)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]">
                <UserRound className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13px] font-semibold tracking-[-0.01em]", ink)}>
                  My profile
                </span>
                <span className={cn("block text-[11px]", mute)}>
                  Pay & concerns
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                  mute,
                )}
                aria-hidden
              />
            </Link>
          ) : myPayHref ? (
            <Link
              href={myPayHref}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 border bg-white px-3.5 py-3 transition-colors",
                hair,
                "hover:border-[var(--pos-primary,#0f766e)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]">
                <Banknote className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[13px] font-semibold tracking-[-0.01em]", ink)}>
                  My pay
                </span>
                <span className={cn("block text-[11px]", mute)}>
                  Advances & slips
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                  mute,
                )}
                aria-hidden
              />
            </Link>
          ) : null}
        </div>
      ) : null}

      {quickLinks.length > 0 ? (
        <div className="shrink-0 px-4 pt-3 sm:px-5">
          <p
            className={cn(
              "mb-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
              mute,
            )}
          >
            Jump to
          </p>
          <div className="grid grid-cols-3 gap-px overflow-hidden border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--order-ink, #15231f) 12%, transparent)" }}>
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const className = cn(
                "group flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 bg-white px-1.5 py-2.5 text-center transition-colors",
                "active:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]",
                "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
              );
              const body = (
                <>
                  <span className="flex size-8 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]">
                    <Icon className="size-4" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-[11px] font-semibold leading-tight tracking-[-0.02em]",
                      ink,
                    )}
                  >
                    {link.label}
                  </span>
                </>
              );
              if (link.workspace || link.action) {
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => runQuickLink(link)}
                    className={className}
                    title={link.hint}
                    aria-label={link.hint ? `${link.label}: ${link.hint}` : link.label}
                  >
                    {body}
                  </button>
                );
              }
              return (
                <Link
                  key={link.id}
                  href={link.href ?? "#"}
                  onClick={onClose}
                  className={className}
                  title={link.hint}
                  aria-label={link.hint ? `${link.label}: ${link.hint}` : link.label}
                >
                  {body}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3 sm:px-5">
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
          aisles={aisles}
          aisleId={aisleId}
          aislesLoading={aislesLoading}
          onAisleChange={onAisleChange}
          showShelfZonePicker={showShelfZonePicker}
          showUnassignedAisleOption={showUnassignedAisleOption}
        />

        <div className="relative mt-3 shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Jump to any screen…"
            className={cn(
              "h-10 w-full border bg-white pl-9 pr-9 text-[13px] tracking-[-0.01em]",
              hair,
              ink,
              "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]",
              "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
              "focus-visible:ring-1 focus-visible:ring-[var(--pos-primary,#0f766e)]",
            )}
            aria-label="Search navigation"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={cn(
                "absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5",
                mute,
                "hover:text-[var(--order-ink,#15231f)]",
              )}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {compactNav ? (
            <div className="space-y-5">
              {(search.trim()
                ? [
                    {
                      id: "search",
                      title: searchHits.length
                        ? `${searchHits.length} match${searchHits.length === 1 ? "" : "es"}`
                        : "No matches",
                      blurb: "",
                      icon: Search,
                      items: searchHits.map(({ href, label }) => ({
                        href,
                        label,
                      })),
                    } satisfies TabletNavSection,
                  ]
                : compactSections
              ).map((section) => {
                const Icon = section.icon;
                const sectionHasActive = section.items.some((item) =>
                  itemIsActive(pathname, item.href),
                );
                if (search.trim() && section.items.length === 0) {
                  return (
                    <p
                      key={section.id}
                      className={cn(
                        "border border-dashed bg-white px-4 py-10 text-center text-[13px]",
                        hair,
                        mute,
                      )}
                    >
                      Try a different keyword — stock, order, support…
                    </p>
                  );
                }
                return (
                  <div key={section.id}>
                    <div className="mb-2 flex items-center gap-2 px-0.5">
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          sectionHasActive
                            ? "text-[var(--pos-primary,#0f766e)]"
                            : mute,
                        )}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-[0.14em]",
                          sectionHasActive
                            ? "text-[var(--pos-primary,#0f766e)]"
                            : mute,
                        )}
                      >
                        {section.title}
                      </p>
                    </div>
                    <ul className={cn("divide-y border bg-white", hair)}>
                      {section.items.map((item, index) => {
                        const active = itemIsActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <MoreDestControl
                              href={item.href}
                              onClose={onClose}
                              onOpenWorkspace={onOpenWorkspace}
                              className={cn(
                                "tablet-more-link-tile group flex min-h-12 w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
                                active
                                  ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]"
                                  : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]",
                              )}
                              style={{ animationDelay: `${index * 0.025}s` }}
                            >
                              <span
                                className={cn(
                                  "size-1.5 shrink-0",
                                  active
                                    ? "bg-[var(--pos-primary,#0f766e)]"
                                    : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]",
                                )}
                                aria-hidden
                              />
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate text-[13px] tracking-[-0.01em]",
                                  active
                                    ? "font-semibold text-[var(--pos-primary,#0f766e)]"
                                    : cn("font-medium", ink),
                                )}
                              >
                                {item.label}
                              </span>
                              {badgeByHref?.[item.href] ? (
                                <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold leading-none text-white">
                                  {badgeByHref[item.href] > 9
                                    ? "9+"
                                    : badgeByHref[item.href]}
                                </span>
                              ) : null}
                              <ChevronRight
                                className={cn(
                                  "size-4 shrink-0 opacity-35 transition-transform group-hover:translate-x-0.5 group-hover:opacity-70",
                                  active &&
                                    "text-[var(--pos-primary,#0f766e)] opacity-100",
                                )}
                                aria-hidden
                              />
                            </MoreDestControl>
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
              <p
                className={cn(
                  "mb-2 px-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                  mute,
                )}
              >
                {searchHits.length > 0
                  ? `${searchHits.length} match${searchHits.length === 1 ? "" : "es"}`
                  : "No matches"}
              </p>
              {searchHits.length > 0 ? (
                <ul className={cn("divide-y border bg-white", hair)}>
                  {searchHits.map((hit, index) => {
                    const active = itemIsActive(pathname, hit.href);
                    const SectionIcon = hit.section.icon;
                    return (
                      <li key={`${hit.href}-${hit.section.id}`}>
                        <MoreDestControl
                          href={hit.href}
                          onClose={onClose}
                          onOpenWorkspace={onOpenWorkspace}
                          className={cn(
                            "tablet-more-link-tile flex min-h-12 w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
                            active
                              ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]"
                              : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                          )}
                          style={{ animationDelay: `${index * 0.025}s` }}
                        >
                          <SectionIcon
                            className={cn("size-4 shrink-0", mute)}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-[13px] font-medium",
                                active
                                  ? "font-semibold text-[var(--pos-primary,#0f766e)]"
                                  : ink,
                              )}
                            >
                              {hit.label}
                            </span>
                            <span className={cn("block text-[10px]", mute)}>
                              {hit.section.title}
                            </span>
                          </span>
                          {badgeByHref?.[hit.href] ? (
                            <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold leading-none text-white">
                              {badgeByHref[hit.href] > 9
                                ? "9+"
                                : badgeByHref[hit.href]}
                            </span>
                          ) : null}
                        </MoreDestControl>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  className={cn(
                    "border border-dashed bg-white px-4 py-10 text-center text-[13px]",
                    hair,
                    mute,
                  )}
                >
                  Try a different keyword — products, stock, settings…
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                          ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                          : cn(
                              hair,
                              "bg-white",
                              ink,
                              "hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]",
                            ),
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          selected
                            ? "text-white"
                            : hasActive
                              ? "text-[var(--pos-primary,#0f766e)]"
                              : mute,
                        )}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="max-w-[7.5rem] truncate text-[12px] font-semibold tracking-[-0.01em]">
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeSection ? (
                <div>
                  <p className={cn("mb-2 px-0.5 text-[12px]", mute)}>
                    {activeSection.blurb}
                  </p>
                  <ul className={cn("divide-y border bg-white sm:grid sm:grid-cols-2 sm:gap-px sm:divide-y-0 sm:border-0 sm:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]", hair)}>
                    {activeSection.items.map((item, index) => {
                      const active = itemIsActive(pathname, item.href);
                      return (
                        <li key={item.href} className="sm:bg-white">
                          <MoreDestControl
                            href={item.href}
                            onClose={onClose}
                            onOpenWorkspace={onOpenWorkspace}
                            className={cn(
                              "tablet-more-link-tile group flex min-h-12 w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors sm:min-h-[4.25rem] sm:flex-col sm:items-start sm:justify-between",
                              active
                                ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]"
                                : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)]",
                            )}
                            style={{ animationDelay: `${index * 0.03}s` }}
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "size-1.5 shrink-0 sm:mt-1",
                                  active
                                    ? "bg-[var(--pos-primary,#0f766e)]"
                                    : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]",
                                )}
                                aria-hidden
                              />
                              <ChevronRight
                                className={cn(
                                  "size-4 shrink-0 opacity-30 transition-transform group-hover:translate-x-0.5 sm:ml-auto",
                                  active &&
                                    "text-[var(--pos-primary,#0f766e)] opacity-100",
                                )}
                                aria-hidden
                              />
                            </span>
                            <span
                              className={cn(
                                "flex min-w-0 flex-1 items-center justify-between gap-2 text-[13px] font-semibold tracking-[-0.01em] sm:mt-2 sm:w-full",
                                active
                                  ? "text-[var(--pos-primary,#0f766e)]"
                                  : ink,
                              )}
                            >
                              <span className="truncate">{item.label}</span>
                              {badgeByHref?.[item.href] ? (
                                <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold leading-none text-white">
                                  {badgeByHref[item.href] > 9
                                    ? "9+"
                                    : badgeByHref[item.href]}
                                </span>
                              ) : null}
                            </span>
                          </MoreDestControl>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          <div className="mt-6 flex flex-col items-center gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-4">
            <button
              type="button"
              onClick={onLogout}
              className={cn(
                "inline-flex h-10 w-full max-w-xs items-center justify-center gap-2 border bg-white text-[13px] font-medium transition-colors",
                hair,
                "text-rose-700 hover:border-rose-600/40 hover:bg-rose-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40",
              )}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
            <p className={cn("text-[10px] tracking-[-0.01em]", mute)}>
              {tenantTitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

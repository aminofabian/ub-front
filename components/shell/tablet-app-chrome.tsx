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
import { ALL_DEPARTMENTS_LABEL, ALL_SHELF_ZONES_LABEL, UNASSIGNED_SHELF_ZONE_VALUE } from "@/hooks/use-session-scope";
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
      <div className="tablet-header-fascia relative overflow-hidden border-b border-[var(--tablet-header-ink)]/15">
        {/* Market-awning wash + hatch */}
        <div className="tablet-header-wash pointer-events-none absolute inset-0" aria-hidden />
        <div className="tablet-header-hatch pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

        <div className="relative flex min-h-[3.75rem] items-stretch">
          {/* Brand stamp block — logo-only on phone so tools keep a clear column */}
          <div className="tablet-header-stamp flex shrink-0 items-center gap-2.5 bg-[var(--tablet-header-leaf)] px-2.5 py-2.5 text-[var(--tablet-header-paper)] sm:gap-3 sm:px-4">
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
            <div className="hidden min-w-0 max-w-[16rem] sm:block">
              <h1 className="tablet-header-brand truncate font-heading text-[1.55rem] font-semibold leading-[0.95] tracking-[-0.02em]">
                {tenantTitle}
              </h1>
            </div>
            <h1 className="sr-only sm:hidden">{tenantTitle}</h1>
          </div>

          {/* Diagonal cut between stamp and deck */}
          <div
            className="tablet-header-cut relative hidden w-4 shrink-0 bg-[var(--tablet-header-leaf)] sm:block"
            aria-hidden
          />

          {/* Aisle deck */}
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
            <div className="tablet-header-aisle min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-x-2 gap-y-0.5">
                <span className="tablet-header-page hidden font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--tablet-header-accent)] sm:inline">
                  Aisle
                </span>
                <p className="truncate font-heading text-lg font-semibold leading-none tracking-tight text-[var(--tablet-header-ink)] sm:text-[1.35rem]">
                  {title}
                </p>
              </div>
              {placeLine ? (
                <p className="mt-1 hidden truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--tablet-header-ink)]/55 sm:block">
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
      <header className="relative shrink-0 border-b bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5" style={{ borderColor: "color-mix(in srgb, var(--order-ink, #15231f) 10%, transparent)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="relative flex size-11 shrink-0 items-center justify-center bg-[var(--order-ink,#15231f)] text-[15px] font-semibold tracking-[-0.02em] text-white"
              aria-hidden
            >
              {userInitial}
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center overflow-hidden bg-white ring-2 ring-white">
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
              <p className={cn("text-[11px] tracking-[-0.01em]", mute)}>
                {greeting}
              </p>
              <p
                className={cn(
                  "truncate text-[1.05rem] font-semibold leading-tight tracking-[-0.02em]",
                  ink,
                )}
              >
                {userDisplayName}
              </p>
              <p className={cn("truncate text-[11px]", mute)}>
                {userEmail?.trim() && userEmail !== userDisplayName
                  ? userEmail
                  : tenantTitle}
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

        {currentItem ? (
          <p
            className={cn(
              "mt-3 flex items-center gap-2 border px-3 py-2 text-[12px]",
              hair,
              "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
            )}
          >
            <span
              className="size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
            <span className={mute}>Now on</span>
            <span className={cn("truncate font-semibold", ink)}>
              {currentItem.item.label}
            </span>
          </p>
        ) : null}
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
                  Pay, advances, and raise a concern
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
                  Salary, advances, and payslips
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
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className={cn(
                                "tablet-more-link-tile group flex min-h-12 items-center gap-3 px-3.5 py-3 transition-colors",
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
                        <Link
                          href={hit.href}
                          onClick={onClose}
                          className={cn(
                            "tablet-more-link-tile flex min-h-12 items-center gap-3 px-3.5 py-3 transition-colors",
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
                        </Link>
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
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              "tablet-more-link-tile group flex min-h-12 items-center gap-3 px-3.5 py-3.5 transition-colors sm:min-h-[4.25rem] sm:flex-col sm:items-start sm:justify-between",
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
                          </Link>
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

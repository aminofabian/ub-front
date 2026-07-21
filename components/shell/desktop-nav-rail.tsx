"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileUp,
  FolderTree,
  Globe,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Monitor,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Phone,
  Receipt,
  ScanLine,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Store,
  Tags,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/lib/config";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
import { cn } from "@/lib/utils";

export type DesktopNavItem = {
  href: string;
  label: string;
  group?: string;
  featureFlag?: string;
};

export type DesktopNavSection = {
  id: string;
  title: string;
  shortLabel: string;
  blurb?: string;
  icon: LucideIcon;
  entryHref: string;
  items: readonly DesktopNavItem[];
};

/** Icon-rail clusters — dividers separate related sections at a glance. */
const RAIL_CLUSTER_IDS: readonly (readonly string[])[] = [
  ["overview"],
  ["org", "catalog", "procurement", "inventory"],
  ["ops", "payments", "credits"],
  ["sales"],
];

const SEARCH_MIN_ITEMS = 6;

const ITEM_ICON_BY_HREF: Partial<Record<string, LucideIcon>> = {
  [APP_ROUTES.business]: LayoutDashboard,
  [APP_ROUTES.businessSettings]: Settings,
  [APP_ROUTES.businessConfiguration]: SlidersHorizontal,
  [APP_ROUTES.businessBranding]: Palette,
  [APP_ROUTES.businessMobile]: Smartphone,
  [APP_ROUTES.businessDomains]: Globe,
  [APP_ROUTES.branches]: MapPin,
  [APP_ROUTES.users]: Users,
  [APP_ROUTES.businessImport]: FileUp,
  [APP_ROUTES.promoCampaigns]: Megaphone,
  [APP_ROUTES.desktopSettings]: Monitor,
  [APP_ROUTES.inventoryStockTakeDailyAuditReview]: ClipboardCheck,
  [APP_ROUTES.inventoryStockTakeRestock]: ClipboardCheck,
  [APP_ROUTES.inventoryStockTakeRestockOrders]: ClipboardCheck,
  [APP_ROUTES.products]: Package,
  [APP_ROUTES.itemTypes]: Tags,
  [APP_ROUTES.categories]: FolderTree,
  [APP_ROUTES.suppliers]: Truck,
  [APP_ROUTES.marketplace]: Store,
  [APP_ROUTES.purchasingAddSupplies]: Package,
  [APP_ROUTES.purchasingIntelligence]: BarChart3,
  [APP_ROUTES.purchasingApAging]: Receipt,
  [APP_ROUTES.purchasingRecordPayment]: CreditCard,
  [APP_ROUTES.inventorySupplyBatches]: Warehouse,
  [APP_ROUTES.inventoryStock]: Warehouse,
  [APP_ROUTES.inventoryRestock]: Package,
  [APP_ROUTES.inventoryValuation]: BarChart3,
  [APP_ROUTES.inventoryCostIssues]: Receipt,
  [APP_ROUTES.inventoryTransfers]: Truck,
  [APP_ROUTES.inventoryMissingBarcodes]: ScanLine,
  [APP_ROUTES.inventoryStockTake]: ClipboardList,
  [APP_ROUTES.inventoryStockTakeDailyAudit]: ClipboardCheck,
  [APP_ROUTES.inventoryStockTakeInvestigations]: ClipboardList,
  [APP_ROUTES.inventoryStockTakeReconciliation]: ClipboardCheck,
  [APP_ROUTES.pricing]: Tags,
  [APP_ROUTES.shifts]: SlidersHorizontal,
  [APP_ROUTES.paymentsSettings]: CreditCard,
  [APP_ROUTES.paymentsDayLedger]: Receipt,
  [APP_ROUTES.customers]: Users,
  [APP_ROUTES.customerPhones]: Phone,
  [APP_ROUTES.creditsPaymentClaims]: Receipt,
  [APP_ROUTES.sales]: ShoppingBag,
  [APP_ROUTES.salesTransactions]: Receipt,
  [APP_ROUTES.salesPendingCarts]: ShoppingBag,
  [APP_ROUTES.analytics]: BarChart3,
  [APP_ROUTES.analyticsActivity]: Activity,
  [APP_ROUTES.salesReports]: BarChart3,
  [APP_ROUTES.storefrontWebOrders]: Store,
  [APP_ROUTES.salesQuick]: ScanLine,
  [APP_ROUTES.cashier]: ScanLine,
  [APP_ROUTES.butcher]: ScanLine,
  [APP_ROUTES.butcherSuppliers]: Truck,
  [APP_ROUTES.grocery]: Store,
  [APP_ROUTES.groceryInvoices]: Receipt,
};

/** One-word (or short) rail labels — avoids "Stock take" truncating to duplicate "Stock". */
const RAIL_SHORT_LABEL_BY_HREF: Partial<Record<string, string>> = {
  [APP_ROUTES.inventoryStock]: "Stock",
  [APP_ROUTES.inventoryRestock]: "Out",
  [APP_ROUTES.inventoryStockTake]: "Counts",
  [APP_ROUTES.inventoryStockTakeDailyAudit]: "Audit",
  [APP_ROUTES.inventoryStockTakeDailyAuditReview]: "Review",
  [APP_ROUTES.inventoryStockTakeRestock]: "Restock",
  [APP_ROUTES.inventoryStockTakeRestockOrders]: "Orders",
  [APP_ROUTES.inventoryStockTakeInvestigations]: "Cases",
  [APP_ROUTES.inventoryStockTakeReconciliation]: "Recon",
  [APP_ROUTES.inventorySupplyBatches]: "Batches",
  [APP_ROUTES.inventoryValuation]: "Value",
  [APP_ROUTES.inventoryTransfers]: "Moves",
  [APP_ROUTES.purchasingAddSupplies]: "Receive",
  [APP_ROUTES.purchasingApAging]: "AP",
  [APP_ROUTES.purchasingRecordPayment]: "Pay",
  [APP_ROUTES.paymentsDayLedger]: "Ledger",
  [APP_ROUTES.salesQuick]: "Sale",
  [APP_ROUTES.butcher]: "Counter",
  [APP_ROUTES.butcherSuppliers]: "Suppliers",
  [APP_ROUTES.groceryInvoices]: "Invoices",
};

function railShortLabel(item: DesktopNavItem): string {
  const mapped = RAIL_SHORT_LABEL_BY_HREF[item.href];
  if (mapped) return mapped;
  const first = item.label.trim().split(/\s+/)[0];
  return first || item.label;
}

function normalizePath(pathname: string): string {
  return pathname.split("?")[0] ?? pathname;
}

function itemIsActive(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  if (href === "/") return path === "/";
  if (href === APP_ROUTES.butcher) {
    return path === APP_ROUTES.butcher;
  }
  return path === href || path.startsWith(`${href}/`) || path.startsWith(`${href}?`);
}

function sectionHasActiveItem(
  pathname: string,
  items: readonly DesktopNavItem[],
): boolean {
  return items.some((item) => itemIsActive(pathname, item.href));
}

function iconForItem(item: DesktopNavItem, fallback: LucideIcon): LucideIcon {
  return ITEM_ICON_BY_HREF[item.href] ?? fallback;
}

type ItemGroup = {
  label: string | null;
  items: DesktopNavItem[];
};

/** Preserve first-seen group order from the section config. */
function groupNavItems(items: readonly DesktopNavItem[]): ItemGroup[] {
  const groups: ItemGroup[] = [];
  const indexByLabel = new Map<string | null, number>();

  for (const item of items) {
    const label = item.group?.trim() || null;
    const existing = indexByLabel.get(label);
    if (existing === undefined) {
      indexByLabel.set(label, groups.length);
      groups.push({ label, items: [item] });
    } else {
      groups[existing].items.push(item);
    }
  }

  return groups;
}

function clusterVisibleSections(
  sections: readonly DesktopNavSection[],
): DesktopNavSection[][] {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const used = new Set<string>();
  const clusters: DesktopNavSection[][] = [];

  for (const ids of RAIL_CLUSTER_IDS) {
    const cluster = ids
      .map((id) => byId.get(id))
      .filter((section): section is DesktopNavSection => Boolean(section));
    if (cluster.length === 0) continue;
    for (const section of cluster) used.add(section.id);
    clusters.push(cluster);
  }

  const leftovers = sections.filter((section) => !used.has(section.id));
  if (leftovers.length > 0) {
    clusters.push(leftovers);
  }

  return clusters;
}

type RailLinkProps = {
  href: string;
  label: string;
  tooltip: string;
  icon: LucideIcon;
  active: boolean;
};

function RailLink({ href, label, tooltip, icon: Icon, active }: RailLinkProps) {
  return (
    <Link
      href={href}
      title={tooltip}
      className={cn(
        "group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={tooltip}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
        />
      ) : null}
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
          active
            ? "bg-primary/14 text-primary shadow-sm"
            : "text-muted-foreground group-hover:bg-muted/70 group-hover:text-foreground",
        )}
      >
        <Icon className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
      </span>
      <span
        className={cn(
          "max-w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

type SubNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  compact?: boolean;
};

function SubNavLink({
  href,
  label,
  icon: Icon,
  active,
  compact = false,
}: SubNavLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group relative flex items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
        compact
          ? "justify-center rounded-lg py-1.5"
          : "gap-2.5 rounded-lg px-3 py-1.5 text-[13px] leading-snug",
        active
          ? compact
            ? "bg-primary/14 text-primary"
            : "bg-primary/10 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      {active && !compact ? (
        <span
          aria-hidden
          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
        />
      ) : null}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center",
          compact ? "size-8" : "size-6",
          active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon
          className={compact ? "size-[1.05rem]" : "size-4"}
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      {!compact ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

type SubNavPanelProps = {
  section: DesktopNavSection;
  pathname: string;
  compact: boolean;
  onCollapse: () => void;
  onExpand: () => void;
};

function SubNavPanel({
  section,
  pathname,
  compact,
  onCollapse,
  onExpand,
}: SubNavPanelProps) {
  const [query, setQuery] = useState("");

  // Reset filter when switching sections so leftover text doesn't hide items.
  useEffect(() => {
    setQuery("");
  }, [section.id]);

  const showSearch = !compact && section.items.length >= SEARCH_MIN_ITEMS;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return section.items;
    return section.items.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, section.items]);

  const groups = useMemo(() => groupNavItems(filteredItems), [filteredItems]);
  const hasLabeledGroups = groups.some((group) => group.label);

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border/60 bg-background transition-[width] duration-200",
        compact ? "w-14" : "w-52",
      )}
    >
      <div
        className={cn(
          "flex border-b border-border/50",
          compact
            ? "flex-col items-center gap-1 px-1.5 py-3"
            : "items-start justify-between gap-2 px-4 py-[0.9rem]",
        )}
      >
        {compact ? (
          <button
            type="button"
            onClick={onExpand}
            title={`Show ${section.title} pages`}
            aria-label={`Show ${section.title} pages`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <PanelLeftOpen className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {section.title}
              </p>
              {section.blurb ? (
                <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                  {section.blurb}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCollapse}
              title="Collapse to icons"
              aria-label="Collapse to icons"
              className="-mr-1 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <PanelLeftClose className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </>
        )}
      </div>

      {showSearch ? (
        <div className="border-b border-border/40 px-2.5 py-2">
          <label className="relative block">
            <span className="sr-only">Filter {section.title} pages</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter pages…"
              className="h-8 border-border/60 bg-muted/30 pl-8 text-xs shadow-none"
            />
          </label>
        </div>
      ) : null}

      <nav
        className={cn(
          "flex flex-1 flex-col overflow-y-auto",
          compact ? "gap-0.5 p-1.5" : "gap-0.5 p-2",
        )}
        aria-label={section.title}
      >
        {filteredItems.length === 0 ? (
          <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
            No matches
          </p>
        ) : compact ? (
          filteredItems.map((item) => (
            <SubNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={iconForItem(item, section.icon)}
              active={itemIsActive(pathname, item.href)}
              compact
            />
          ))
        ) : (
          groups.map((group, groupIndex) => (
            <div
              key={group.label ?? `ungrouped-${groupIndex}`}
              className={cn(
                "flex flex-col gap-0.5",
                groupIndex > 0 && hasLabeledGroups ? "mt-2.5" : null,
              )}
            >
              {group.label && hasLabeledGroups ? (
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => (
                <SubNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={iconForItem(item, section.icon)}
                  active={itemIsActive(pathname, item.href)}
                />
              ))}
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}

type DesktopNavRailProps = {
  pathname: string;
  homeHref: string;
  tenantTitle: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  sections: readonly DesktopNavSection[];
  /** Restricted roles: one icon per allowed page (no section grouping). */
  flat?: boolean;
};

const NAV_PANEL_COLLAPSED_KEY = "ub.navPanel.collapsed";

export function DesktopNavRail({
  pathname,
  homeHref,
  tenantTitle,
  logoUrl,
  faviconUrl,
  primaryColor,
  sections,
  flat = false,
}: DesktopNavRailProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Restore the user's last choice after mount (kept out of the initial render
  // to avoid a hydration mismatch).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(NAV_PANEL_COLLAPSED_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // localStorage unavailable (private mode / SSR) — fall back to expanded.
    }
  }, []);

  const setPanelCollapsed = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(NAV_PANEL_COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Non-fatal: preference just won't persist.
    }
  };

  const activeSectionId = resolveActiveNavSectionId(
    sections,
    pathname,
    itemIsActive,
  );
  const activeSection = sections.find((section) => section.id === activeSectionId);

  const flatItems = flat
    ? sections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          shortLabel: railShortLabel(item),
          icon: iconForItem(item, section.icon),
        })),
      )
    : [];

  const railClusters = useMemo(
    () => (flat ? [] : clusterVisibleSections(sections)),
    [flat, sections],
  );

  // The expanded sub-nav column always mirrors the section you're currently in
  // (falling back to the first section on off-nav routes) so its width stays put.
  const panelSection = flat ? undefined : activeSection ?? sections[0];

  return (
    <>
      <aside className="sticky top-0 z-40 h-screen w-[4.75rem] shrink-0 border-r border-border/60 bg-background">
        <div className="flex h-full flex-col items-center py-4">
          <Link
            href={homeHref}
            className="mb-5 flex size-11 items-center justify-center rounded-xl outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
            aria-label={tenantTitle}
          >
            {logoUrl?.trim() ? (
              <TenantLogo
                brand={tenantTitle}
                logoUrl={logoUrl}
                faviconUrl={faviconUrl}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
            ) : (
              <TenantLogo
                brand={tenantTitle}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
            )}
          </Link>

          <nav
            className="flex w-full flex-1 flex-col overflow-y-auto px-1.5 pb-3"
            aria-label="Main"
          >
            {flat
              ? flatItems.map((item) => (
                  <RailLink
                    key={item.href}
                    href={item.href}
                    label={item.shortLabel}
                    tooltip={item.label}
                    icon={item.icon}
                    active={itemIsActive(pathname, item.href)}
                  />
                ))
              : railClusters.map((cluster, clusterIndex) => (
                  <div
                    key={cluster.map((section) => section.id).join("-")}
                    className={cn(
                      "flex flex-col gap-0.5",
                      clusterIndex > 0
                        ? "mt-2 border-t border-border/50 pt-2"
                        : null,
                    )}
                  >
                    {cluster.map((section) => {
                      const active =
                        activeSection?.id === section.id ||
                        sectionHasActiveItem(pathname, section.items);
                      return (
                        <RailLink
                          key={section.id}
                          href={section.entryHref}
                          label={section.shortLabel}
                          tooltip={
                            section.blurb
                              ? `${section.title} — ${section.blurb}`
                              : section.title
                          }
                          icon={section.icon}
                          active={active}
                        />
                      );
                    })}
                  </div>
                ))}
          </nav>
        </div>
      </aside>

      {panelSection ? (
        <SubNavPanel
          section={panelSection}
          pathname={pathname}
          compact={collapsed}
          onCollapse={() => setPanelCollapsed(true)}
          onExpand={() => setPanelCollapsed(false)}
        />
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { APP_ROUTES } from "@/lib/config";
import { resolveActiveNavSectionId } from "@/lib/nav-active-section";
import { cn } from "@/lib/utils";

export type DesktopNavItem = {
  href: string;
  label: string;
  featureFlag?: string;
};

export type DesktopNavSection = {
  id: string;
  title: string;
  shortLabel: string;
  icon: LucideIcon;
  entryHref: string;
  items: readonly DesktopNavItem[];
};

const ITEM_ICON_BY_HREF: Partial<Record<string, LucideIcon>> = {
  [APP_ROUTES.business]: LayoutDashboard,
  [APP_ROUTES.businessSettings]: Building2,
  [APP_ROUTES.businessBranding]: Building2,
  [APP_ROUTES.businessMobile]: Building2,
  [APP_ROUTES.businessDomains]: Building2,
  [APP_ROUTES.branches]: Building2,
  [APP_ROUTES.users]: Users,
  [APP_ROUTES.businessImport]: Building2,
  [APP_ROUTES.promoCampaigns]: Building2,
  [APP_ROUTES.inventoryStockTakeDailyAuditReview]: ClipboardCheck,
  [APP_ROUTES.desktopSettings]: Building2,
  [APP_ROUTES.products]: Package,
  [APP_ROUTES.itemTypes]: Package,
  [APP_ROUTES.categories]: Package,
  [APP_ROUTES.suppliers]: Truck,
  [APP_ROUTES.purchasingAddSupplies]: Truck,
  [APP_ROUTES.purchasingIntelligence]: BarChart3,
  [APP_ROUTES.purchasingApAging]: Receipt,
  [APP_ROUTES.purchasingRecordPayment]: CreditCard,
  [APP_ROUTES.inventorySupplyBatches]: Warehouse,
  [APP_ROUTES.inventoryStock]: Warehouse,
  [APP_ROUTES.inventoryRestock]: Warehouse,
  [APP_ROUTES.inventoryValuation]: Warehouse,
  [APP_ROUTES.inventoryTransfers]: Warehouse,
  [APP_ROUTES.inventoryStockTake]: Warehouse,
  [APP_ROUTES.inventoryStockTakeDailyAudit]: Warehouse,
  [APP_ROUTES.inventoryStockTakeInvestigations]: Warehouse,
  [APP_ROUTES.inventoryStockTakeReconciliation]: Warehouse,
  [APP_ROUTES.pricing]: SlidersHorizontal,
  [APP_ROUTES.shifts]: SlidersHorizontal,
  [APP_ROUTES.paymentsSettings]: CreditCard,
  [APP_ROUTES.customers]: Users,
  [APP_ROUTES.sales]: ShoppingBag,
  [APP_ROUTES.salesTransactions]: Receipt,
  [APP_ROUTES.salesPendingCarts]: ShoppingBag,
  [APP_ROUTES.analytics]: BarChart3,
  [APP_ROUTES.analyticsActivity]: BarChart3,
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
  [APP_ROUTES.inventoryStockTakeInvestigations]: "Cases",
  [APP_ROUTES.inventoryStockTakeReconciliation]: "Recon",
  [APP_ROUTES.inventorySupplyBatches]: "Batches",
  [APP_ROUTES.inventoryValuation]: "Value",
  [APP_ROUTES.inventoryTransfers]: "Moves",
  [APP_ROUTES.purchasingAddSupplies]: "Receive",
  [APP_ROUTES.purchasingApAging]: "AP",
  [APP_ROUTES.purchasingRecordPayment]: "Pay",
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

type RailLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
};

function RailLink({ href, label, icon: Icon, active }: RailLinkProps) {
  return (
    <Link
      href={href}
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
          active
            ? "bg-primary/12 text-primary shadow-sm"
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

type RailSectionButtonProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  menuOpen: boolean;
  onClick: () => void;
};

function RailSectionButton({
  label,
  icon: Icon,
  active,
  menuOpen,
  onClick,
}: RailSectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — click again for pages`}
      className="group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30"
      aria-current={active ? "page" : undefined}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl transition-all duration-200",
          active || menuOpen
            ? "bg-primary/12 text-primary shadow-sm"
            : "text-muted-foreground group-hover:bg-muted/70 group-hover:text-foreground",
        )}
      >
        <Icon className="size-[1.15rem]" strokeWidth={1.75} aria-hidden />
      </span>
      <span
        className={cn(
          "max-w-full truncate px-0.5 text-center text-[10px] font-medium leading-tight",
          active || menuOpen ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "size-1 rounded-full transition-colors",
          menuOpen ? "bg-primary" : "bg-muted-foreground/35 group-hover:bg-muted-foreground/55",
        )}
        aria-hidden
      />
    </button>
  );
}

type RailSectionRowProps = {
  section: DesktopNavSection;
  pathname: string;
  active: boolean;
  menuOpen: boolean;
  onClick: () => void;
  onNavigate: () => void;
};

function RailSectionRow({
  section,
  pathname,
  active,
  menuOpen,
  onClick,
  onNavigate,
}: RailSectionRowProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const Icon = section.icon;

  return (
    <div ref={anchorRef} className="relative w-full">
      <RailSectionButton
        label={section.shortLabel}
        icon={Icon}
        active={active}
        menuOpen={menuOpen}
        onClick={onClick}
      />
      {menuOpen ? (
        <SectionFlyout
          section={section}
          pathname={pathname}
          anchorRef={anchorRef}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
}

type SectionFlyoutProps = {
  section: DesktopNavSection;
  pathname: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onNavigate: () => void;
};

function SectionFlyout({
  section,
  pathname,
  anchorRef,
  onNavigate,
}: SectionFlyoutProps) {
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setTop(rect.top);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);

  return (
    <div
      role="menu"
      aria-label={section.title}
      style={{ top }}
      className={cn(
        "fixed left-[4.85rem] z-50 w-52 overflow-hidden rounded-xl",
        "border border-border/70 bg-background shadow-lg shadow-black/5",
        "animate-in fade-in-0 slide-in-from-left-1 duration-150",
      )}
      data-nav-flyout=""
    >
      <div className="border-b border-border/50 px-4 py-3.5">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {section.title}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {section.items.map((item) => {
          const active = itemIsActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={onNavigate}
              className={cn(
                "rounded-lg px-3 py-2 text-[13px] leading-snug transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
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
  const router = useRouter();
  const railRef = useRef<HTMLDivElement>(null);
  const [openFlyoutSectionId, setOpenFlyoutSectionId] = useState<string | null>(
    null,
  );

  const activeSectionId = resolveActiveNavSectionId(
    sections,
    pathname,
    itemIsActive,
  );
  const activeSection = sections.find((section) => section.id === activeSectionId);

  useEffect(() => {
    setOpenFlyoutSectionId(null);
  }, [pathname]);

  useEffect(() => {
    if (!openFlyoutSectionId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFlyoutSectionId(null);
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (railRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-nav-flyout]")) return;
      setOpenFlyoutSectionId(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [openFlyoutSectionId]);

  const handleSectionClick = (section: DesktopNavSection) => {
    const hasSubMenu = section.items.length > 1;
    if (!hasSubMenu) {
      router.push(section.items[0]?.href ?? section.entryHref);
      setOpenFlyoutSectionId(null);
      return;
    }

    const inSection = sectionHasActiveItem(pathname, section.items);

    if (!inSection) {
      setOpenFlyoutSectionId(null);
      router.push(section.entryHref);
      return;
    }

    setOpenFlyoutSectionId((prev) =>
      prev === section.id ? null : section.id,
    );
  };

  const flatItems = flat
    ? sections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          shortLabel: railShortLabel(item),
          icon: iconForItem(item, section.icon),
        })),
      )
    : [];

  return (
    <aside className="sticky top-0 z-40 h-screen w-[4.75rem] shrink-0 border-r border-border/60 bg-background">
      <div
        ref={railRef}
        className="flex h-full flex-col items-center py-4"
      >
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
          className="flex w-full flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-visible px-1.5 pb-3"
          aria-label="Main"
        >
          {flat
            ? flatItems.map((item) => (
                <RailLink
                  key={item.href}
                  href={item.href}
                  label={item.shortLabel}
                  icon={item.icon}
                  active={itemIsActive(pathname, item.href)}
                />
              ))
            : sections.map((section) => {
                const active =
                  activeSection?.id === section.id ||
                  sectionHasActiveItem(pathname, section.items);
                const Icon = section.icon;
                const hasSubMenu = section.items.length > 1;
                const menuOpen = openFlyoutSectionId === section.id;

                if (!hasSubMenu) {
                  return (
                    <RailLink
                      key={section.id}
                      href={section.entryHref}
                      label={section.shortLabel}
                      icon={Icon}
                      active={active}
                    />
                  );
                }

                return (
                  <RailSectionRow
                    key={section.id}
                    section={section}
                    pathname={pathname}
                    active={active}
                    menuOpen={menuOpen}
                    onClick={() => handleSectionClick(section)}
                    onNavigate={() => setOpenFlyoutSectionId(null)}
                  />
                );
              })}
        </nav>
      </div>
    </aside>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PackagePlus,
  PlusCircle,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  CASHIER_CART_SUMMARY_EVENT,
  CASHIER_OPEN_MORE_EVENT,
  CASHIER_TOOLS_EVENT,
  dispatchCashierFocusSell,
  dispatchCashierOpenCart,
  dispatchCashierOpenMore,
  dispatchCashierRunTool,
  type CashierCartSummaryDetail,
  type CashierMobileTool,
  type CashierMobileToolId,
} from "@/lib/cashier-mobile-events";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreRow,
  MoreSection,
} from "@/components/cashier/ledger/ledger-more-menu";

/** Content clearance above the cashier tab bar + home indicator. */
export const CASHIER_TAB_BAR_CLEARANCE =
  "calc(5.25rem + env(safe-area-inset-bottom, 0px))";

const TOOL_ICONS: Record<CashierMobileToolId, LucideIcon> = {
  "add-product": PackagePlus,
  suppliers: Truck,
  "credit-tabs": Users,
  "order-pad": ClipboardList,
  "supplier-order": ShoppingCart,
  "order-confirm": ClipboardCheck,
  airtime: Smartphone,
  drawout: Wallet,
  "open-shift": PlusCircle,
  "close-shift": LogOut,
};

type CashierMobileChromeContextValue = {
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  closeMore: () => void;
  cartSummary: CashierCartSummaryDetail | null;
  tools: CashierMobileTool[];
};

const CashierMobileChromeContext =
  createContext<CashierMobileChromeContextValue | null>(null);

export function useCashierMobileChrome() {
  return useContext(CashierMobileChromeContext);
}

export function CashierMobileChromeProvider({
  children,
  shellMore,
}: {
  children: ReactNode;
  /** Nav / till / session rows rendered below POS tools in the More sheet. */
  shellMore?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [tools, setTools] = useState<CashierMobileTool[]>([]);
  const [cartSummary, setCartSummary] =
    useState<CashierCartSummaryDetail | null>(null);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    const onOpen = () => setMoreOpen(true);
    const onSummary = (e: Event) => {
      const detail = (e as CustomEvent<CashierCartSummaryDetail>).detail;
      if (detail) setCartSummary(detail);
    };
    const onTools = (e: Event) => {
      const detail = (e as CustomEvent<CashierMobileTool[]>).detail;
      setTools(Array.isArray(detail) ? detail : []);
    };
    window.addEventListener(CASHIER_OPEN_MORE_EVENT, onOpen);
    window.addEventListener(CASHIER_CART_SUMMARY_EVENT, onSummary);
    window.addEventListener(CASHIER_TOOLS_EVENT, onTools);
    return () => {
      window.removeEventListener(CASHIER_OPEN_MORE_EVENT, onOpen);
      window.removeEventListener(CASHIER_CART_SUMMARY_EVENT, onSummary);
      window.removeEventListener(CASHIER_TOOLS_EVENT, onTools);
    };
  }, []);

  const value = useMemo(
    () => ({ moreOpen, setMoreOpen, closeMore, cartSummary, tools }),
    [moreOpen, closeMore, cartSummary, tools],
  );

  const saleTools = tools.filter((t) => t.section === "sale");
  const stockTools = tools.filter((t) => t.section === "stock");
  const shiftTools = tools.filter((t) => t.section === "shift");

  const runTool = (id: CashierMobileToolId) => {
    setMoreOpen(false);
    // Let the sheet start closing before the tool modal mounts.
    window.requestAnimationFrame(() => dispatchCashierRunTool(id));
  };

  const openCart = () => {
    setMoreOpen(false);
    window.requestAnimationFrame(() => dispatchCashierOpenCart());
  };

  const cartItems = cartSummary?.itemCount ?? 0;

  return (
    <CashierMobileChromeContext.Provider value={value}>
      {children}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          side="bottom"
          sheetDrag
          className="gap-0 p-0 lg:hidden"
          showCloseButton={false}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 pb-2.5 pt-0.5">
            <DialogHeader className="min-w-0 gap-0.5 pr-0">
              <DialogTitle className="text-lg font-semibold tracking-tight text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                Till menu
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Everything this till can do besides selling.
              </DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:hover:bg-white/10"
                aria-label="Close till menu"
              >
                <X className="size-4" aria-hidden />
              </button>
            </DialogClose>
          </div>

          {cartSummary && cartItems > 0 ? (
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "mx-3 mt-2 flex min-h-14 shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_7%,transparent)]",
                "hover:bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]"
                aria-hidden
              >
                <ShoppingCart className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {cartSummary.label} · {cartItems} item
                  {cartItems === 1 ? "" : "s"}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Tap to take payment
                </span>
              </span>
              <span className="shrink-0 text-[15px] font-bold tabular-nums text-foreground">
                {cartSummary.total.toFixed(2)}
                <span className="ml-1 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground">
                  {cartSummary.currency.trim()}
                </span>
              </span>
            </button>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
            <MoreSection label="On this sale">
              {saleTools.map((tool) => (
                <MoreRow
                  key={tool.id}
                  icon={TOOL_ICONS[tool.id]}
                  hint={tool.hint}
                  onClick={() => runTool(tool.id)}
                >
                  {tool.label}
                </MoreRow>
              ))}
            </MoreSection>
            <MoreSection label="Stock">
              {stockTools.map((tool) => (
                <MoreRow
                  key={tool.id}
                  icon={TOOL_ICONS[tool.id]}
                  hint={tool.hint}
                  onClick={() => runTool(tool.id)}
                >
                  {tool.label}
                </MoreRow>
              ))}
            </MoreSection>
            <MoreSection label="Shift">
              {shiftTools.map((tool) => (
                <MoreRow
                  key={tool.id}
                  icon={TOOL_ICONS[tool.id]}
                  hint={tool.hint}
                  tone={tool.tone === "danger" ? "leave" : "default"}
                  onClick={() => runTool(tool.id)}
                >
                  {tool.label}
                </MoreRow>
              ))}
            </MoreSection>
            {shellMore}
          </div>
        </DialogContent>
      </Dialog>
    </CashierMobileChromeContext.Provider>
  );
}

type CashierBottomNavProps = {
  activeTab?: "sell" | "cart" | "more" | "admin";
  /** When set, shows an Admin tab that navigates to the business hub. */
  adminHref?: string | null;
  className?: string;
};

export function CashierBottomNav({
  activeTab = "sell",
  adminHref = null,
  className,
}: CashierBottomNavProps) {
  const chrome = useCashierMobileChrome();
  const itemCount = chrome?.cartSummary?.itemCount ?? 0;
  const totalLabel = chrome?.cartSummary
    ? chrome.cartSummary.total.toFixed(0)
    : null;

  const tabs: Array<{
    id: "sell" | "cart" | "more" | "admin";
    label: string;
    icon: LucideIcon;
    badge?: number;
    href?: string;
    onClick?: () => void;
  }> = [
    {
      id: "sell",
      label: "Sell",
      icon: LayoutGrid,
      onClick: () => {
        chrome?.setMoreOpen(false);
        dispatchCashierFocusSell();
      },
    },
    {
      id: "cart",
      label: itemCount > 0 && totalLabel ? `Cart · ${totalLabel}` : "Cart",
      icon: ShoppingCart,
      badge: itemCount,
      onClick: () => {
        chrome?.setMoreOpen(false);
        dispatchCashierOpenCart();
      },
    },
  ];

  if (adminHref) {
    tabs.push({
      id: "admin",
      label: "Admin",
      icon: Building2,
      href: adminHref,
    });
  }

  tabs.push({
    id: "more",
    label: "More",
    icon: MoreHorizontal,
    onClick: () => {
      if (chrome?.moreOpen) chrome.setMoreOpen(false);
      else dispatchCashierOpenMore();
    },
  });

  return (
    <nav
      aria-label="Cashier navigation"
      className={cn(
        "cashier-bottom-nav pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.55rem,env(safe-area-inset-bottom,0px))] pt-2 lg:hidden",
        className,
      )}
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto flex w-full max-w-md items-stretch gap-1 px-1.5 py-1.5",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
          // Solid first (older Chromium gets an opaque bar); the translucent
          // blur is the progressive enhancement that reads as a native tab bar.
          "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)]",
          "supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--card)_78%,transparent)] supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
          "shadow-[0_10px_28px_-14px_rgba(28,25,21,0.45)]",
          "dark:border-white/10 dark:bg-card/85 dark:supports-[backdrop-filter]:bg-card/70",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.id === "more"
              ? Boolean(chrome?.moreOpen)
              : activeTab === tab.id && !chrome?.moreOpen;
          const tabClass = cn(
            "tablet-nav-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
            "active:scale-[0.97]",
            isActive &&
              "tablet-nav-tab-active bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
          );
          const body = (
            <>
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center sm:size-10",
                  isActive && "scale-105",
                )}
              >
                <Icon
                  className={cn(
                    "relative size-[1.15rem] sm:size-5",
                    isActive
                      ? "text-[var(--pos-primary-ink,#fff)]"
                      : "text-muted-foreground",
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                  aria-hidden
                />
                {"badge" in tab && tab.badge && tab.badge > 0 && !isActive ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center bg-[var(--pos-primary)] px-1 text-[9px] font-bold text-[var(--pos-primary-ink)]"
                    aria-hidden
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "max-w-[5.5rem] truncate text-[9px] font-semibold leading-none sm:text-[10px]",
                  isActive
                    ? "text-[var(--pos-primary-ink,#fff)]"
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
            </>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={tabClass}
              >
                {body}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              aria-current={isActive ? "page" : undefined}
              className={tabClass}
            >
              {body}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { MoreRow, MoreSection };

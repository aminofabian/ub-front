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
import {
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

  return (
    <CashierMobileChromeContext.Provider value={value}>
      {children}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          side="bottom"
          className="gap-0 p-0 lg:hidden"
          showCloseButton={false}
        >
          <div
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)]"
            aria-hidden
          />
          <DialogHeader className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 pb-3 pt-3 text-left">
            <DialogTitle className="text-base">Till menu</DialogTitle>
            <DialogDescription className="text-xs">
              Tools, pages, and session controls.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
            <MoreSection label="On this sale">
              {saleTools.map((tool) => (
                <MoreRow
                  key={tool.id}
                  icon={TOOL_ICONS[tool.id]}
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
  activeTab?: "sell" | "cart" | "more";
  className?: string;
};

export function CashierBottomNav({
  activeTab = "sell",
  className,
}: CashierBottomNavProps) {
  const chrome = useCashierMobileChrome();
  const itemCount = chrome?.cartSummary?.itemCount ?? 0;
  const totalLabel = chrome?.cartSummary
    ? chrome.cartSummary.total.toFixed(0)
    : null;

  const tabs = [
    {
      id: "sell" as const,
      label: "Sell",
      icon: LayoutGrid,
      onClick: () => {
        chrome?.setMoreOpen(false);
        dispatchCashierFocusSell();
      },
    },
    {
      id: "cart" as const,
      label: itemCount > 0 && totalLabel ? `Cart · ${totalLabel}` : "Cart",
      icon: ShoppingCart,
      badge: itemCount,
      onClick: () => {
        chrome?.setMoreOpen(false);
        dispatchCashierOpenCart();
      },
    },
    {
      id: "more" as const,
      label: "More",
      icon: MoreHorizontal,
      onClick: () => {
        if (chrome?.moreOpen) chrome.setMoreOpen(false);
        else dispatchCashierOpenMore();
      },
    },
  ];

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
          "tablet-bottom-nav-dock pointer-events-auto flex w-full max-w-md items-stretch gap-1",
          "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] px-1.5 py-1.5",
          "shadow-[0_10px_28px_-14px_rgba(28,25,21,0.45)]",
          "dark:border-white/10 dark:bg-card/85",
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.id === "more"
              ? Boolean(chrome?.moreOpen)
              : activeTab === tab.id && !chrome?.moreOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tablet-nav-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                "active:scale-[0.97]",
                isActive &&
                  "tablet-nav-tab-active bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)]",
              )}
            >
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
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { MoreRow, MoreSection };

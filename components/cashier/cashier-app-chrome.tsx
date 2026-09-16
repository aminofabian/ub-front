"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Building2,
  LayoutGrid,
  MoreHorizontal,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  CASHIER_OPEN_MORE_EVENT,
  dispatchCashierFocusSell,
  dispatchCashierOpenCart,
  dispatchCashierOpenMore,
  dispatchCashierRunTool,
  getCashierCartSummary,
  getCashierTools,
  getCashierToolsServerSnapshot,
  subscribeCashierCartSummary,
  subscribeCashierTools,
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
  MoreGrid,
  MoreRow,
  MoreSection,
  MoreTile,
} from "@/components/cashier/ledger/ledger-more-menu";
import {
  POS_TILL_ACCENTS,
  usePosTillAccent,
} from "@/lib/pos-till-accent";
import {
  CASHIER_TOOL_ICONS,
  CASHIER_TOOL_SECTIONS,
} from "@/components/cashier/cashier-pos-tools";

/** Content clearance above the cashier tab bar + home indicator. */
export const CASHIER_TAB_BAR_CLEARANCE =
  "calc(5.25rem + env(safe-area-inset-bottom, 0px))";

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
  appearanceMore,
  shellMore,
}: {
  children: ReactNode;
  /** Appearance controls (till look, template) — sits with the Till look row. */
  appearanceMore?: ReactNode;
  /** Nav / till / session rows rendered below POS tools in the More sheet. */
  shellMore?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  // Pulled, not pushed: the POS surface publishes its tools in a child effect,
  // which runs before this provider's effects — an event-only listener would
  // miss the payload and render an empty till menu.
  const tools = useSyncExternalStore(
    subscribeCashierTools,
    getCashierTools,
    getCashierToolsServerSnapshot,
  );
  const cartSummary = useSyncExternalStore(
    subscribeCashierCartSummary,
    getCashierCartSummary,
    () => null,
  );

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    const onOpen = () => setMoreOpen(true);
    window.addEventListener(CASHIER_OPEN_MORE_EVENT, onOpen);
    return () => {
      window.removeEventListener(CASHIER_OPEN_MORE_EVENT, onOpen);
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
          className="gap-0 rounded-t-none p-0 lg:hidden"
          showCloseButton={false}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-4 pb-2.5 pt-3 dark:border-border/40">
            <DialogHeader className="min-w-0 gap-0.5 pr-0">
              <DialogTitle className="pos-market-section-label text-[1.15rem] leading-none">
                Till menu
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Everything this till does besides selling.
              </DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-none text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                "mx-3 mt-2 flex min-h-14 shrink-0 items-center gap-3 rounded-none border px-3 py-2 text-left transition-colors",
                "border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_7%,transparent)]",
                "hover:bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              )}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-none bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]"
                aria-hidden
              >
                <ShoppingCart className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
                  {cartSummary.label} · {cartItems} item
                  {cartItems === 1 ? "" : "s"}
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Tap to take payment
                </span>
              </span>
              <span className="pos-market-section-label shrink-0 text-[1.05rem] leading-none tabular-nums">
                {cartSummary.total.toFixed(2)}
                <span className="ml-1 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground">
                  {cartSummary.currency.trim()}
                </span>
              </span>
            </button>
          ) : null}

          <div className="pos-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4 pt-1">
            {saleTools.length > 0 ? (
              <MoreSection label={CASHIER_TOOL_SECTIONS[0].label}>
                <MoreGrid>
                  {saleTools.map((tool) => (
                    <MoreTile
                      key={tool.id}
                      icon={CASHIER_TOOL_ICONS[tool.id]}
                      hint={tool.hint}
                      onClick={() => runTool(tool.id)}
                    >
                      {tool.label}
                    </MoreTile>
                  ))}
                </MoreGrid>
              </MoreSection>
            ) : null}
            {stockTools.length > 0 ? (
              <MoreSection label={CASHIER_TOOL_SECTIONS[1].label}>
                <MoreGrid>
                  {stockTools.map((tool) => (
                    <MoreTile
                      key={tool.id}
                      icon={CASHIER_TOOL_ICONS[tool.id]}
                      hint={tool.hint}
                      onClick={() => runTool(tool.id)}
                    >
                      {tool.label}
                    </MoreTile>
                  ))}
                </MoreGrid>
              </MoreSection>
            ) : null}
            {shiftTools.length > 0 ? (
              <MoreSection label={CASHIER_TOOL_SECTIONS[2].label}>
                <MoreGrid>
                  {shiftTools.map((tool) => (
                    <MoreTile
                      key={tool.id}
                      icon={CASHIER_TOOL_ICONS[tool.id]}
                      hint={tool.hint}
                      tone={tool.tone === "danger" ? "danger" : "default"}
                      onClick={() => runTool(tool.id)}
                    >
                      {tool.label}
                    </MoreTile>
                  ))}
                </MoreGrid>
              </MoreSection>
            ) : null}
            <MoreSection label="Till look">
              <TillLookSection />
            </MoreSection>
            {appearanceMore}
            {shellMore}
          </div>
        </DialogContent>
      </Dialog>
    </CashierMobileChromeContext.Provider>
  );
}

/**
 * Accent swatches — repaint this till only. The choice is device-local and
 * reversible, so trying one costs nothing and two tills side by side can be
 * told apart at a glance.
 */
function TillLookSection() {
  const { accentId, setAccentId } = usePosTillAccent();
  return (
    <div className="px-2 pb-2">
      <div className="grid grid-cols-4 gap-1.5">
        <AccentSwatch
          label="Shop"
          active={accentId === null}
          onSelect={() => setAccentId(null)}
        />
        {POS_TILL_ACCENTS.map((accent) => {
          const active = accentId === accent.id;
          return (
            <AccentSwatch
              key={accent.id}
              label={accent.label}
              hex={accent.hex}
              active={active}
              onSelect={() => setAccentId(active ? null : accent.id)}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Repaints this till only — the shop theme stays untouched
      </p>
    </div>
  );
}

function AccentSwatch({
  label,
  hex,
  active,
  onSelect,
}: {
  label: string;
  /** Omit for the "Shop theme" swatch, which reads as the default. */
  hex?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={hex ? `Use the ${label} till accent` : "Use the shop theme"}
      className={cn(
        "flex flex-col gap-1 border p-1.5 text-left transition-colors",
        active
          ? "border-[var(--pos-ink,#1c1915)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)]"
          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
        "dark:border-border/40",
      )}
    >
      <span
        className="h-6 w-full border border-black/10 dark:border-white/10"
        style={
          hex
            ? { backgroundColor: hex }
            : {
                backgroundImage:
                  "linear-gradient(135deg, color-mix(in srgb, var(--pos-ink, #1c1915) 82%, transparent) 0 48%, transparent 48%)",
              }
        }
        aria-hidden
      />
      <span
        className={cn(
          "truncate text-[9px] font-semibold uppercase tracking-[0.12em]",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
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
        "cashier-bottom-nav pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1.5 lg:hidden",
        className,
      )}
    >
      <div
        className={cn(
          "tablet-bottom-nav-dock pointer-events-auto flex w-full max-w-md items-stretch gap-1 rounded-none px-1.5 py-1",
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
            "tablet-nav-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors",
            "active:scale-[0.97]",
            isActive &&
              "tablet-nav-tab-active bg-[color-mix(in_srgb,var(--pos-primary)_9%,transparent)]",
          );
          const body = (
            <>
              {isActive ? (
                <span
                  className="absolute inset-x-0 top-0 h-[2px] bg-[var(--pos-primary)]"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center sm:size-8",
                )}
              >
                <Icon
                  className={cn(
                    "relative size-[1.15rem] sm:size-5",
                    isActive
                      ? "text-[var(--pos-primary)]"
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
                    ? "text-[var(--pos-primary)]"
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

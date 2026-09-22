"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  CreditCard,
  PiggyBank,
  Search,
  Signal,
  Truck,
  Wallet,
} from "lucide-react";

import { dashboardHintClass, dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import { cn } from "@/lib/utils";

export type PaymentsSettingsSectionId =
  | "accept-payments"
  | "kiosk-pay"
  | "supplier-payouts"
  | "profit-pocket"
  | "airtime";

export type PaymentsSettingsNavItem = {
  id: PaymentsSettingsSectionId;
  label: string;
  hint: string;
  icon: typeof CreditCard;
};

export const PAYMENTS_SETTINGS_NAV: PaymentsSettingsNavItem[] = [
  {
    id: "accept-payments",
    label: "Accept payments",
    hint: "Checkout gateways, till instructions, and activation.",
    icon: CreditCard,
  },
  {
    id: "kiosk-pay",
    label: "Kiosk Pay",
    hint: "Platform wallet, storefront checkout, and M-Pesa withdraw.",
    icon: Wallet,
  },
  {
    id: "supplier-payouts",
    label: "Pay suppliers",
    hint: "Send Money from Supplies with optional auto-pay.",
    icon: Truck,
  },
  {
    id: "profit-pocket",
    label: "Profit Pocket",
    hint: "Owner / expense destination for pocketing cash surplus.",
    icon: PiggyBank,
  },
  {
    id: "airtime",
    label: "Airtime",
    hint: "Resell airtime from your Kiosk Pay wallet.",
    icon: Signal,
  },
];

function sectionMeta(id: string) {
  return (
    PAYMENTS_SETTINGS_NAV.find((item) => item.id === id) ?? {
      id: "accept-payments" as const,
      label: id,
      hint: "Payment settings for this shop.",
      icon: CreditCard,
    }
  );
}

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function PaymentsContextBanner({
  methodsCount,
  activeCount,
  attentionCount,
  loading,
}: {
  methodsCount: number;
  activeCount: number;
  attentionCount: number;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {loading ? "—" : methodsCount} method{methodsCount === 1 ? "" : "s"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : activeCount} active
          {!loading && attentionCount > 0 ? (
            <>
              {" "}
              ·{" "}
              <span className="font-semibold text-[#9a2e16]">
                {attentionCount} need attention
              </span>
            </>
          ) : null}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Gateway overlays (add, edit, manage) open on top — saves hit the API
        immediately.
      </p>
    </div>
  );
}

function PaymentsPulse({
  methodsCount,
  activeCount,
  attentionCount,
  loading,
  kopokopoNeedsAttention,
  onSelectSection,
  className,
}: {
  methodsCount: number;
  activeCount: number;
  attentionCount: number;
  loading: boolean;
  kopokopoNeedsAttention: boolean;
  onSelectSection: (id: PaymentsSettingsSectionId) => void;
  className?: string;
}) {
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[16%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Methods
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : methodsCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Gateways and manual instructions
        </p>
      </div>

      <div className={cn(card, "right-3 top-[10%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Active
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--pos-primary,#0f766e)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : activeCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Live on checkout and POS
        </p>
      </div>

      <div className={cn(card, "bottom-[18%] left-[8%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Attention
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            attentionCount > 0 ? "text-[#9a2e16]" : "text-foreground",
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : attentionCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {kopokopoNeedsAttention
            ? "KopoKopo needs test → activate → webhooks"
            : "Draft, error, or untested gateways"}
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("accept-payments")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <CreditCard
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Start with Accept payments
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          {sectionMeta("accept-payments").hint}
        </p>
      </button>
    </div>
  );
}

function PaymentsFocus({
  sectionId,
  sectionSummary,
  className,
}: {
  sectionId: PaymentsSettingsSectionId;
  sectionSummary: ReactNode;
  className?: string;
}) {
  const meta = sectionMeta(sectionId);
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <Icon className="size-3" aria-hidden />
          {meta.label}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.label}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          {sectionSummary}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Edit in the panel → saves apply per section
      </p>
    </div>
  );
}

export type PaymentsSettingsTheatreProps = {
  activeSectionId: PaymentsSettingsSectionId | null;
  onActiveSectionChange: (id: PaymentsSettingsSectionId | null) => void;
  visibleSectionIds: PaymentsSettingsSectionId[];
  methodsCount: number;
  activeCount: number;
  attentionCount: number;
  loading: boolean;
  kopokopoNeedsAttention: boolean;
  sectionSummary: (sectionId: PaymentsSettingsSectionId) => ReactNode;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function PaymentsSettingsTheatre({
  activeSectionId,
  onActiveSectionChange,
  visibleSectionIds,
  methodsCount,
  activeCount,
  attentionCount,
  loading,
  kopokopoNeedsAttention,
  sectionSummary,
  drawerBody,
  drawerFooter,
}: PaymentsSettingsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sectionItems = useMemo(() => {
    return PAYMENTS_SETTINGS_NAV.filter((item) =>
      visibleSectionIds.includes(item.id),
    );
  }, [visibleSectionIds]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionItems;
    return sectionItems.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q)
      );
    });
  }, [sectionItems, query]);

  const selectSection = (id: PaymentsSettingsSectionId) => {
    onActiveSectionChange(id);
    history.replaceState(null, "", `#${id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const activeMeta = activeSectionId ? sectionMeta(activeSectionId) : null;
  const drawerOpen = !!activeSectionId && (isLg || mobileDrawerOpen);

  useEffect(() => {
    if (activeSectionId && !isLg) {
      setMobileDrawerOpen(true);
    }
  }, [activeSectionId, isLg]);

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections…"
              aria-label="Search payment settings sections"
            />
          </label>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredSections.length} section
            {filteredSections.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {filteredSections.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              No sections match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredSections.map((item) => {
                const active = activeSectionId === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(item.id)}
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser ? "px-2.5 py-2 sm:px-3" : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {item.hint}
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const room = activeSectionId ? (
    <PaymentsFocus
      sectionId={activeSectionId}
      sectionSummary={sectionSummary(activeSectionId)}
      className="h-full min-h-0"
    />
  ) : (
    <PaymentsPulse
      methodsCount={methodsCount}
      activeCount={activeCount}
      attentionCount={attentionCount}
      loading={loading}
      kopokopoNeedsAttention={kopokopoNeedsAttention}
      onSelectSection={selectSection}
      className="h-full min-h-0"
    />
  );

  const inspect = activeSectionId ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a section
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Checkout gateways, Kiosk Pay wallet, supplier Send Money, and airtime —
          one section at a time in the panel.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <CreditCard className="size-3.5 shrink-0" aria-hidden />
        Add / manage gateways use overlay drawers
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <PaymentsContextBanner
        methodsCount={methodsCount}
        activeCount={activeCount}
        attentionCount={attentionCount}
        loading={loading}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            Payments floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && activeSectionId ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSection();
        }}
        contextLabel="Payments"
        title={activeMeta?.label ?? "Section"}
        description={activeMeta?.hint}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={drawerFooter}
      >
        {activeSectionId ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerBody}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

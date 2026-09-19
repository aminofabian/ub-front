"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ChevronRight,
  MessageSquare,
  Search,
  Settings2,
  Layers,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import { cn } from "@/lib/utils";

export type SmsCreditsSectionId = "settings" | "usage" | "tiers";

export type SmsCreditsNavItem = {
  id: SmsCreditsSectionId;
  label: string;
  hint: string;
  icon: typeof Settings2;
};

export const SMS_CREDITS_NAV: SmsCreditsNavItem[] = [
  {
    id: "settings",
    label: "Global settings",
    hint: "Kill switch, top-up pricing, AI logo credit costs.",
    icon: Settings2,
  },
  {
    id: "usage",
    label: "Usage this month",
    hint: "Platform sends, depleted tenants, top spenders.",
    icon: Activity,
  },
  {
    id: "tiers",
    label: "Tier allowances",
    hint: "Included SMS per subscription tier each month.",
    icon: Layers,
  },
];

function sectionMeta(id: string) {
  return (
    SMS_CREDITS_NAV.find((item) => item.id === id) ?? {
      id: "settings" as const,
      label: id,
      hint: "SMS credit settings.",
      icon: Settings2,
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

function ContextBanner({
  enabled,
  unitPriceKes,
  tierCount,
  totalSent,
  loading,
}: {
  enabled: boolean;
  unitPriceKes: number;
  tierCount: number;
  totalSent: number;
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
          Metering{" "}
          <span
            className={
              loading
                ? ""
                : enabled
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : "text-[#9a2e16]"
            }
          >
            {loading ? "—" : enabled ? "on" : "off"}
          </span>
        </span>
        <span className={dashboardHintClass()}>
          KES {loading ? "—" : unitPriceKes}/credit
          {" · "}
          {loading ? "—" : tierCount} tier{tierCount === 1 ? "" : "s"}
          {" · "}
          {loading ? "—" : totalSent} sent this cycle
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Edit one section at a time. Per-business grants live on each business
        page.
      </p>
    </div>
  );
}

function SmsPulse({
  enabled,
  unitPriceKes,
  totalSent,
  depletedCount,
  loading,
  onSelectSection,
  className,
}: {
  enabled: boolean;
  unitPriceKes: number;
  totalSent: number;
  depletedCount: number;
  loading: boolean;
  onSelectSection: (id: SmsCreditsSectionId) => void;
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

      <div className={cn(card, "left-3 top-[14%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Metering
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tracking-tight",
            !loading && enabled
              ? "text-[var(--pos-primary,#0f766e)]"
              : undefined,
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : enabled ? "On" : "Off"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Kill switch for credit deduction
        </p>
      </div>

      <div className={cn(card, "right-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Top-up
        </p>
        <p
          className="mt-1 text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : `KES ${unitPriceKes}`}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>Per purchased credit</p>
      </div>

      <div className={cn(card, "bottom-[20%] left-[8%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          This cycle
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : totalSent}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : depletedCount} depleted tenant
          {depletedCount === 1 ? "" : "s"}
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("settings")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <MessageSquare
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Open global settings
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          {sectionMeta("settings").hint}
        </p>
      </button>
    </div>
  );
}

function SmsFocus({
  sectionId,
  sectionSummary,
  className,
}: {
  sectionId: SmsCreditsSectionId;
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
        Edit in the panel
      </p>
    </div>
  );
}

export type SmsCreditsTheatreProps = {
  activeSectionId: SmsCreditsSectionId | null;
  onActiveSectionChange: (id: SmsCreditsSectionId | null) => void;
  enabled: boolean;
  unitPriceKes: number;
  tierCount: number;
  totalSent: number;
  depletedCount: number;
  loading: boolean;
  sectionSummary: (sectionId: SmsCreditsSectionId) => ReactNode;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function SmsCreditsTheatre({
  activeSectionId,
  onActiveSectionChange,
  enabled,
  unitPriceKes,
  tierCount,
  totalSent,
  depletedCount,
  loading,
  sectionSummary,
  drawerBody,
  drawerFooter,
}: SmsCreditsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SMS_CREDITS_NAV;
    return SMS_CREDITS_NAV.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q),
    );
  }, [query]);

  const selectSection = (id: SmsCreditsSectionId) => {
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
    if (activeSectionId && !isLg) setMobileDrawerOpen(true);
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
              aria-label="Search SMS credit sections"
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
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
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
    <SmsFocus
      sectionId={activeSectionId}
      sectionSummary={sectionSummary(activeSectionId)}
      className="h-full min-h-0"
    />
  ) : (
    <SmsPulse
      enabled={enabled}
      unitPriceKes={unitPriceKes}
      totalSent={totalSent}
      depletedCount={depletedCount}
      loading={loading}
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
          Pricing, cycle usage, and per-tier included SMS. Grants stay on each
          business page.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <MessageSquare className="size-3.5 shrink-0" aria-hidden />
        Deep links use #settings, #usage, #tiers
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        enabled={enabled}
        unitPriceKes={unitPriceKes}
        tierCount={tierCount}
        totalSent={totalSent}
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
            SMS floor
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
        contextLabel="SMS credits"
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

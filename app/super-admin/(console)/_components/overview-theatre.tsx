"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Headphones,
  LayoutDashboard,
  Search,
  ShoppingBag,
  Store,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import { cn } from "@/lib/utils";

export type OverviewSectionId =
  | "attention"
  | "commerce"
  | "sellers"
  | "hot"
  | "stuck"
  | "recent"
  | "jump";

export type OverviewNavItem = {
  id: OverviewSectionId;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
};

export const OVERVIEW_NAV: OverviewNavItem[] = [
  {
    id: "attention",
    label: "Needs attention",
    hint: "Stuck signups and threads waiting on you.",
    icon: TriangleAlert,
  },
  {
    id: "commerce",
    label: "Commerce pulse",
    hint: "Till sales today, 30d, and the last 14 days.",
    icon: ShoppingBag,
  },
  {
    id: "sellers",
    label: "Best sellers",
    hint: "Top SKUs by units moved · 30 days.",
    icon: ShoppingBag,
  },
  {
    id: "hot",
    label: "Hottest tills",
    hint: "Revenue leaders · last 7 days.",
    icon: Store,
  },
  {
    id: "stuck",
    label: "Stuck funnel",
    hint: "Shops that never finished setup.",
    icon: Users,
  },
  {
    id: "recent",
    label: "Newest tenants",
    hint: "Most recently created shops.",
    icon: Store,
  },
  {
    id: "jump",
    label: "Jump",
    hint: "Shortcuts into tenants, campaigns, logs.",
    icon: LayoutDashboard,
  },
];

function sectionMeta(id: string) {
  return (
    OVERVIEW_NAV.find((item) => item.id === id) ?? {
      id: "attention" as const,
      label: id,
      hint: "Platform overview.",
      icon: LayoutDashboard,
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
  attentionCount,
  unitsToday,
  activeTenants,
  loading,
}: {
  attentionCount: number;
  unitsToday: string;
  activeTenants: string;
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
          Attention{" "}
          <span
            className={
              loading
                ? ""
                : attentionCount > 0
                  ? "text-amber-800"
                  : "text-[var(--pos-primary,#0f766e)]"
            }
          >
            {loading ? "—" : attentionCount}
          </span>
        </span>
        <span className={dashboardHintClass()}>
          Units today {loading ? "—" : unitsToday}
          {" · "}
          {loading ? "—" : activeTenants} active tenants
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        What needs you now, what the fleet sold, who is stuck.
      </p>
    </div>
  );
}

function OverviewPulse({
  attentionCount,
  unitsToday,
  salesToday,
  loading,
  onSelectSection,
  className,
}: {
  attentionCount: number;
  unitsToday: string;
  salesToday: string;
  loading: boolean;
  onSelectSection: (id: OverviewSectionId) => void;
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

      <button
        type="button"
        className={cn(
          card,
          "left-3 top-[12%] text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("attention")}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <TriangleAlert className="size-3" aria-hidden />
          Attention
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            !loading && attentionCount > 0 ? "text-amber-800" : undefined,
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : attentionCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Stuck + waiting on admin
        </p>
      </button>

      <div className={cn(card, "right-3 top-[14%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Units today
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : unitsToday}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : salesToday} sales across tills
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={() => onSelectSection("commerce")}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <ShoppingBag
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Open commerce pulse
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          {sectionMeta("commerce").hint}
        </p>
      </button>
    </div>
  );
}

function OverviewFocus({
  sectionId,
  sectionSummary,
  className,
}: {
  sectionId: OverviewSectionId;
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
        Details in the panel
      </p>
    </div>
  );
}

export type OverviewTheatreProps = {
  activeSectionId: OverviewSectionId | null;
  onActiveSectionChange: (id: OverviewSectionId | null) => void;
  attentionCount: number;
  unitsToday: string;
  salesToday: string;
  activeTenants: string;
  loading: boolean;
  sectionSummary: (sectionId: OverviewSectionId) => ReactNode;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function OverviewTheatre({
  activeSectionId,
  onActiveSectionChange,
  attentionCount,
  unitsToday,
  salesToday,
  activeTenants,
  loading,
  sectionSummary,
  drawerBody,
  drawerFooter,
}: OverviewTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OVERVIEW_NAV;
    return OVERVIEW_NAV.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q),
    );
  }, [query]);

  const selectSection = (id: OverviewSectionId) => {
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
              aria-label="Search overview sections"
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
    <OverviewFocus
      sectionId={activeSectionId}
      sectionSummary={sectionSummary(activeSectionId)}
      className="h-full min-h-0"
    />
  ) : (
    <OverviewPulse
      attentionCount={attentionCount}
      unitsToday={unitsToday}
      salesToday={salesToday}
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
          Attention queues, commerce, top SKUs, and tenant health open in this
          panel.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Headphones className="size-3.5 shrink-0" aria-hidden />
        Deep links use #attention, #commerce, …
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        attentionCount={attentionCount}
        unitsToday={unitsToday}
        activeTenants={activeTenants}
        loading={loading}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] lg:grid",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,24rem)]",
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
            Overview floor
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
        contextLabel="Overview"
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

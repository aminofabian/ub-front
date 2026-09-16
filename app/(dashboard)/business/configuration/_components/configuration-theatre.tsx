"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  ChevronRight,
  ClipboardList,
  Search,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";

import {
  BUSINESS_CONFIGURATION_NAV,
  BUSINESS_OPS_ALERT_NAV,
  CONFIGURATION_SECTION_META,
  CONFIGURATION_WORKSPACES,
  type ConfigurationWorkspace,
} from "@/components/business/business-settings-nav";
import type {
  InventoryForm,
  PosDraftsForm,
  ShiftSettingsForm,
} from "@/components/business/business-settings-types";
import { dashboardHintClass, dashboardInputClass } from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import { cn } from "@/lib/utils";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function sectionItemsForWorkspace(workspace: ConfigurationWorkspace) {
  return [
    ...BUSINESS_CONFIGURATION_NAV.filter((item) =>
      workspace === "inventory"
        ? item.group === "Inventory"
        : item.group === "Till",
    ),
    BUSINESS_OPS_ALERT_NAV,
  ];
}

function sectionMeta(id: string) {
  return (
    CONFIGURATION_SECTION_META[id] ?? {
      title: id,
      hint: "Policy switches for this area.",
    }
  );
}

function sectionSummary(
  sectionId: string,
  inventory: InventoryForm,
  shiftSettings: ShiftSettingsForm,
  posDrafts: PosDraftsForm,
): ReactNode {
  switch (sectionId) {
    case "settings-stock-take":
      return (
        <>
          Daily audit sample{" "}
          <span className="font-semibold tabular-nums">
            {inventory.dailyAuditSampleSize}
          </span>
          · system stock{" "}
          {inventory.showSystemStockToStockManager ? "visible" : "hidden"} to
          managers
        </>
      );
    case "settings-stock-levels":
      return (
        <>
          Oversell{" "}
          <span className="font-semibold">
            {inventory.allowNegativeStock ? "allowed" : "blocked"}
          </span>
        </>
      );
    case "settings-shifts":
      return (
        <>
          Prefill float{" "}
          <span className="font-semibold">
            {shiftSettings.prefillOpeningFromLastClose ? "on" : "off"}
          </span>
        </>
      );
    case "settings-pos-drafts":
      return (
        <>
          Live drafts{" "}
          <span className="font-semibold">
            {posDrafts.enabled && posDrafts.uiVisible ? "on" : "off"}
          </span>
        </>
      );
    case BUSINESS_OPS_ALERT_NAV.id:
      return <>Phone alerts and onboarding tip mute</>;
    default:
      return <>Adjust switches in the panel — save applies to the whole shop.</>;
  }
}

function ConfigurationContextBanner({
  workspace,
  onWorkspaceChange,
  enabledPolicyCount,
  auditSampleSize,
  inventory,
  shiftSettings,
  posDrafts,
}: {
  workspace: ConfigurationWorkspace;
  onWorkspaceChange: (workspace: ConfigurationWorkspace) => void;
  enabledPolicyCount: number;
  auditSampleSize: number;
  inventory: InventoryForm;
  shiftSettings: ShiftSettingsForm;
  posDrafts: PosDraftsForm;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      )}
    >
      <div
        role="tablist"
        aria-label="Configuration workspaces"
        className="flex flex-wrap gap-1"
      >
        {CONFIGURATION_WORKSPACES.map((item) => {
          const active = workspace === item.id;
          const Icon = item.id === "inventory" ? Warehouse : ShoppingCart;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-none border px-2 text-[11px] font-semibold transition-colors",
                active
                  ? "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onWorkspaceChange(item.id)}
            >
              <Icon className="size-3" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />

      <p className={cn(dashboardHintClass(), "tabular-nums")}>
        <span className="font-semibold text-foreground">{enabledPolicyCount}</span>{" "}
        active policies · audit sample{" "}
        <span className="font-semibold text-foreground">{auditSampleSize}</span>
      </p>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          Oversell{" "}
          <span className="font-semibold text-foreground">
            {inventory.allowNegativeStock ? "on" : "off"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Banknote className="size-3" aria-hidden />
          Prefill{" "}
          <span className="font-semibold text-foreground">
            {shiftSettings.prefillOpeningFromLastClose ? "on" : "off"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          <Settings2 className="size-3" aria-hidden />
          Drafts{" "}
          <span className="font-semibold text-foreground">
            {posDrafts.enabled ? "on" : "off"}
          </span>
        </span>
      </div>
    </div>
  );
}

function ConfigurationPulse({
  enabledPolicyCount,
  auditSampleSize,
  inventory,
  shiftSettings,
  posDrafts,
  onSelectSection,
  sectionItems,
  className,
}: {
  enabledPolicyCount: number;
  auditSampleSize: number;
  inventory: InventoryForm;
  shiftSettings: ShiftSettingsForm;
  posDrafts: PosDraftsForm;
  onSelectSection: (id: string) => void;
  sectionItems: ReturnType<typeof sectionItemsForWorkspace>;
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

      <div className={cn(card, "left-3 top-[18%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Active policies
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {enabledPolicyCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Enabled switches in this workspace
        </p>
      </div>

      <div className={cn(card, "right-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Audit sample
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {auditSampleSize}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          SKUs in nightly sample
        </p>
      </div>

      <div className={cn(card, "bottom-[14%] left-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Quick flags
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <li>
            Oversell{" "}
            <span className="font-semibold text-foreground">
              {inventory.allowNegativeStock ? "on" : "off"}
            </span>
          </li>
          <li>
            Prefill float{" "}
            <span className="font-semibold text-foreground">
              {shiftSettings.prefillOpeningFromLastClose ? "on" : "off"}
            </span>
          </li>
          <li>
            Drafts{" "}
            <span className="font-semibold text-foreground">
              {posDrafts.enabled ? "on" : "off"}
            </span>
          </li>
        </ul>
      </div>

      {sectionItems[0] ? (
        <button
          type="button"
          className={cn(
            card,
            "bottom-[10%] right-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
          )}
          onClick={() => onSelectSection(sectionItems[0]!.id)}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <SlidersHorizontal className="size-3.5 text-[var(--pos-primary,#0f766e)]" aria-hidden />
            Start with {sectionItems[0].label}
          </p>
          <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
            {sectionMeta(sectionItems[0].id).hint}
          </p>
        </button>
      ) : null}
    </div>
  );
}

function ConfigurationFocus({
  sectionId,
  inventory,
  shiftSettings,
  posDrafts,
  className,
}: {
  sectionId: string;
  inventory: InventoryForm;
  shiftSettings: ShiftSettingsForm;
  posDrafts: PosDraftsForm;
  className?: string;
}) {
  const meta = sectionMeta(sectionId);
  const navItem =
    sectionItemsForWorkspace("inventory").find((i) => i.id === sectionId) ??
    sectionItemsForWorkspace("till").find((i) => i.id === sectionId);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        {navItem ? (
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <navItem.icon className="size-3" aria-hidden />
            {navItem.label}
          </span>
        ) : null}
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {meta.title}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {meta.hint}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          {sectionSummary(sectionId, inventory, shiftSettings, posDrafts)}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Edit switches in the panel → then Save configuration
      </p>
    </div>
  );
}

export type ConfigurationTheatreProps = {
  workspace: ConfigurationWorkspace;
  onWorkspaceChange: (workspace: ConfigurationWorkspace) => void;
  activeSectionId: string | null;
  onActiveSectionChange: (id: string | null) => void;
  enabledPolicyCount: number;
  inventory: InventoryForm;
  shiftSettings: ShiftSettingsForm;
  posDrafts: PosDraftsForm;
  drawerFields: ReactNode;
  footer: ReactNode;
};

export function ConfigurationTheatre({
  workspace,
  onWorkspaceChange,
  activeSectionId,
  onActiveSectionChange,
  enabledPolicyCount,
  inventory,
  shiftSettings,
  posDrafts,
  drawerFields,
  footer,
}: ConfigurationTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sectionItems = useMemo(
    () => sectionItemsForWorkspace(workspace),
    [workspace],
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sectionItems;
    return sectionItems.filter((item) => {
      const meta = sectionMeta(item.id);
      return (
        item.label.toLowerCase().includes(q) ||
        meta.title.toLowerCase().includes(q) ||
        meta.hint.toLowerCase().includes(q)
      );
    });
  }, [sectionItems, query]);

  const selectSection = (id: string) => {
    onActiveSectionChange(id);
    history.replaceState(null, "", `#${id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSection = () => {
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  };

  const handleWorkspaceChange = (next: ConfigurationWorkspace) => {
    onWorkspaceChange(next);
    onActiveSectionChange(null);
    setMobileDrawerOpen(false);
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
              aria-label="Search configuration sections"
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
                const meta = sectionMeta(item.id);
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
                          {meta.hint}
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
    <ConfigurationFocus
      sectionId={activeSectionId}
      inventory={inventory}
      shiftSettings={shiftSettings}
      posDrafts={posDrafts}
      className="h-full min-h-0"
    />
  ) : (
    <ConfigurationPulse
      enabledPolicyCount={enabledPolicyCount}
      auditSampleSize={inventory.dailyAuditSampleSize}
      inventory={inventory}
      shiftSettings={shiftSettings}
      posDrafts={posDrafts}
      onSelectSection={selectSection}
      sectionItems={sectionItems}
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
          Pick a policy board
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Inventory rules and till permissions — choose a section on the left,
          edit switches on the right, then save once for the whole workspace.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <ClipboardList className="size-3.5 shrink-0" aria-hidden />
        Deep links use <span className="font-mono text-[10px]">#section-id</span>{" "}
        in the URL
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ConfigurationContextBanner
        workspace={workspace}
        onWorkspaceChange={handleWorkspaceChange}
        enabledPolicyCount={enabledPolicyCount}
        auditSampleSize={inventory.dailyAuditSampleSize}
        inventory={inventory}
        shiftSettings={shiftSettings}
        posDrafts={posDrafts}
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
            Policy floor
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
        contextLabel="Configuration"
        title={activeMeta?.title ?? "Section"}
        description={activeMeta?.hint}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={footer}
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
            {drawerFields}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Mail,
  Megaphone,
  Plus,
  Search,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { SaEmailCampaignSummary } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  mapApiStatus,
  typeFromSegment,
} from "@/components/super-admin/campaigns/campaigns-model";

export type StatusFilter = "all" | "draft" | "scheduled" | "sending" | "sent";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string) {
  const s = mapApiStatus(status);
  if (s === "sent") return "text-[var(--pos-primary,#0f766e)]";
  if (s === "sending" || s === "scheduled") return "text-amber-800";
  if (s === "archived") return "text-muted-foreground";
  return "text-muted-foreground";
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold tracking-[-0.02em] transition-colors",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
          : cn(HAIRLINE, "bg-white text-muted-foreground hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}

function ContextBanner({
  total,
  activeCount,
  sentCount,
  visibleCount,
  loading,
}: {
  total: number;
  activeCount: number;
  sentCount: number;
  visibleCount: number;
  loading: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {loading ? "—" : total} campaign{total === 1 ? "" : "s"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : activeCount} active
          {" · "}
          {loading ? "—" : sentCount} sent
          {" · "}
          showing {visibleCount}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Pick a campaign on the left. Open analytics or reuse in the panel.
      </p>
    </div>
  );
}

function CampaignsPulse({
  total,
  activeCount,
  scheduledCount,
  sentCount,
  loading,
  onCreate,
  className,
}: {
  total: number;
  activeCount: number;
  scheduledCount: number;
  sentCount: number;
  loading: boolean;
  onCreate: () => void;
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

      <div className={cn(card, "left-3 top-[12%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Library
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : total}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Email campaigns loaded
        </p>
      </div>

      <div className={cn(card, "right-3 top-[14%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Pipeline
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : activeCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : scheduledCount} scheduled · {loading ? "—" : sentCount}{" "}
          sent
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onCreate}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Plus
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Create campaign
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Open the composer — pick an intent, audience, and send.
        </p>
      </button>
    </div>
  );
}

function CampaignFocus({
  campaign,
  className,
}: {
  campaign: SaEmailCampaignSummary;
  className?: string;
}) {
  const status = mapApiStatus(campaign.status);
  const type = typeFromSegment(campaign.segmentKey);
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
          <Mail className="size-3" aria-hidden />
          {type}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {campaign.name}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          {campaign.subject || "No subject"}
          {" · "}
          Created {formatWhen(campaign.createdAt)}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          <span className={cn("font-semibold capitalize", statusTone(campaign.status))}>
            {status}
          </span>
          {" · "}
          <span className="font-semibold tabular-nums">
            {campaign.recipientsTargeted.toLocaleString()}
          </span>{" "}
          targeted
          {" · "}
          <span className="font-semibold tabular-nums">
            {campaign.recipientsSent.toLocaleString()}
          </span>{" "}
          sent
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Open or reuse from the panel
      </p>
    </div>
  );
}

export type CampaignsTheatreProps = {
  rows: SaEmailCampaignSummary[];
  total: number;
  activeCount: number;
  scheduledCount: number;
  sentCount: number;
  loading: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  selected: SaEmailCampaignSummary | null;
  onSelect: (row: SaEmailCampaignSummary) => void;
  onClearSelection: () => void;
  onCreate: () => void;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function CampaignsTheatre({
  rows,
  total,
  activeCount,
  scheduledCount,
  sentCount,
  loading,
  statusFilter,
  onStatusFilterChange,
  searchInput,
  onSearchInputChange,
  selected,
  onSelect,
  onClearSelection,
  onCreate,
  drawerBody,
  drawerFooter,
}: CampaignsTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return rows.filter((row) => {
      const st = mapApiStatus(row.status);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      return `${row.name} ${row.subject} ${row.segmentKey}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, statusFilter, searchInput]);

  const selectRow = (row: SaEmailCampaignSummary) => {
    onSelect(row);
    history.replaceState(null, "", `#campaign-${row.id}`);
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSelection = () => {
    onClearSelection();
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  useEffect(() => {
    if (selected && !isLg) setMobileDrawerOpen(true);
  }, [selected, isLg]);

  const drawerOpen = !!selected && (isLg || mobileDrawerOpen);

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
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="Search name, subject…"
              aria-label="Search campaigns"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All"],
                ["draft", "Draft"],
                ["scheduled", "Sched."],
                ["sending", "Sending"],
                ["sent", "Sent"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => onStatusFilterChange(value)}
              >
                {label}
              </Chip>
            ))}
          </div>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredRows.length} campaign
            {filteredRows.length === 1 ? "" : "s"}
            {loading ? " · loading…" : ""}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            <li>
              <button
                type="button"
                onClick={onCreate}
                className={cn(
                  "relative flex w-full items-start gap-2.5 text-left transition-colors",
                  denser
                    ? "px-2.5 py-2 sm:px-3"
                    : "min-h-[3.25rem] px-3 py-3",
                  "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                )}
              >
                <span
                  className="mt-0.5 grid size-7 shrink-0 place-items-center border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                  aria-hidden
                >
                  <Plus className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold tracking-[-0.015em] text-foreground",
                      denser ? "text-[12.5px]" : "text-[14px]",
                    )}
                  >
                    Create campaign
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                    New intent, audience, and send
                  </p>
                </div>
              </button>
            </li>

            {filteredRows.length === 0 ? (
              <li>
                <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
                  {loading
                    ? "Loading campaigns…"
                    : searchInput.trim()
                      ? `No campaigns match “${searchInput.trim()}”.`
                      : "No campaigns in this view."}
                </p>
              </li>
            ) : (
              filteredRows.map((row) => {
                const active = selected?.id === row.id;
                const status = mapApiStatus(row.status);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectRow(row)}
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
                        <Megaphone className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.name}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground">
                          {row.subject || "No subject"}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                          <span className={cn("capitalize", statusTone(row.status))}>
                            {status}
                          </span>
                          <span className="tabular-nums">
                            {row.recipientsSent}/{row.recipientsTargeted}
                          </span>
                          <span>{formatWhen(row.createdAt)}</span>
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
              })
            )}
          </ul>
        </div>
      </div>
    );
  };

  const room = selected ? (
    <CampaignFocus campaign={selected} className="h-full min-h-0" />
  ) : (
    <CampaignsPulse
      total={total}
      activeCount={activeCount}
      scheduledCount={scheduledCount}
      sentCount={sentCount}
      loading={loading}
      onCreate={onCreate}
      className="h-full min-h-0"
    />
  );

  const inspect = selected ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a campaign
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Analytics, reuse, and send stats open in this panel. Create opens the
          composer.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Megaphone className="size-3.5 shrink-0" aria-hidden />
        Deep links use #campaign-id
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        total={total}
        activeCount={activeCount}
        sentCount={sentCount}
        visibleCount={filteredRows.length}
        loading={loading}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
          HAIRLINE,
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
            Campaign floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selected ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className={cn("overflow-hidden border bg-white", HAIRLINE)}>
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        contextLabel="Campaigns"
        title={selected?.name ?? "Campaign"}
        description={
          selected
            ? `${mapApiStatus(selected.status)} · ${selected.recipientsTargeted.toLocaleString()} targeted`
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={drawerFooter}
      >
        {selected ? (
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

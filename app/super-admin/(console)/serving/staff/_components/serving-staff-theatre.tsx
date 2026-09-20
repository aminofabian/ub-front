"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Headphones,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { ServingStaffRow } from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export type StaffStatusFilter = "all" | "active" | "inactive";
export type StaffRoleFilter = "all" | "agent" | "lead" | "owner";

export type ServingStaffPanel =
  | { kind: "invite" }
  | { kind: "staff"; id: string };

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

export function roleLabel(role: string) {
  if (role === "agent") return "Agent";
  if (role === "lead") return "Lead";
  return "Owner";
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
  counts,
  visibleCount,
  loading,
}: {
  counts: { all: number; active: number; inactive: number; waiting: number };
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
          {loading ? "—" : counts.all} agent{counts.all === 1 ? "" : "s"}
        </span>
        <span className={dashboardHintClass()}>
          {loading ? "—" : counts.active} active
          {" · "}
          {loading ? "—" : counts.waiting} waiting tickets
          {" · "}
          showing {visibleCount}
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Invite agents on the left. Role and status live in the panel.
      </p>
    </div>
  );
}

function StaffPulse({
  counts,
  loading,
  onInvite,
  onFilterWaiting,
  className,
}: {
  counts: { all: number; active: number; inactive: number; waiting: number };
  loading: boolean;
  onInvite: () => void;
  onFilterWaiting: () => void;
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
          Desk roster
        </p>
        <p
          className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : counts.all}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {loading ? "—" : counts.active} active ·{" "}
          {loading ? "—" : counts.inactive} inactive
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "right-3 top-[14%] text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onFilterWaiting}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Waiting on desk
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            !loading && counts.waiting > 0 ? "text-amber-800" : undefined,
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {loading ? "—" : counts.waiting}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Tickets waiting across agents
        </p>
      </button>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[10%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={onInvite}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Plus
            className="size-3.5 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
          Invite agent
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          Agents only see Serving — not billing or tenants.
        </p>
      </button>
    </div>
  );
}

function StaffFocus({
  panel,
  staff,
  className,
}: {
  panel: ServingStaffPanel;
  staff: ServingStaffRow | null;
  className?: string;
}) {
  if (panel.kind === "invite") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
          className,
        )}
      >
        <div className="max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Plus className="size-3" aria-hidden />
            Invite
          </span>
          <h2
            className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Invite agent
          </h2>
          <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
            Share a temporary password after invite. Agents land on Serving
            only.
          </p>
        </div>
        <p
          className={cn(
            dashboardHintClass(),
            "flex items-center gap-1.5 text-[11px]",
          )}
        >
          <LiveDot />
          Fill the form in the panel
        </p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div
        className={cn("flex h-full items-center justify-center px-5", className)}
      >
        <p className={dashboardHintClass()}>Staff not in this list.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <UserRound className="size-3" aria-hidden />
          {roleLabel(staff.deskRole)}
          {staff.currentUser ? " · you" : ""}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {staff.name}
        </h2>
        <p
          className={cn(
            dashboardHintClass(),
            "text-[13px] leading-relaxed",
          )}
        >
          {staff.email}
          {staff.phone ? ` · ${staff.phone}` : ""}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          <span
            className={cn(
              "font-semibold",
              staff.active
                ? "text-[var(--pos-primary,#0f766e)]"
                : "text-muted-foreground",
            )}
          >
            {staff.active ? "Active" : "Inactive"}
          </span>
          {" · "}
          <span className="font-semibold tabular-nums">{staff.openCount}</span>{" "}
          open
          {" · "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              staff.waitingCount > 0 && "text-amber-800",
            )}
          >
            {staff.waitingCount}
          </span>{" "}
          waiting
          {" · "}
          last login {formatWhen(staff.lastLoginAt)}
        </p>
      </div>
      <p
        className={cn(
          dashboardHintClass(),
          "flex items-center gap-1.5 text-[11px]",
        )}
      >
        <LiveDot />
        Role and status in the panel
      </p>
    </div>
  );
}

export type ServingStaffTheatreProps = {
  rows: ServingStaffRow[];
  counts: { all: number; active: number; inactive: number; waiting: number };
  loading: boolean;
  statusFilter: StaffStatusFilter;
  onStatusFilterChange: (value: StaffStatusFilter) => void;
  roleFilter: StaffRoleFilter;
  onRoleFilterChange: (value: StaffRoleFilter) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  selected: ServingStaffPanel | null;
  onSelect: (panel: ServingStaffPanel) => void;
  onClearSelection: () => void;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function ServingStaffTheatre({
  rows,
  counts,
  loading,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  searchInput,
  onSearchInputChange,
  selected,
  onSelect,
  onClearSelection,
  drawerBody,
  drawerFooter,
}: ServingStaffTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        q &&
        !row.name.toLowerCase().includes(q) &&
        !row.email.toLowerCase().includes(q) &&
        !(row.phone ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter === "active" && !row.active) return false;
      if (statusFilter === "inactive" && row.active) return false;
      if (roleFilter !== "all" && row.deskRole !== roleFilter) return false;
      return true;
    });
  }, [rows, searchInput, statusFilter, roleFilter]);

  const selectedStaff =
    selected?.kind === "staff"
      ? (rows.find((r) => r.id === selected.id) ?? null)
      : null;

  const selectPanel = (panel: ServingStaffPanel) => {
    onSelect(panel);
    if (panel.kind === "staff") {
      history.replaceState(null, "", `#staff-${panel.id}`);
    } else {
      history.replaceState(null, "", `#invite`);
    }
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

  const drawerTitle =
    selected?.kind === "invite"
      ? "Invite agent"
      : (selectedStaff?.name ?? "Staff");

  const drawerDescription =
    selected?.kind === "invite"
      ? "Create a Serving-only login with a temporary password"
      : selectedStaff
        ? `${roleLabel(selectedStaff.deskRole)} · ${selectedStaff.email}`
        : undefined;

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
              placeholder="Search name, email, phone…"
              aria-label="Search staff"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All", counts.all],
                ["active", "Active", counts.active],
                ["inactive", "Off", counts.inactive],
              ] as const
            ).map(([value, label, count]) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => onStatusFilterChange(value)}
              >
                {label}
                <span className="tabular-nums opacity-70">{count}</span>
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "Any role"],
                ["agent", "Agent"],
                ["lead", "Lead"],
                ["owner", "Owner"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                active={roleFilter === value}
                onClick={() => onRoleFilterChange(value)}
              >
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filteredRows.length} shown
            </p>
            <button
              type="button"
              onClick={() => selectPanel({ kind: "invite" })}
              className="inline-flex h-7 items-center gap-1 rounded-none border border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] px-2 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]"
            >
              <Plus className="size-3" aria-hidden />
              Invite
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {loading && rows.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              Loading roster…
            </p>
          ) : filteredRows.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {rows.length === 0
                ? "Nobody on the roster yet. Invite an agent."
                : `No staff match “${searchInput.trim() || "filters"}”.`}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filteredRows.map((row) => {
                const active =
                  selected?.kind === "staff" && selected.id === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectPanel({ kind: "staff", id: row.id })
                      }
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
                            : row.active
                              ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground"
                              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] text-muted-foreground/60",
                        )}
                        aria-hidden
                      >
                        <UsersRound className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.name}
                          {row.currentUser ? (
                            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground">
                          {roleLabel(row.deskRole)} · {row.email}
                        </p>
                        <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          {row.openCount} open · {row.waitingCount} waiting
                          {row.active ? "" : " · off"}
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

  const room = selected ? (
    <StaffFocus
      panel={selected}
      staff={selectedStaff}
      className="h-full min-h-0"
    />
  ) : (
    <StaffPulse
      counts={counts}
      loading={loading}
      onInvite={() => selectPanel({ kind: "invite" })}
      onFilterWaiting={() => onStatusFilterChange("active")}
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
          Pick an agent
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Role, activation, and open ticket counts open in this panel. Use
          Invite for a new desk login.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <Headphones className="size-3.5 shrink-0" aria-hidden />
        Deep links use #invite or #staff-…
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        counts={counts}
        visibleCount={filteredRows.length}
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
            Serving floor
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
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        contextLabel="Serving staff"
        title={drawerTitle}
        description={drawerDescription}
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

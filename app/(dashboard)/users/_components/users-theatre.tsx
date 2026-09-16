"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Hash,
  IdCard,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { useMediaLg } from "@/hooks/use-media-lg";
import type { BranchRecord, RoleRecord, UserRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

const USER_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "locked", label: "Locked" },
] as const;

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white";
    case "invited":
      return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
    case "suspended":
      return "border-[#9a2e16]/35 bg-transparent text-[#9a2e16]";
    case "locked":
      return "border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_8%,white)] text-[#9a2e16]";
    default:
      return "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-transparent text-muted-foreground";
  }
}

function roleUsesDepartmentAssignments(roleKey?: string): boolean {
  return roleKey?.trim().toLowerCase() === "grocery_clerk";
}

function isProtectedFromDelete(roleKey?: string): boolean {
  const key = roleKey?.trim().toLowerCase();
  return key === "owner" || key === "admin";
}

function ActionIconButton({
  label,
  onClick,
  icon: Icon,
  disabled,
  tone = "default",
  spinning,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
  disabled?: boolean;
  tone?: "default" | "danger";
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-none transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
        "disabled:pointer-events-none disabled:opacity-40",
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
      aria-label={label}
      title={label}
    >
      <Icon
        className={cn("size-3.5", spinning && "animate-spin")}
        aria-hidden
      />
    </button>
  );
}

export type UsersTheatreProps = {
  users: UserRecord[];
  roles: RoleRecord[];
  branches: BranchRecord[];
  branchById: Map<string, BranchRecord>;
  itemTypes: ReadonlyArray<{ id: string; label: string; active: boolean }>;
  currentUserId: string | null;
  isOwner: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canDeactivate: boolean;
  canReadStaffProfile: boolean;
  canTogglePayroll: boolean;

  query: string;
  onQueryChange: (value: string) => void;
  filterStatus: string;
  onFilterStatus: (value: string) => void;
  filterRoleId: string;
  onFilterRoleId: (value: string) => void;
  filterBranchId: string;
  onFilterBranchId: (value: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;

  selectedId: string | null;
  selectedUser: UserRecord | null;
  onSelect: (user: UserRecord) => void;
  onClearSelection: () => void;
  mobileShowDetail: boolean;

  editingName: Record<string, string>;
  onEditingName: (userId: string, name: string) => void;
  savingNameId: string | null;
  onSaveName: (userId: string) => void;

  roleChange: Record<string, string>;
  onRoleChange: (userId: string, roleId: string) => void;
  savingRoleId: string | null;
  onAssignRole: (userId: string) => void;

  branchChange: Record<string, string>;
  onBranchChange: (userId: string, branchId: string) => void;
  savingBranchId: string | null;
  onSaveBranch: (userId: string) => void;

  deptChange: Record<string, string[]>;
  onDeptChange: (userId: string, ids: string[]) => void;
  savingDeptId: string | null;
  onSaveDepartments: (userId: string) => void;

  payrollInclude: Record<string, boolean>;
  payrollSavingId: string | null;
  onTogglePayroll: (userId: string, include: boolean) => void;

  passwordEditUserId: string | null;
  passwordDraft: Record<string, { password: string; confirm: string }>;
  savingPasswordId: string | null;
  onBeginPasswordEdit: (userId: string) => void;
  onPasswordDraft: (
    userId: string,
    next: { password: string; confirm: string },
  ) => void;
  onSavePassword: (userId: string) => void;
  onClearPasswordEdit: (userId: string) => void;

  pinEditUserId: string | null;
  pinDraft: Record<string, { pin: string; confirm: string }>;
  savingPinId: string | null;
  onBeginPinEdit: (userId: string) => void;
  onPinDraft: (userId: string, next: { pin: string; confirm: string }) => void;
  onSavePin: (userId: string) => void;
  onClearPinEdit: (userId: string) => void;

  pinViewUserId: string | null;
  pinViewValue: Record<
    string,
    { loading: boolean; pin: string | null; message: string | null }
  >;
  pinRevealed: Record<string, boolean>;
  onViewPin: (userId: string) => void;
  onTogglePinReveal: (userId: string) => void;
  onClearPinView: (userId: string) => void;

  signingOutId: string | null;
  deactivatingId: string | null;
  deletingId: string | null;
  onOpenProfile: (user: UserRecord) => void;
  onForceLogout: (userId: string, email: string) => void;
  onDeactivate: (userId: string) => void;
  onDelete: (userId: string, email: string) => void;
  onInvite: () => void;
};

export function UsersTheatre(props: UsersTheatreProps) {
  const {
    users,
    query,
    onQueryChange,
    filterStatus,
    onFilterStatus,
    filterRoleId,
    onFilterRoleId,
    filterBranchId,
    onFilterBranchId,
    roles,
    branches,
    isOwner,
    activeFilterCount,
    onClearFilters,
    selectedId,
    selectedUser,
    onSelect,
    onClearSelection,
    mobileShowDetail,
    canCreate,
    onInvite,
  } = props;

  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const mobileDetailOpen = mobileShowDetail && !!selectedUser;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.name} ${u.email} ${u.role?.name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query]);

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
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name, email, role…"
              aria-label="Search users"
            />
          </label>
          <div className="grid grid-cols-3 gap-1">
            <select
              className={cn(dashboardSelectClass(), "h-8 py-0 text-[11px]")}
              value={filterStatus}
              onChange={(e) => onFilterStatus(e.target.value)}
              aria-label="Filter by status"
            >
              {USER_STATUS_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={cn(dashboardSelectClass(), "h-8 py-0 text-[11px]")}
              value={filterRoleId}
              onChange={(e) => onFilterRoleId(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              className={cn(
                dashboardSelectClass(!isOwner),
                "h-8 py-0 text-[11px]",
              )}
              value={filterBranchId}
              onChange={(e) => onFilterBranchId(e.target.value)}
              aria-label="Filter by branch"
              disabled={!isOwner}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={cn(dashboardHintClass(), "tabular-nums")}>
              {filtered.length}
              {query.trim() || activeFilterCount > 0
                ? ` of ${users.length}`
                : ""}{" "}
              {filtered.length === 1 ? "person" : "people"}
            </p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={onClearFilters}
                className={cn(
                  dashboardHintClass(),
                  "underline-offset-2 hover:text-foreground hover:underline",
                )}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          {users.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <UsersIcon
                className="mx-auto size-7 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-2 text-[14px] font-semibold text-foreground">
                No one here yet
              </p>
              <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-[16rem]")}>
                {canCreate
                  ? "Invite someone to get the team started."
                  : "Ask an admin to invite staff."}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
              {query.trim()
                ? `No people match “${query.trim()}”.`
                : "No one matches these filters."}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {filtered.map((user) => {
                const active = selectedId === user.id;
                const branchName =
                  props.branchById.get(user.branchId ?? "")?.name ?? "";
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(user)}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 text-left transition-colors",
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
                          "grid size-7 shrink-0 place-items-center border text-[10px] font-bold uppercase tracking-wide",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {userInitials(user.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {user.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {user.role?.name ?? "No role"}
                          {branchName ? ` · ${branchName}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[9px] font-semibold capitalize tracking-[-0.02em]",
                            statusBadgeClass(user.status),
                          )}
                        >
                          {user.status}
                        </span>
                        {!denser ? (
                          <ChevronRight
                            className="size-4 text-muted-foreground/70"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canCreate ? (
          <button
            type="button"
            className={cn(
              dashboardHintClass(),
              "shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-2.5 text-left underline-offset-4 hover:text-foreground hover:underline sm:px-3",
            )}
            onClick={onInvite}
          >
            Invite someone new
          </button>
        ) : null}
      </div>
    );
  };

  const room = selectedUser ? (
    <UserFocus
      user={selectedUser}
      branchName={
        props.branchById.get(selectedUser.branchId ?? "")?.name ?? null
      }
      className="h-full min-h-0"
    />
  ) : (
    <TeamPulse
      users={users}
      onSelect={onSelect}
      onInvite={canCreate ? onInvite : undefined}
      className="h-full min-h-0"
    />
  );

  const inspect = selectedUser ? (
    <UserInspectPanel user={selectedUser} {...props} />
  ) : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a person
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          The map in the middle is the team. The list on the left names who is
          on it.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      {/* Desktop theatre — roster | map | dossier */}
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
            The team
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selectedUser ? null : inspect}
        </div>
      </div>

      {/* Mobile: full roster; tap opens an edit sheet. */}
      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className="overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={mobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) onClearSelection();
        }}
        contextLabel="Team member"
        title={selectedUser?.name ?? "Person"}
        description={
          selectedUser
            ? [selectedUser.email, selectedUser.role?.name ?? null]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
      >
        {selectedUser ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-white",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            <UserInspectPanel user={selectedUser} {...props} />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}

function TeamPulse({
  users,
  onSelect,
  onInvite,
  className,
}: {
  users: UserRecord[];
  onSelect: (user: UserRecord) => void;
  onInvite?: () => void;
  className?: string;
}) {
  const pulse = useMemo(() => {
    let active = 0;
    let invited = 0;
    let suspended = 0;
    let locked = 0;
    let withPin = 0;
    const byRole = new Map<string, number>();
    for (const u of users) {
      if (u.status === "active") active += 1;
      else if (u.status === "invited") invited += 1;
      else if (u.status === "suspended") suspended += 1;
      else if (u.status === "locked") locked += 1;
      if (u.hasPin) withPin += 1;
      const role = u.role?.name ?? "Unassigned";
      byRole.set(role, (byRole.get(role) ?? 0) + 1);
    }
    const topRole = [...byRole.entries()].sort((a, b) => b[1] - a[1])[0];
    const attention = users.filter(
      (u) =>
        u.status === "invited" ||
        u.status === "locked" ||
        (roleUsesDepartmentAssignments(u.role?.key) &&
          (u.itemTypeIds?.length ?? 0) === 0),
    );
    return { active, invited, suspended, locked, withPin, topRole, attention };
  }, [users]);

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
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 30 72, 48 78, 38 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {onInvite ? (
        <div className="absolute right-3 top-3 z-[2]">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-none shadow-none"
            onClick={onInvite}
          >
            <UserPlus className="size-3.5" aria-hidden />
            Invite
          </Button>
        </div>
      ) : null}

      <article className={cn(card, "left-[8%] top-[20%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          On the team
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {users.length}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          {pulse.active} active
          {pulse.invited > 0 ? ` · ${pulse.invited} invited` : ""}
          {pulse.withPin > 0 ? ` · ${pulse.withPin} with PIN` : ""}
        </p>
      </article>

      {pulse.topRole ? (
        <article className={cn(card, "right-[6%] top-[42%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Largest role
          </p>
          <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            {pulse.topRole[0]}
          </p>
          <p className={cn(dashboardHintClass(), "mt-1 tabular-nums")}>
            {pulse.topRole[1]} {pulse.topRole[1] === 1 ? "person" : "people"}
          </p>
        </article>
      ) : null}

      {pulse.attention.length > 0 ? (
        <article className={cn(card, "bottom-[10%] left-[14%] right-auto")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Needs a look
          </p>
          <ul className="mt-2 space-y-1.5">
            {pulse.attention.slice(0, 3).map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onSelect(u)}
                  className="text-left text-[12px] font-semibold tracking-[-0.015em] text-foreground underline-offset-2 hover:underline"
                >
                  {u.name}
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {u.status === "invited" ? "invited" : u.status === "locked" ? "locked" : "no departments"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function UserFocus({
  user,
  branchName,
  className,
}: {
  user: UserRecord;
  branchName: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-6",
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle
          cx="50"
          cy="46"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="1.2 1.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-[1] flex max-w-sm flex-col items-center text-center">
        <span
          className="grid size-16 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white text-[1.1rem] font-bold tracking-wide text-foreground shadow-[0_10px_28px_color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
          aria-hidden
        >
          {userInitials(user.name)}
        </span>
        <h3
          className="mt-4 text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {user.name}
        </h3>
        <p className="mt-2 truncate text-[12px] text-muted-foreground">
          {user.email}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold capitalize tracking-[-0.02em]",
              statusBadgeClass(user.status),
            )}
          >
            {user.status}
          </span>
          {user.role?.name ? (
            <span className="inline-flex items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-foreground">
              {user.role.name}
            </span>
          ) : null}
          {branchName ? (
            <span className="inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-foreground">
              <MapPin className="size-3" aria-hidden />
              {branchName}
            </span>
          ) : null}
          {user.hasPin ? (
            <span className="inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground">
              <Hash className="size-3" aria-hidden />
              PIN
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserInspectPanel({
  user,
  ...props
}: UsersTheatreProps & { user: UserRecord }) {
  const {
    canUpdate,
    canAssign,
    canDeactivate,
    canReadStaffProfile,
    canTogglePayroll,
    roles,
    branches,
    itemTypes,
    currentUserId,
    editingName,
    onEditingName,
    savingNameId,
    onSaveName,
    roleChange,
    onRoleChange,
    savingRoleId,
    onAssignRole,
    branchChange,
    onBranchChange,
    savingBranchId,
    onSaveBranch,
    deptChange,
    onDeptChange,
    savingDeptId,
    onSaveDepartments,
    payrollInclude,
    payrollSavingId,
    onTogglePayroll,
    passwordEditUserId,
    passwordDraft,
    savingPasswordId,
    onBeginPasswordEdit,
    onPasswordDraft,
    onSavePassword,
    onClearPasswordEdit,
    pinEditUserId,
    pinDraft,
    savingPinId,
    onBeginPinEdit,
    onPinDraft,
    onSavePin,
    onClearPinEdit,
    pinViewUserId,
    pinViewValue,
    pinRevealed,
    onViewPin,
    onTogglePinReveal,
    onClearPinView,
    signingOutId,
    deactivatingId,
    deletingId,
    onOpenProfile,
    onForceLogout,
    onDeactivate,
    onDelete,
  } = props;

  const nameDraft = editingName[user.id] ?? user.name;
  const roleDraft = roleChange[user.id] ?? user.role?.id ?? "";
  const branchDraft = branchChange[user.id] ?? user.branchId ?? "";
  const nameDirty = nameDraft.trim() !== user.name.trim();
  const roleDirty = roleDraft !== (user.role?.id ?? "");
  const branchDirty = branchDraft !== (user.branchId ?? "");
  const usesDepartments = roleUsesDepartmentAssignments(user.role?.key);
  const deptDraft = deptChange[user.id] ?? user.itemTypeIds ?? [];
  const deptDirty =
    JSON.stringify([...deptDraft].sort()) !==
    JSON.stringify([...(user.itemTypeIds ?? [])].sort());
  const credentialsBusy =
    passwordEditUserId === user.id ||
    pinEditUserId === user.id ||
    pinViewUserId === user.id ||
    savingPasswordId === user.id ||
    savingPinId === user.id;

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of itemTypes) {
      map.set(t.id, t.label?.trim() || t.id);
    }
    return map;
  }, [itemTypes]);

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </span>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-1 truncate text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {user.name}
        </h3>
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
          {user.email}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold capitalize tracking-[-0.02em]",
              statusBadgeClass(user.status),
            )}
          >
            {user.status}
          </span>
          {user.hasPin ? (
            <span className="inline-flex size-5 items-center justify-center bg-muted/60 text-muted-foreground" title="PIN set">
              <Hash className="size-3" aria-hidden />
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3">
        {canUpdate || canAssign ? (
          <section className="space-y-2">
            {canUpdate ? (
              <label className="block space-y-0.5">
                <FieldLabel>Name</FieldLabel>
                <div className="flex gap-1.5">
                  <input
                    className={cn(dashboardInputClass(), "h-8 flex-1 text-[13px]")}
                    value={nameDraft}
                    onChange={(e) => onEditingName(user.id, e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1 rounded-none px-2.5 text-xs shadow-none"
                    disabled={!nameDirty || savingNameId === user.id}
                    onClick={() => onSaveName(user.id)}
                  >
                    {savingNameId === user.id ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-3" aria-hidden />
                    )}
                    Save
                  </Button>
                </div>
              </label>
            ) : null}

            {canAssign ? (
              <label className="block space-y-0.5">
                <FieldLabel>Role</FieldLabel>
                <div className="flex gap-1.5">
                  <select
                    className={cn(dashboardSelectClass(), "h-8 flex-1 text-[13px]")}
                    value={roleDraft}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1 rounded-none px-2.5 text-xs shadow-none"
                    disabled={!roleDirty || savingRoleId === user.id}
                    onClick={() => onAssignRole(user.id)}
                  >
                    {savingRoleId === user.id ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-3" aria-hidden />
                    )}
                    Save
                  </Button>
                </div>
              </label>
            ) : null}

            {canUpdate ? (
              <label className="block space-y-0.5">
                <FieldLabel>Branch</FieldLabel>
                <div className="flex gap-1.5">
                  <select
                    className={cn(dashboardSelectClass(), "h-8 flex-1 text-[13px]")}
                    value={branchDraft}
                    onChange={(e) => onBranchChange(user.id, e.target.value)}
                  >
                    <option value="">No branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1 rounded-none px-2.5 text-xs shadow-none"
                    disabled={!branchDirty || savingBranchId === user.id}
                    onClick={() => onSaveBranch(user.id)}
                  >
                    {savingBranchId === user.id ? (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    ) : (
                      <Save className="size-3" aria-hidden />
                    )}
                    Save
                  </Button>
                </div>
              </label>
            ) : null}
          </section>
        ) : (
          <p className={dashboardHintClass()}>
            You can view this person, but you need write access to edit them.
          </p>
        )}

        {canUpdate && usesDepartments ? (
          <section className="space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] p-2">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>Departments</FieldLabel>
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 rounded-none px-2 text-[11px] shadow-none"
                disabled={!deptDirty || savingDeptId === user.id}
                onClick={() => onSaveDepartments(user.id)}
              >
                {savingDeptId === user.id ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3" aria-hidden />
                )}
                Save
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {itemTypes
                .filter((t) => t.active || deptDraft.includes(t.id))
                .map((t) => {
                  const on = deptDraft.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const next = on
                          ? deptDraft.filter((id) => id !== t.id)
                          : [...deptDraft, t.id];
                        onDeptChange(user.id, next);
                      }}
                      className={cn(
                        "border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
                        on
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                      )}
                    >
                      {labelById.get(t.id) ?? t.label}
                    </button>
                  );
                })}
            </div>
            {deptDraft.length === 0 ? (
              <p className="text-[10px] text-[#9a2e16]">
                None selected — this clerk will see no catalog items.
              </p>
            ) : null}
          </section>
        ) : null}

        {canTogglePayroll && user.role?.key !== "buyer" ? (
          <label className="flex cursor-pointer items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2 py-2">
            <span className="text-[12px] font-semibold tracking-[-0.015em] text-foreground">
              Include in payroll
            </span>
            <input
              type="checkbox"
              className="size-4 accent-[var(--pos-primary,#0f766e)]"
              checked={payrollInclude[user.id] !== false}
              disabled={payrollSavingId === user.id}
              aria-label={`Include ${user.email} in payroll`}
              onChange={(e) => onTogglePayroll(user.id, e.target.checked)}
            />
          </label>
        ) : null}

        {canUpdate && passwordEditUserId === user.id ? (
          <section className="space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-2">
            <FieldLabel>New password</FieldLabel>
            <input
              type="password"
              autoComplete="new-password"
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              placeholder="New password"
              value={passwordDraft[user.id]?.password ?? ""}
              onChange={(e) =>
                onPasswordDraft(user.id, {
                  password: e.target.value,
                  confirm: passwordDraft[user.id]?.confirm ?? "",
                })
              }
            />
            <input
              type="password"
              autoComplete="new-password"
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              placeholder="Confirm"
              value={passwordDraft[user.id]?.confirm ?? ""}
              onChange={(e) =>
                onPasswordDraft(user.id, {
                  password: passwordDraft[user.id]?.password ?? "",
                  confirm: e.target.value,
                })
              }
            />
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 rounded-none px-2.5 text-xs shadow-none"
                disabled={savingPasswordId === user.id}
                onClick={() => onSavePassword(user.id)}
              >
                {savingPasswordId === user.id ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3" aria-hidden />
                )}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-none px-2 text-xs"
                disabled={savingPasswordId === user.id}
                onClick={() => onClearPasswordEdit(user.id)}
              >
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        {canUpdate && pinEditUserId === user.id ? (
          <section className="space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-2">
            <FieldLabel>New PIN</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              className={cn(
                dashboardInputClass(),
                "h-8 font-mono text-[13px] tracking-widest",
              )}
              placeholder="PIN 4–6"
              value={pinDraft[user.id]?.pin ?? ""}
              onChange={(e) =>
                onPinDraft(user.id, {
                  pin: e.target.value.replace(/\D/g, ""),
                  confirm: pinDraft[user.id]?.confirm ?? "",
                })
              }
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              className={cn(
                dashboardInputClass(),
                "h-8 font-mono text-[13px] tracking-widest",
              )}
              placeholder="Confirm"
              value={pinDraft[user.id]?.confirm ?? ""}
              onChange={(e) =>
                onPinDraft(user.id, {
                  pin: pinDraft[user.id]?.pin ?? "",
                  confirm: e.target.value.replace(/\D/g, ""),
                })
              }
            />
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 rounded-none px-2.5 text-xs shadow-none"
                disabled={savingPinId === user.id}
                onClick={() => onSavePin(user.id)}
              >
                {savingPinId === user.id ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3" aria-hidden />
                )}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-none px-2 text-xs"
                disabled={savingPinId === user.id}
                onClick={() => onClearPinEdit(user.id)}
              >
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        {canUpdate && pinViewUserId === user.id ? (
          <section className="space-y-1.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] p-2">
            <FieldLabel>PIN</FieldLabel>
            {pinViewValue[user.id]?.loading ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : pinViewValue[user.id]?.pin ? (
              <div className="flex items-center gap-1">
                <p className="font-mono text-base font-semibold tracking-[0.3em] text-foreground">
                  {pinRevealed[user.id]
                    ? pinViewValue[user.id]?.pin
                    : "•".repeat(pinViewValue[user.id]?.pin?.length ?? 4)}
                </p>
                <ActionIconButton
                  icon={pinRevealed[user.id] ? EyeOff : Eye}
                  label={pinRevealed[user.id] ? "Hide PIN" : "Show PIN"}
                  onClick={() => onTogglePinReveal(user.id)}
                />
              </div>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {pinViewValue[user.id]?.message ?? "PIN unavailable."}
              </p>
            )}
            <div className="flex gap-1.5">
              {!pinViewValue[user.id]?.loading && !pinViewValue[user.id]?.pin ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 rounded-none px-2.5 text-xs shadow-none"
                  onClick={() => onBeginPinEdit(user.id)}
                >
                  <Hash className="size-3" aria-hidden />
                  Set PIN
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-none px-2 text-xs"
                onClick={() => onClearPinView(user.id)}
              >
                Close
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      {(canUpdate || canDeactivate || canReadStaffProfile) &&
      passwordEditUserId !== user.id &&
      pinEditUserId !== user.id &&
      pinViewUserId !== user.id ? (
        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3">
          <div className="inline-flex w-full flex-wrap items-center gap-0.5 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] p-0.5">
            {canReadStaffProfile ? (
              <ActionIconButton
                icon={IdCard}
                label={`Staff profile for ${user.email}`}
                onClick={() => onOpenProfile(user)}
              />
            ) : null}
            {canUpdate ? (
              <>
                <ActionIconButton
                  icon={KeyRound}
                  label={`Set password for ${user.email}`}
                  disabled={credentialsBusy}
                  onClick={() => onBeginPasswordEdit(user.id)}
                />
                <ActionIconButton
                  icon={Hash}
                  label={`Set PIN for ${user.email}`}
                  disabled={credentialsBusy}
                  onClick={() => onBeginPinEdit(user.id)}
                />
                {user.hasPin ? (
                  <ActionIconButton
                    icon={Eye}
                    label={`View PIN for ${user.email}`}
                    disabled={credentialsBusy}
                    onClick={() => onViewPin(user.id)}
                  />
                ) : null}
                {user.id !== currentUserId ? (
                  <ActionIconButton
                    icon={signingOutId === user.id ? Loader2 : LogOut}
                    label={`Sign ${user.email} out of all devices`}
                    spinning={signingOutId === user.id}
                    disabled={credentialsBusy || signingOutId === user.id}
                    onClick={() => onForceLogout(user.id, user.email)}
                  />
                ) : null}
              </>
            ) : null}
            {canDeactivate ? (
              <ActionIconButton
                icon={deactivatingId === user.id ? Loader2 : UserX}
                label={`Deactivate ${user.email}`}
                tone="danger"
                spinning={deactivatingId === user.id}
                disabled={deactivatingId === user.id || deletingId === user.id}
                onClick={() => onDeactivate(user.id)}
              />
            ) : null}
            {canDeactivate &&
            user.id !== currentUserId &&
            !isProtectedFromDelete(user.role?.key) ? (
              <ActionIconButton
                icon={deletingId === user.id ? Loader2 : Trash2}
                label={`Delete ${user.email}`}
                tone="danger"
                spinning={deletingId === user.id}
                disabled={deletingId === user.id || deactivatingId === user.id}
                onClick={() => onDelete(user.id, user.email)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

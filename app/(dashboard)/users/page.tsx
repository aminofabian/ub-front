"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Filter,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Palette,
  Save,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import {
  DASHBOARD_FILTER_WELL,
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardFilterFieldLabelClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  assignUserRole,
  createUser,
  deactivateUser,
  fetchBranches,
  fetchRoles,
  fetchUsers,
  setUserItemTypes,
  updateUser,
  type BranchRecord,
  type RoleRecord,
  type UserRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

const USER_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
  { value: "locked", label: "Locked" },
] as const;

type CredentialMethod = "invite" | "pin";

type UserDraft = {
  name: string;
  email: string;
  roleId: string;
  credentialMethod: CredentialMethod;
  pin: string;
  branchId: string;
};

const DEFAULT_DRAFT: UserDraft = {
  name: "",
  email: "",
  roleId: "",
  credentialMethod: "invite",
  pin: "",
  branchId: "",
};

type Feedback = { kind: "success" | "error"; text: string } | null;

/** Roles whose catalog access is scoped by admin-assigned departments. */
function roleUsesDepartmentAssignments(roleKey?: string): boolean {
  return roleKey?.trim().toLowerCase() === "grocery_clerk";
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTES = [
  {
    bg: "from-violet-500/25 via-violet-500/15 to-violet-500/5",
    text: "text-violet-700 dark:text-violet-200",
    ring: "ring-violet-500/30",
  },
  {
    bg: "from-sky-500/25 via-sky-500/15 to-sky-500/5",
    text: "text-sky-700 dark:text-sky-200",
    ring: "ring-sky-500/30",
  },
  {
    bg: "from-emerald-500/25 via-emerald-500/15 to-emerald-500/5",
    text: "text-emerald-700 dark:text-emerald-200",
    ring: "ring-emerald-500/30",
  },
  {
    bg: "from-amber-500/25 via-amber-500/15 to-amber-500/5",
    text: "text-amber-800 dark:text-amber-200",
    ring: "ring-amber-500/30",
  },
  {
    bg: "from-rose-500/25 via-rose-500/15 to-rose-500/5",
    text: "text-rose-700 dark:text-rose-200",
    ring: "ring-rose-500/30",
  },
  {
    bg: "from-fuchsia-500/25 via-fuchsia-500/15 to-fuchsia-500/5",
    text: "text-fuchsia-700 dark:text-fuchsia-200",
    ring: "ring-fuchsia-500/30",
  },
  {
    bg: "from-teal-500/25 via-teal-500/15 to-teal-500/5",
    text: "text-teal-700 dark:text-teal-200",
    ring: "ring-teal-500/30",
  },
  {
    bg: "from-indigo-500/25 via-indigo-500/15 to-indigo-500/5",
    text: "text-indigo-700 dark:text-indigo-200",
    ring: "ring-indigo-500/30",
  },
] as const;

function avatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const palette = avatarPalette(name);
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[12px] font-bold tracking-tight shadow-sm ring-1",
        palette.bg,
        palette.text,
        palette.ring,
        className,
      )}
      aria-hidden
    >
      {userInitials(name)}
    </span>
  );
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "invited":
      return "bg-sky-500/15 text-sky-900 dark:text-sky-200";
    case "suspended":
      return "bg-amber-500/15 text-amber-950 dark:text-amber-200";
    case "locked":
      return "bg-rose-500/15 text-rose-900 dark:text-rose-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function InlineIconButton({
  label,
  onClick,
  icon: Icon,
  className,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.97]",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

/**
 * Departments (item types) a grocery_clerk is allowed to invoice from.
 *
 * Renders read-only badges with a pencil; tapping the pencil opens an inline
 * multi-select chip list. The catalog API ANDs this set into every request
 * coming from this user, so an empty selection means the clerk sees nothing
 * — make sure to leave at least one ticked before saving.
 */
function UserDepartmentsControl({
  user,
  itemTypes,
  canEdit,
  isEditing,
  selected,
  saving,
  onStartEdit,
  onChangeSelected,
  onCancel,
  onSave,
}: {
  user: UserRecord;
  itemTypes: ReadonlyArray<{ id: string; label: string; active: boolean }>;
  canEdit: boolean;
  isEditing: boolean;
  selected: string[] | undefined;
  saving: boolean;
  onStartEdit: () => void;
  onChangeSelected: (ids: string[]) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of itemTypes) {
      map.set(t.id, t.label?.trim() || t.id);
    }
    return map;
  }, [itemTypes]);

  const assigned = user.itemTypeIds ?? [];
  const visibleSelection = isEditing ? (selected ?? assigned) : assigned;
  const selectionSet = useMemo(
    () => new Set(visibleSelection),
    [visibleSelection],
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/20 p-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Departments
        </span>
        <div className="flex flex-wrap gap-1.5">
          {itemTypes
            .filter((t) => t.active)
            .map((t) => {
              const isOn = selectionSet.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const next = new Set(selectionSet);
                    if (isOn) {
                      next.delete(t.id);
                    } else {
                      next.add(t.id);
                    }
                    onChangeSelected(Array.from(next));
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    isOn
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border/55 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          {itemTypes.filter((t) => t.active).length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              No active departments — create one first.
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 rounded-md px-2.5 text-[11px] font-medium"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? (
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
            className="h-7 rounded-md px-2 text-[11px]"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-[10rem] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {assigned.length > 0 ? (
          assigned.map((id) => (
            <span
              key={id}
              className="inline-flex items-center rounded-full border border-border/45 bg-muted/35 px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {labelById.get(id) ?? id}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            None assigned — clerk will see no items.
          </span>
        )}
      </div>
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-fit gap-1.5 rounded-lg px-2.5 text-xs font-medium"
          onClick={onStartEdit}
          aria-label={`Assign departments for ${user.email}`}
        >
          <Package className="size-3.5" aria-hidden />
          Assign departments
        </Button>
      ) : null}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { me, refreshSession, itemTypes } = useDashboard();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [draft, setDraft] = useState<UserDraft>(DEFAULT_DRAFT);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [roleChange, setRoleChange] = useState<Record<string, string>>({});
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
  const skipInviteDrawerResetAfterCreate = useRef(false);
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [nameEditUserId, setNameEditUserId] = useState<string | null>(null);
  const [roleEditUserId, setRoleEditUserId] = useState<string | null>(null);
  const [branchEditUserId, setBranchEditUserId] = useState<string | null>(null);
  const [branchChange, setBranchChange] = useState<Record<string, string>>({});
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [deptEditUserId, setDeptEditUserId] = useState<string | null>(null);
  const [deptChange, setDeptChange] = useState<Record<string, string[]>>({});
  const [savingDeptId, setSavingDeptId] = useState<string | null>(null);

  const isOwner = me?.role?.key === "owner";
  const canCreate = hasPermission(me?.permissions, Permission.UsersCreate);
  const canUpdate = hasPermission(me?.permissions, Permission.UsersUpdate);
  const canAssign = hasPermission(me?.permissions, Permission.UsersAssignRole);
  const canDeactivate = hasPermission(
    me?.permissions,
    Permission.UsersDeactivate,
  );

  const loadData = useCallback(() => {
    const filters = {
      status: filterStatus.trim() || undefined,
      roleId: filterRoleId.trim() || undefined,
      branchId: filterBranchId.trim() || undefined,
    };
    return Promise.all([fetchUsers(filters), fetchRoles(), fetchBranches()])
      .then(([userRows, roleRows, branchRows]) => {
        setUsers(userRows);
        setRoles(roleRows);
        setBranches(branchRows);
        setDraft((previous) => {
          const next = { ...previous };
          if (roleRows.length > 0 && !next.roleId) {
            next.roleId = roleRows[0].id;
          }
          return next;
        });
        setLoadFailed(false);
        setFeedback(null);
      })
      .catch((error) => {
        setLoadFailed(true);
        setFeedback({
          kind: "error",
          text:
            error instanceof Error ? error.message : "Failed to load users.",
        });
      })
      .finally(() => {
        setFirstLoadDone(true);
      });
  }, [filterStatus, filterRoleId, filterBranchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // For non-owner users, restrict branch filter to their assigned branch
  useEffect(() => {
    if (!isOwner && me?.branchId) {
      setFilterBranchId(me.branchId);
    }
  }, [isOwner, me?.branchId]);

  const activeFilterCount =
    (filterStatus ? 1 : 0) +
    (filterRoleId ? 1 : 0) +
    (isOwner && filterBranchId ? 1 : 0);

  const branchById = useMemo(() => {
    const map = new Map<string, BranchRecord>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  const resetInviteDraft = useCallback(() => {
    setDraft({
      ...DEFAULT_DRAFT,
      roleId: roles[0]?.id ?? "",
      branchId: isOwner ? "" : (me?.branchId ?? ""),
    });
  }, [roles, isOwner, me?.branchId]);

  const onInviteDrawerOpenChange = (open: boolean) => {
    if (!open) {
      if (skipInviteDrawerResetAfterCreate.current) {
        skipInviteDrawerResetAfterCreate.current = false;
      } else {
        resetInviteDraft();
      }
    }
    setInviteDrawerOpen(open);
  };

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const usePin = draft.credentialMethod === "pin";
    if (usePin && !/^\d{4,6}$/.test(draft.pin.trim())) {
      setFeedback({ kind: "error", text: "PIN must be 4 to 6 digits." });
      return;
    }
    if (usePin && !draft.branchId) {
      setFeedback({
        kind: "error",
        text: "Select a branch — PIN login requires a branch.",
      });
      return;
    }
    setCreating(true);
    setFeedback(null);
    try {
      await createUser({
        name: draft.name,
        email: draft.email,
        roleId: draft.roleId,
        pin: usePin ? draft.pin.trim() : undefined,
        sendInvite: usePin ? undefined : true,
        status: usePin ? "active" : "invited",
        branchId: draft.branchId || undefined,
      });
      setDraft((previous) => ({ ...DEFAULT_DRAFT, roleId: previous.roleId }));
      await loadData();
      await refreshSession();
      skipInviteDrawerResetAfterCreate.current = true;
      setInviteDrawerOpen(false);
      setFeedback({
        kind: "success",
        text: usePin
          ? "User created with a PIN."
          : "Invitation sent. The user will get an email to set their password.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Create user failed.",
      });
    } finally {
      setCreating(false);
    }
  };

  const onSaveName = async (userId: string) => {
    const name = editingName[userId]?.trim();
    if (!name) {
      return;
    }
    setSavingNameId(userId);
    setFeedback(null);
    try {
      await updateUser(userId, { name });
      await loadData();
      setNameEditUserId(null);
      setEditingName((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      setFeedback({ kind: "success", text: "User updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Update failed.",
      });
    } finally {
      setSavingNameId(null);
    }
  };

  const onAssignRole = async (userId: string) => {
    const row = users.find((u) => u.id === userId);
    const selected = roleChange[userId] ?? row?.role?.id ?? "";
    if (!selected || selected === row?.role?.id) {
      setFeedback({
        kind: "error",
        text: "Choose a different role, then save.",
      });
      return;
    }
    setSavingRoleId(userId);
    setFeedback(null);
    try {
      await assignUserRole(userId, selected);
      setRoleChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      setRoleEditUserId(null);
      await loadData();
      await refreshSession();
      setFeedback({ kind: "success", text: "Role updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Role update failed.",
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  const onDeactivate = async (userId: string) => {
    if (
      !window.confirm(
        "Deactivate this user? They will lose access until re-invited.",
      )
    ) {
      return;
    }
    setDeactivatingId(userId);
    setFeedback(null);
    try {
      await deactivateUser(userId);
      await loadData();
      await refreshSession();
      setFeedback({ kind: "success", text: "User deactivated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Deactivate failed.",
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  const onSaveDepartments = async (userId: string) => {
    const selected = deptChange[userId] ?? [];
    setSavingDeptId(userId);
    setFeedback(null);
    try {
      await setUserItemTypes(userId, selected);
      setDeptEditUserId(null);
      setDeptChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      await refreshSession();
      setFeedback({ kind: "success", text: "Departments updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update departments.",
      });
    } finally {
      setSavingDeptId(null);
    }
  };

  const onSaveBranch = async (userId: string) => {
    const branchId = branchChange[userId] ?? "";
    setSavingBranchId(userId);
    setFeedback(null);
    try {
      await updateUser(userId, { branchId: branchId || undefined });
      setBranchEditUserId(null);
      setBranchChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      setFeedback({ kind: "success", text: "Branch updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Branch update failed.",
      });
    } finally {
      setSavingBranchId(null);
    }
  };

  const clearAllFilters = () => {
    setFilterStatus("");
    setFilterRoleId("");
    if (isOwner) {
      setFilterBranchId("");
    }
  };

  if (!firstLoadDone) {
    return <DashboardLoading label="Loading users…" />;
  }

  if (loadFailed && users.length === 0) {
    return (
      <DashboardLoadError
        title="Could not load users"
        message={
          feedback?.text ??
          "Failed to load users."
        }
        onRetry={() => {
          setFeedback(null);
          void loadData();
        }}
      />
    );
  }

  return (
    <>
      <div className={DASHBOARD_MAX_WIDE}>
        <DashboardPageHero
          icon={UsersIcon}
          eyebrow="Team"
          title="Users"
          description={
            <>
              Invite staff, assign roles, and control who can sign in. Editing depends on your permissions (for example{" "}
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground/90">
                users.create
              </span>
              ,{" "}
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground/90">
                users.update
              </span>
              ).
            </>
          }
        >
          <DashboardQuickLinks
            links={[
              {
                href: APP_ROUTES.business,
                label: "Business",
                desc: "Core settings",
                icon: Building2,
              },
              {
                href: APP_ROUTES.branches,
                label: "Branches",
                desc: "Locations",
                icon: MapPin,
              },
              {
                href: APP_ROUTES.businessBranding,
                label: "Branding",
                desc: "Logo & colors",
                icon: Palette,
              },
            ]}
          />
        </DashboardPageHero>

        {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

        {canCreate ? (
          <section className={DASHBOARD_SECTION_SURFACE}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-primary/10 text-primary">
                    <UserPlus className="size-4" aria-hidden />
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Invite user
                  </h2>
                </div>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  Opens the form drawer to create an account and run your onboarding flow.
                </p>
              </div>
              <div className="flex shrink-0 sm:pt-1">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11 gap-2 px-6 shadow-sm transition-shadow hover:shadow-md"
                  disabled={roles.length === 0}
                  onClick={() => {
                    skipInviteDrawerResetAfterCreate.current = false;
                    setInviteDrawerOpen(true);
                  }}
                >
                  <UserPlus className="size-4" aria-hidden />
                  Invite user
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <div
            role="note"
            className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 shadow-sm dark:text-amber-50"
          >
            <span
              className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-500"
              aria-hidden
            />
            <p>
              You cannot invite users without{" "}
              <span className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs dark:bg-background/20">
                users.create
              </span>
              .
            </p>
          </div>
        )}

        <section className={DASHBOARD_SECTION_SURFACE}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 text-foreground">
                  <Filter className="size-4" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Filters
                </h2>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Results reload from the server when you change a filter.
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className={DASHBOARD_FILTER_WELL}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
            <label className="flex flex-col gap-2 md:col-span-4">
              <span className={dashboardFilterFieldLabelClass()}>
                Status
              </span>
              <select
                className={dashboardSelectClass()}
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                aria-label="Filter by status"
              >
                {USER_STATUS_FILTERS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 md:col-span-4">
              <span className={dashboardFilterFieldLabelClass()}>
                Role
              </span>
              <select
                className={dashboardSelectClass()}
                value={filterRoleId}
                onChange={(event) => setFilterRoleId(event.target.value)}
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 md:col-span-4">
              <span className={dashboardFilterFieldLabelClass()}>
                Branch
                {!isOwner ? (
                  <span className="font-normal normal-case tracking-normal text-muted-foreground">
                    {" "}
                    (locked to your branch)
                  </span>
                ) : null}
              </span>
              <select
                className={dashboardSelectClass(!isOwner)}
                value={filterBranchId}
                onChange={(event) => setFilterBranchId(event.target.value)}
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
            </label>
            </div>
          </div>
        </section>

        {/* DIRECTORY */}
        <section className={DASHBOARD_TABLE_SURFACE}>
          <div className={DASHBOARD_TABLE_HEAD}>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              All users
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Save each row after edits.
            </p>
          </div>

          {users.length === 0 ? (
            <p className="border-t border-border/50 px-6 py-12 text-center text-sm leading-relaxed text-muted-foreground">
              No one matches these filters.
              {activeFilterCount > 0 ? " Try clearing filters." : ""}{" "}
              {canCreate && activeFilterCount === 0 ? "Invite someone above." : ""}
            </p>
          ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-border/50 bg-muted/25">
                    <tr>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Departments
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Branch
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3.5 text-right font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {users.map((user) => {
                      const isEditingName = nameEditUserId === user.id;
                      const isEditingRole = roleEditUserId === user.id;
                      const isEditingBranch = branchEditUserId === user.id;
                      const usesDepartments = roleUsesDepartmentAssignments(
                        user.role?.key,
                      );
                      const pendingRoleId = isEditingRole
                        ? (roleChange[user.id] ?? user.role?.id ?? "")
                        : "";
                      const pendingRoleKey = pendingRoleId
                        ? roles.find((role) => role.id === pendingRoleId)?.key
                        : undefined;
                      const pendingUsesDepartments =
                        isEditingRole &&
                        roleUsesDepartmentAssignments(pendingRoleKey) &&
                        !usesDepartments;
                      const branchName =
                        branchById.get(user.branchId ?? "")?.name ?? "";
                      return (
                        <tr
                          key={user.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          {/* USER (avatar + name + email) */}
                          <td className="px-5 py-4 align-top sm:px-6">
                            {canUpdate && isEditingName ? (
                              <div className="flex max-w-md items-start gap-3">
                                <UserAvatar name={user.name} />
                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                  <input
                                    className={cn(dashboardInputClass(), "py-2 text-sm")}
                                    value={editingName[user.id] ?? user.name}
                                    onChange={(event) =>
                                      setEditingName((previous) => ({
                                        ...previous,
                                        [user.id]: event.target.value,
                                      }))
                                    }
                                    aria-label={`Edit name for ${user.email}`}
                                    autoFocus
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      type="button"
                                      className="h-8 gap-1.5 rounded-lg px-3"
                                      disabled={savingNameId === user.id}
                                      onClick={() => void onSaveName(user.id)}
                                    >
                                      {savingNameId === user.id ? (
                                        <Loader2
                                          className="size-3.5 animate-spin"
                                          aria-hidden
                                        />
                                      ) : (
                                        <Save
                                          className="size-3.5"
                                          aria-hidden
                                        />
                                      )}
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      type="button"
                                      className="h-8 rounded-lg"
                                      disabled={savingNameId === user.id}
                                      onClick={() => {
                                        setNameEditUserId(null);
                                        setEditingName((previous) => {
                                          const next = { ...previous };
                                          delete next[user.id];
                                          return next;
                                        });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-12 items-center gap-3">
                                <UserAvatar name={user.name} />
                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate font-semibold leading-snug text-foreground">
                                        {user.name}
                                      </span>
                                    </div>
                                    <span
                                      className="block truncate text-xs leading-snug text-muted-foreground"
                                      title={user.email}
                                    >
                                      {user.email}
                                    </span>
                                  </div>
                                  {canUpdate ? (
                                    <InlineIconButton
                                      icon={Pencil}
                                      label={`Edit name for ${user.email}`}
                                      onClick={() => {
                                        setNameEditUserId(user.id);
                                        setEditingName((previous) => ({
                                          ...previous,
                                          [user.id]: user.name,
                                        }));
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* ROLE */}
                          <td className="px-5 py-4 align-top sm:px-6">
                            {canAssign && isEditingRole ? (
                              <div className="flex max-w-[16rem] flex-col gap-2">
                                <select
                                  className={cn(dashboardSelectClass(), "text-xs")}
                                  value={
                                    roleChange[user.id] ?? user.role?.id ?? ""
                                  }
                                  onChange={(event) =>
                                    setRoleChange((previous) => ({
                                      ...previous,
                                      [user.id]: event.target.value,
                                    }))
                                  }
                                  aria-label={`Role for ${user.email}`}
                                >
                                  {roles.length === 0 ? (
                                    <option value={user.role?.id ?? ""}>
                                      {user.role?.name ?? "Loading roles…"}
                                    </option>
                                  ) : null}
                                  {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    type="button"
                                    className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium"
                                    disabled={savingRoleId === user.id}
                                    onClick={() => void onAssignRole(user.id)}
                                  >
                                    {savingRoleId === user.id ? (
                                      <Loader2
                                        className="size-3.5 animate-spin"
                                        aria-hidden
                                      />
                                    ) : (
                                      <Save className="size-3.5" aria-hidden />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="h-8 rounded-lg text-xs"
                                    disabled={savingRoleId === user.id}
                                    onClick={() => {
                                      setRoleEditUserId(null);
                                      setRoleChange((previous) => {
                                        const next = { ...previous };
                                        delete next[user.id];
                                        return next;
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-12 flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  {user.role?.name ? (
                                    <span className="inline-flex max-w-full items-center truncate rounded-md border border-border/55 bg-muted/45 px-2 py-1 text-xs font-semibold leading-none tracking-tight text-foreground">
                                      {user.role.name}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/70">
                                      —
                                    </span>
                                  )}
                                  {canAssign ? (
                                    <InlineIconButton
                                      icon={Pencil}
                                      label={`Change role for ${user.email}`}
                                      onClick={() => {
                                        setRoleEditUserId(user.id);
                                        setRoleChange((previous) => ({
                                          ...previous,
                                          [user.id]: user.role?.id ?? "",
                                        }));
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* DEPARTMENTS */}
                          <td className="px-5 py-4 align-top sm:px-6">
                            {usesDepartments ? (
                              <UserDepartmentsControl
                                user={user}
                                itemTypes={itemTypes}
                                canEdit={canUpdate}
                                isEditing={deptEditUserId === user.id}
                                selected={deptChange[user.id]}
                                saving={savingDeptId === user.id}
                                onStartEdit={() => {
                                  setDeptEditUserId(user.id);
                                  setDeptChange((previous) => ({
                                    ...previous,
                                    [user.id]: user.itemTypeIds ?? [],
                                  }));
                                }}
                                onChangeSelected={(ids) =>
                                  setDeptChange((previous) => ({
                                    ...previous,
                                    [user.id]: ids,
                                  }))
                                }
                                onCancel={() => {
                                  setDeptEditUserId(null);
                                  setDeptChange((previous) => {
                                    const next = { ...previous };
                                    delete next[user.id];
                                    return next;
                                  });
                                }}
                                onSave={() => void onSaveDepartments(user.id)}
                              />
                            ) : pendingUsesDepartments ? (
                              <span className="text-xs leading-relaxed text-muted-foreground">
                                Save the Grocery Clerk role first, then assign
                                departments here.
                              </span>
                            ) : (
                              <span
                                className="text-xs text-muted-foreground/70"
                                title="Department scoping applies to Grocery Clerk users"
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* BRANCH */}
                          <td className="px-5 py-4 align-top sm:px-6">
                            {canUpdate && isEditingBranch ? (
                              <div className="flex max-w-[16rem] flex-col gap-2">
                                <select
                                  className={cn(dashboardSelectClass(), "text-xs")}
                                  value={
                                    branchChange[user.id] ??
                                    user.branchId ??
                                    ""
                                  }
                                  onChange={(event) =>
                                    setBranchChange((previous) => ({
                                      ...previous,
                                      [user.id]: event.target.value,
                                    }))
                                  }
                                  aria-label={`Branch for ${user.email}`}
                                >
                                  <option value="">No branch</option>
                                  {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                      {branch.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    type="button"
                                    className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium"
                                    disabled={savingBranchId === user.id}
                                    onClick={() => void onSaveBranch(user.id)}
                                  >
                                    {savingBranchId === user.id ? (
                                      <Loader2
                                        className="size-3.5 animate-spin"
                                        aria-hidden
                                      />
                                    ) : (
                                      <Save className="size-3.5" aria-hidden />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="h-8 rounded-lg text-xs"
                                    disabled={savingBranchId === user.id}
                                    onClick={() => {
                                      setBranchEditUserId(null);
                                      setBranchChange((previous) => {
                                        const next = { ...previous };
                                        delete next[user.id];
                                        return next;
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-12 items-center gap-1.5">
                                {branchName ? (
                                  <span className="inline-flex items-center gap-1.5 text-sm font-medium leading-snug text-foreground">
                                    <MapPin
                                      className="size-3.5 text-muted-foreground/70"
                                      aria-hidden
                                    />
                                    {branchName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/70">
                                    No branch
                                  </span>
                                )}
                                {canUpdate ? (
                                  <InlineIconButton
                                    icon={Pencil}
                                    label={`Change branch for ${user.email}`}
                                    onClick={() => {
                                      setBranchEditUserId(user.id);
                                      setBranchChange((previous) => ({
                                        ...previous,
                                        [user.id]: user.branchId ?? "",
                                      }));
                                    }}
                                  />
                                ) : null}
                              </div>
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4 align-top sm:px-6">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize tabular-nums",
                                statusBadgeClass(user.status),
                              )}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
                                aria-hidden
                              />
                              {user.status}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-5 py-4 text-right align-top sm:px-6">
                            {canDeactivate ? (
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                className="gap-1.5 border-destructive/35 text-destructive transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                                disabled={deactivatingId === user.id}
                                onClick={() => void onDeactivate(user.id)}
                                aria-label={`Deactivate ${user.email}`}
                              >
                                {deactivatingId === user.id ? (
                                  <Loader2
                                    className="size-3.5 animate-spin"
                                    aria-hidden
                                  />
                                ) : (
                                  <UserX className="size-3.5" aria-hidden />
                                )}
                                Deactivate
                              </Button>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground/70">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        <p className="border-t border-border/50 pt-8 font-sans text-xs leading-relaxed text-muted-foreground">
          <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
            GET …/users
          </span>{" "}
          · Other open tabs may need a refresh to see permission changes.
        </p>
      </div>

      {canCreate ? (
        <FormDrawer
          open={inviteDrawerOpen}
          onOpenChange={onInviteDrawerOpenChange}
          title="Invite user"
          description="Creates the account and sends them through your configured onboarding flow."
          contextLabel="Team"
          icon={<UserPlus className="size-5 text-primary" aria-hidden />}
          width="wide"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => onInviteDrawerOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-user-form"
                disabled={creating || roles.length === 0}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" aria-hidden />
                    Create user
                  </>
                )}
              </Button>
            </div>
          }
        >
          <form
            id="invite-user-form"
            className="space-y-6"
            onSubmit={onCreateUser}
          >
            <FormDrawerFields
              legend="Account"
              hint="Email must be unique in your workspace. Choose an email invite (user sets their own password) or a PIN for kiosk/cashier access."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Full name
                  <input
                    className={dashboardInputClass()}
                    placeholder="Jane Doe"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    required
                    autoComplete="name"
                    aria-label="New user name"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Email
                  <input
                    className={dashboardInputClass()}
                    placeholder="jane@company.com"
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    required
                    autoComplete="email"
                    aria-label="New user email"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Role
                  <select
                    className={dashboardSelectClass()}
                    value={draft.roleId}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        roleId: event.target.value,
                      }))
                    }
                    aria-label="Role for new user"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Branch
                  <select
                    className={dashboardSelectClass()}
                    value={draft.branchId}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        branchId: event.target.value,
                      }))
                    }
                    aria-label="Branch for new user"
                    disabled={!isOwner}
                  >
                    <option value="">No branch (all)</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Sign-in method
                  <select
                    className={dashboardSelectClass()}
                    value={draft.credentialMethod}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        credentialMethod: event.target
                          .value as CredentialMethod,
                        pin:
                          event.target.value === "pin" ? previous.pin : "",
                      }))
                    }
                    aria-label="Sign-in method for new user"
                  >
                    <option value="invite">
                      Email invite (sets own password)
                    </option>
                    <option value="pin">PIN (kiosk / cashier)</option>
                  </select>
                </label>
                {draft.credentialMethod === "pin" ? (
                  <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    PIN{" "}
                    <span className="font-normal text-muted-foreground/80">
                      (4–6 digits, required for PIN login on a branch)
                    </span>
                    <input
                      className={dashboardInputClass()}
                      placeholder="e.g. 4821"
                      inputMode="numeric"
                      pattern="\d{4,6}"
                      value={draft.pin}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          pin: event.target.value,
                        }))
                      }
                      aria-label="PIN for cashier-style user"
                    />
                  </label>
                ) : (
                  <p className="sm:col-span-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    We&apos;ll email this person a secure link to set their own
                    password. They can sign in once they&apos;ve set it.
                  </p>
                )}
              </div>
            </FormDrawerFields>
          </form>
        </FormDrawer>
      ) : null}
    </>
  );
}

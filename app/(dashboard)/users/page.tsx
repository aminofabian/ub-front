"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
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
  DASHBOARD_MAX_WIDE,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  DashboardQuickLinks,
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
  fetchUserPin,
  fetchUsers,
  setUserItemTypes,
  setUserPassword,
  setUserPin,
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
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold tracking-tight ring-1",
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
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
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
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/80 transition-colors",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
        "active:scale-[0.97]",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="size-3" aria-hidden />
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
    <div className="flex min-w-[8rem] items-start gap-1">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {assigned.length > 0 ? (
          assigned.map((id) => (
            <span
              key={id}
              className="inline-flex max-w-[7rem] truncate rounded border border-border/45 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
              title={labelById.get(id) ?? id}
            >
              {labelById.get(id) ?? id}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-amber-700 dark:text-amber-300">
            None
          </span>
        )}
      </div>
      {canEdit ? (
        <InlineIconButton
          icon={Package}
          label={`Assign departments for ${user.email}`}
          onClick={onStartEdit}
        />
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
  const [passwordEditUserId, setPasswordEditUserId] = useState<string | null>(
    null,
  );
  const [passwordDraft, setPasswordDraft] = useState<
    Record<string, { password: string; confirm: string }>
  >({});
  const [savingPasswordId, setSavingPasswordId] = useState<string | null>(null);
  const [pinEditUserId, setPinEditUserId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState<
    Record<string, { pin: string; confirm: string }>
  >({});
  const [savingPinId, setSavingPinId] = useState<string | null>(null);
  const [pinViewUserId, setPinViewUserId] = useState<string | null>(null);
  const [pinViewValue, setPinViewValue] = useState<
    Record<
      string,
      { loading: boolean; pin: string | null; message: string | null }
    >
  >({});
  const [pinRevealed, setPinRevealed] = useState<Record<string, boolean>>({});

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

  const clearPasswordEdit = (userId: string) => {
    setPasswordEditUserId((current) => (current === userId ? null : current));
    setPasswordDraft((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const clearPinEdit = (userId: string) => {
    setPinEditUserId((current) => (current === userId ? null : current));
    setPinDraft((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const clearPinView = (userId: string) => {
    setPinViewUserId((current) => (current === userId ? null : current));
    setPinViewValue((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
    setPinRevealed((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const beginPasswordEdit = (userId: string) => {
    clearPinEdit(userId);
    clearPinView(userId);
    setPasswordEditUserId(userId);
    setPasswordDraft((previous) => ({
      ...previous,
      [userId]: { password: "", confirm: "" },
    }));
  };

  const beginPinEdit = (userId: string) => {
    clearPasswordEdit(userId);
    clearPinView(userId);
    setPinEditUserId(userId);
    setPinDraft((previous) => ({
      ...previous,
      [userId]: { pin: "", confirm: "" },
    }));
  };

  const onViewPin = async (userId: string) => {
    clearPasswordEdit(userId);
    clearPinEdit(userId);
    setPinViewUserId(userId);
    setPinRevealed((previous) => ({ ...previous, [userId]: true }));
    setPinViewValue((previous) => ({
      ...previous,
      [userId]: { loading: true, pin: null, message: null },
    }));
    setFeedback(null);
    try {
      const result = await fetchUserPin(userId);
      if (!result.hasPin) {
        setPinViewValue((previous) => ({
          ...previous,
          [userId]: {
            loading: false,
            pin: null,
            message: "No PIN set for this user.",
          },
        }));
        return;
      }
      if (!result.recoverable || !result.pin) {
        setPinViewValue((previous) => ({
          ...previous,
          [userId]: {
            loading: false,
            pin: null,
            message:
              "This PIN was set before viewable storage. Set a new PIN to enable viewing.",
          },
        }));
        return;
      }
      setPinViewValue((previous) => ({
        ...previous,
        [userId]: { loading: false, pin: result.pin, message: null },
      }));
    } catch (error) {
      clearPinView(userId);
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to load PIN.",
      });
    }
  };

  const onSavePassword = async (userId: string) => {
    const draft = passwordDraft[userId];
    const password = draft?.password ?? "";
    const confirm = draft?.confirm ?? "";
    if (password.length < 8) {
      setFeedback({
        kind: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      setFeedback({ kind: "error", text: "Passwords do not match." });
      return;
    }
    setSavingPasswordId(userId);
    setFeedback(null);
    try {
      await setUserPassword(userId, password);
      clearPasswordEdit(userId);
      await loadData();
      setFeedback({ kind: "success", text: "Password updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Password update failed.",
      });
    } finally {
      setSavingPasswordId(null);
    }
  };

  const onSavePin = async (userId: string) => {
    const draft = pinDraft[userId];
    const pin = draft?.pin?.trim() ?? "";
    const confirm = draft?.confirm?.trim() ?? "";
    if (!/^\d{4,6}$/.test(pin)) {
      setFeedback({
        kind: "error",
        text: "PIN must be 4 to 6 digits.",
      });
      return;
    }
    if (pin !== confirm) {
      setFeedback({ kind: "error", text: "PINs do not match." });
      return;
    }
    const target = users.find((row) => row.id === userId);
    if (target && !target.branchId) {
      setFeedback({
        kind: "error",
        text: "Assign a branch before setting a PIN (PIN login is branch-scoped).",
      });
      return;
    }
    setSavingPinId(userId);
    setFeedback(null);
    try {
      await setUserPin(userId, pin);
      clearPinEdit(userId);
      await loadData();
      setFeedback({ kind: "success", text: "PIN updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "PIN update failed.",
      });
    } finally {
      setSavingPinId(null);
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
      <div className={cn(DASHBOARD_MAX_WIDE, "space-y-5 pb-16")}>
        <header className="space-y-4 border-b border-border/50 pb-5">
          <DashboardPageHero
            compact
            icon={UsersIcon}
            eyebrow="Team"
            title="Users"
            description="Invite staff, assign roles, and manage sign-in credentials."
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            {canCreate ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5 shadow-sm"
                disabled={roles.length === 0}
                onClick={() => {
                  skipInviteDrawerResetAfterCreate.current = false;
                  setInviteDrawerOpen(true);
                }}
              >
                <UserPlus className="size-3.5" aria-hidden />
                Invite user
              </Button>
            ) : null}
          </div>
        </header>

        {feedback ? (
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        ) : null}

        {!canCreate ? (
          <p
            role="note"
            className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-50"
          >
            You need{" "}
            <span className="font-mono text-[11px]">users.create</span> to
            invite users.
          </p>
        ) : null}

        <section className={DASHBOARD_TABLE_SURFACE}>
          <div className="space-y-3 border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Directory
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {users.length}{" "}
                  {users.length === 1 ? "user" : "users"}
                  {activeFilterCount > 0 ? " · filtered" : ""}
                </span>
              </div>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <select
                  className={cn(dashboardSelectClass(), "h-8 py-1 text-xs")}
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
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </span>
                <select
                  className={cn(dashboardSelectClass(), "h-8 py-1 text-xs")}
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
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Branch{!isOwner ? " · yours" : ""}
                </span>
                <select
                  className={cn(
                    dashboardSelectClass(!isOwner),
                    "h-8 py-1 text-xs",
                  )}
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

          {users.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
              No one matches these filters.
              {activeFilterCount > 0 ? " Try clearing filters." : ""}{" "}
              {canCreate && activeFilterCount === 0
                ? "Invite someone to get started."
                : ""}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-border/40 bg-muted/15">
                  <tr>
                    {(
                      [
                        ["User", false],
                        ["Role", false],
                        ["Departments", false],
                        ["Branch", false],
                        ["Status", false],
                        ["Actions", true],
                      ] as const
                    ).map(([label, right]) => (
                      <th
                        key={label}
                        scope="col"
                        className={cn(
                          "px-3 py-2.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-4",
                          right && "text-right",
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/35">
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
                    const credentialsBusy =
                      savingPasswordId === user.id || savingPinId === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-muted/25"
                      >
                        {/* USER */}
                        <td className="px-3 py-2.5 align-middle sm:px-4">
                          {canUpdate && isEditingName ? (
                            <div className="flex max-w-sm items-start gap-2.5">
                              <UserAvatar name={user.name} />
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <input
                                  className={cn(
                                    dashboardInputClass(),
                                    "h-8 py-1 text-sm",
                                  )}
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
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    type="button"
                                    className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                    disabled={savingNameId === user.id}
                                    onClick={() => void onSaveName(user.id)}
                                  >
                                    {savingNameId === user.id ? (
                                      <Loader2
                                        className="size-3 animate-spin"
                                        aria-hidden
                                      />
                                    ) : (
                                      <Save className="size-3" aria-hidden />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="h-7 rounded-md px-2 text-xs"
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
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={user.name} />
                              <div className="flex min-w-0 flex-1 items-center gap-1">
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                                    {user.name}
                                  </span>
                                  <span
                                    className="block truncate text-[11px] leading-tight text-muted-foreground"
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
                        <td className="px-3 py-2.5 align-middle sm:px-4">
                          {canAssign && isEditingRole ? (
                            <div className="flex max-w-[14rem] flex-col gap-1.5">
                              <select
                                className={cn(
                                  dashboardSelectClass(),
                                  "h-8 py-1 text-xs",
                                )}
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
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  type="button"
                                  className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                  disabled={savingRoleId === user.id}
                                  onClick={() => void onAssignRole(user.id)}
                                >
                                  {savingRoleId === user.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Save className="size-3" aria-hidden />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  className="h-7 rounded-md px-2 text-xs"
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
                            <div className="flex items-center gap-1">
                              {user.role?.name ? (
                                <span className="inline-flex max-w-full truncate rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-foreground">
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
                          )}
                        </td>

                        {/* DEPARTMENTS */}
                        <td className="px-3 py-2.5 align-middle sm:px-4">
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
                            <span className="text-[11px] leading-snug text-muted-foreground">
                              Save role, then assign departments.
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              —
                            </span>
                          )}
                        </td>

                        {/* BRANCH */}
                        <td className="px-3 py-2.5 align-middle sm:px-4">
                          {canUpdate && isEditingBranch ? (
                            <div className="flex max-w-[14rem] flex-col gap-1.5">
                              <select
                                className={cn(
                                  dashboardSelectClass(),
                                  "h-8 py-1 text-xs",
                                )}
                                value={
                                  branchChange[user.id] ?? user.branchId ?? ""
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
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  type="button"
                                  className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                  disabled={savingBranchId === user.id}
                                  onClick={() => void onSaveBranch(user.id)}
                                >
                                  {savingBranchId === user.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Save className="size-3" aria-hidden />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  className="h-7 rounded-md px-2 text-xs"
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
                            <div className="flex items-center gap-1">
                              {branchName ? (
                                <span className="inline-flex max-w-[10rem] items-center gap-1 truncate text-xs font-medium text-foreground">
                                  <MapPin
                                    className="size-3 shrink-0 text-muted-foreground/70"
                                    aria-hidden
                                  />
                                  <span className="truncate">{branchName}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">
                                  —
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
                        <td className="px-3 py-2.5 align-middle sm:px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize tabular-nums",
                                statusBadgeClass(user.status),
                              )}
                            >
                              <span
                                className="size-1 shrink-0 rounded-full bg-current opacity-70"
                                aria-hidden
                              />
                              {user.status}
                            </span>
                            {user.hasPin ? (
                              <span
                                className="inline-flex size-5 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"
                                title="PIN set"
                              >
                                <Hash className="size-3" aria-hidden />
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-3 py-2.5 text-right align-middle sm:px-4">
                          {canUpdate && passwordEditUserId === user.id ? (
                            <div className="ml-auto flex w-full max-w-[13rem] flex-col gap-1.5 text-left">
                              <input
                                type="password"
                                autoComplete="new-password"
                                className={cn(
                                  dashboardInputClass(),
                                  "h-8 py-1 text-xs",
                                )}
                                placeholder="New password"
                                value={passwordDraft[user.id]?.password ?? ""}
                                onChange={(event) =>
                                  setPasswordDraft((previous) => ({
                                    ...previous,
                                    [user.id]: {
                                      password: event.target.value,
                                      confirm: previous[user.id]?.confirm ?? "",
                                    },
                                  }))
                                }
                                aria-label={`New password for ${user.email}`}
                                autoFocus
                              />
                              <input
                                type="password"
                                autoComplete="new-password"
                                className={cn(
                                  dashboardInputClass(),
                                  "h-8 py-1 text-xs",
                                )}
                                placeholder="Confirm"
                                value={passwordDraft[user.id]?.confirm ?? ""}
                                onChange={(event) =>
                                  setPasswordDraft((previous) => ({
                                    ...previous,
                                    [user.id]: {
                                      password:
                                        previous[user.id]?.password ?? "",
                                      confirm: event.target.value,
                                    },
                                  }))
                                }
                                aria-label={`Confirm password for ${user.email}`}
                              />
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="default"
                                  type="button"
                                  className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                  disabled={savingPasswordId === user.id}
                                  onClick={() => void onSavePassword(user.id)}
                                >
                                  {savingPasswordId === user.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Save className="size-3" aria-hidden />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  className="h-7 rounded-md px-2 text-xs"
                                  disabled={savingPasswordId === user.id}
                                  onClick={() => clearPasswordEdit(user.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : canUpdate && pinEditUserId === user.id ? (
                            <div className="ml-auto flex w-full max-w-[11rem] flex-col gap-1.5 text-left">
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                className={cn(
                                  dashboardInputClass(),
                                  "h-8 py-1 font-mono text-xs tracking-widest",
                                )}
                                placeholder="PIN 4–6"
                                value={pinDraft[user.id]?.pin ?? ""}
                                onChange={(event) =>
                                  setPinDraft((previous) => ({
                                    ...previous,
                                    [user.id]: {
                                      pin: event.target.value.replace(
                                        /\D/g,
                                        "",
                                      ),
                                      confirm: previous[user.id]?.confirm ?? "",
                                    },
                                  }))
                                }
                                aria-label={`New PIN for ${user.email}`}
                                autoFocus
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                className={cn(
                                  dashboardInputClass(),
                                  "h-8 py-1 font-mono text-xs tracking-widest",
                                )}
                                placeholder="Confirm"
                                value={pinDraft[user.id]?.confirm ?? ""}
                                onChange={(event) =>
                                  setPinDraft((previous) => ({
                                    ...previous,
                                    [user.id]: {
                                      pin: previous[user.id]?.pin ?? "",
                                      confirm: event.target.value.replace(
                                        /\D/g,
                                        "",
                                      ),
                                    },
                                  }))
                                }
                                aria-label={`Confirm PIN for ${user.email}`}
                              />
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="default"
                                  type="button"
                                  className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                  disabled={savingPinId === user.id}
                                  onClick={() => void onSavePin(user.id)}
                                >
                                  {savingPinId === user.id ? (
                                    <Loader2
                                      className="size-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <Save className="size-3" aria-hidden />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  className="h-7 rounded-md px-2 text-xs"
                                  disabled={savingPinId === user.id}
                                  onClick={() => clearPinEdit(user.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : canUpdate && pinViewUserId === user.id ? (
                            <div className="ml-auto flex w-full max-w-[11rem] flex-col gap-1.5 text-left">
                              {pinViewValue[user.id]?.loading ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Loader2
                                    className="size-3 animate-spin"
                                    aria-hidden
                                  />
                                  Loading…
                                </div>
                              ) : pinViewValue[user.id]?.pin ? (
                                <div className="flex items-center gap-1">
                                  <p
                                    className="font-mono text-base font-semibold tracking-[0.3em] text-foreground"
                                    aria-label={`PIN for ${user.email}`}
                                  >
                                    {pinRevealed[user.id]
                                      ? pinViewValue[user.id]?.pin
                                      : "•".repeat(
                                          pinViewValue[user.id]?.pin?.length ??
                                            4,
                                        )}
                                  </p>
                                  <ActionIconButton
                                    icon={
                                      pinRevealed[user.id] ? EyeOff : Eye
                                    }
                                    label={
                                      pinRevealed[user.id]
                                        ? "Hide PIN"
                                        : "Show PIN"
                                    }
                                    onClick={() =>
                                      setPinRevealed((previous) => ({
                                        ...previous,
                                        [user.id]: !previous[user.id],
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                  {pinViewValue[user.id]?.message ??
                                    "PIN unavailable."}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {!pinViewValue[user.id]?.loading &&
                                !pinViewValue[user.id]?.pin ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    type="button"
                                    className="h-7 gap-1 rounded-md px-2.5 text-xs"
                                    onClick={() => beginPinEdit(user.id)}
                                  >
                                    <Hash className="size-3" aria-hidden />
                                    Set PIN
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  type="button"
                                  className="h-7 rounded-md px-2 text-xs"
                                  onClick={() => clearPinView(user.id)}
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          ) : canUpdate || canDeactivate ? (
                            <div className="inline-flex items-center justify-end gap-0.5 rounded-lg border border-border/55 bg-muted/25 p-0.5">
                              {canUpdate ? (
                                <>
                                  <ActionIconButton
                                    icon={KeyRound}
                                    label={`Set password for ${user.email}`}
                                    disabled={credentialsBusy}
                                    onClick={() => beginPasswordEdit(user.id)}
                                  />
                                  <ActionIconButton
                                    icon={Hash}
                                    label={`Set PIN for ${user.email}`}
                                    disabled={credentialsBusy}
                                    onClick={() => beginPinEdit(user.id)}
                                  />
                                  {user.hasPin ? (
                                    <ActionIconButton
                                      icon={Eye}
                                      label={`View PIN for ${user.email}`}
                                      disabled={credentialsBusy}
                                      onClick={() => void onViewPin(user.id)}
                                    />
                                  ) : null}
                                </>
                              ) : null}
                              {canDeactivate ? (
                                <ActionIconButton
                                  icon={
                                    deactivatingId === user.id
                                      ? Loader2
                                      : UserX
                                  }
                                  label={`Deactivate ${user.email}`}
                                  tone="danger"
                                  spinning={deactivatingId === user.id}
                                  disabled={deactivatingId === user.id}
                                  onClick={() => void onDeactivate(user.id)}
                                />
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Filter,
  Loader2,
  MapPin,
  Pencil,
  Palette,
  RefreshCw,
  Save,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { DashboardFeedback, DashboardPageHero } from "@/components/dashboard-page-ui";
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
  updateUser,
  type BranchRecord,
  type RoleRecord,
  type UserRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

const USER_STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "invited", label: "invited" },
  { value: "active", label: "active" },
  { value: "suspended", label: "suspended" },
  { value: "locked", label: "locked" },
] as const;

type UserDraft = {
  name: string;
  email: string;
  roleId: string;
  pin: string;
  status: string;
};

const DEFAULT_DRAFT: UserDraft = {
  name: "",
  email: "",
  roleId: "",
  pin: "",
  status: "active",
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function userInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-[11px] font-bold tracking-tight text-primary shadow-inner ring-1 ring-primary/15",
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
      return "bg-emerald-500/12 text-emerald-800 ring-emerald-500/20 dark:text-emerald-300";
    case "invited":
      return "bg-sky-500/12 text-sky-900 ring-sky-500/25 dark:text-sky-200";
    case "suspended":
      return "bg-amber-500/12 text-amber-950 ring-amber-500/25 dark:text-amber-200";
    case "locked":
      return "bg-rose-500/12 text-rose-900 ring-rose-500/25 dark:text-rose-200";
    default:
      return "bg-muted text-muted-foreground ring-border/60";
  }
}

function inputClass() {
  return cn(
    "w-full rounded-xl border border-input/80 bg-background px-3.5 py-2.5 text-sm shadow-sm transition-[border-color,box-shadow]",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
  );
}

function selectClass() {
  return cn(
    inputClass(),
    "cursor-pointer py-2",
  );
}

const panelClass = cn(
  "rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-black/[0.03] ring-1 ring-black/[0.03] backdrop-blur-sm",
  "dark:bg-card/80 dark:shadow-black/20 dark:ring-white/[0.06]",
);

const panelHeaderClass = "border-b border-border/50 bg-muted/25 px-5 py-4 sm:px-6";
const filterLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90";

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Core settings", icon: Building2 },
    { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
    { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
  ] as const;
  return (
    <div className="space-y-3">
      <p className={filterLabelClass}>Workspace</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/30 hover:shadow-md",
              "dark:hover:bg-accent/15",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground transition-all duration-200",
                "group-hover:bg-primary/15 group-hover:text-primary group-hover:shadow-sm group-hover:shadow-primary/10",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                {label}
                <ArrowRight
                  className="size-3.5 text-primary/60 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-xs leading-snug text-muted-foreground">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { me, refreshSession } = useDashboard();
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

  const canCreate = hasPermission(me?.permissions, Permission.UsersCreate);
  const canUpdate = hasPermission(me?.permissions, Permission.UsersUpdate);
  const canAssign = hasPermission(me?.permissions, Permission.UsersAssignRole);
  const canDeactivate = hasPermission(me?.permissions, Permission.UsersDeactivate);

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
          text: error instanceof Error ? error.message : "Failed to load users.",
        });
      })
      .finally(() => {
        setFirstLoadDone(true);
      });
  }, [filterStatus, filterRoleId, filterBranchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetInviteDraft = useCallback(() => {
    setDraft({
      ...DEFAULT_DRAFT,
      roleId: roles[0]?.id ?? "",
    });
  }, [roles]);

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
    setCreating(true);
    setFeedback(null);
    try {
      await createUser({
        name: draft.name,
        email: draft.email,
        roleId: draft.roleId,
        pin: draft.pin || undefined,
        status: draft.status,
      });
      setDraft((previous) => ({ ...DEFAULT_DRAFT, roleId: previous.roleId }));
      await loadData();
      await refreshSession();
      skipInviteDrawerResetAfterCreate.current = true;
      setInviteDrawerOpen(false);
      setFeedback({ kind: "success", text: "User created." });
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
      setFeedback({ kind: "error", text: "Choose a different role, then save." });
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
    if (!window.confirm("Deactivate this user? They will lose access until re-invited.")) {
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

  if (!firstLoadDone) {
    return (
      <div className="mx-auto flex min-h-[52vh] max-w-5xl flex-col items-center justify-center px-4 pb-16">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border/70 bg-card/90 px-12 py-14 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-md dark:ring-white/[0.06]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading directory</p>
            <p className="mt-1 text-xs text-muted-foreground">Fetching users, roles, and branches…</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadFailed && users.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="overflow-hidden rounded-3xl border border-destructive/35 bg-gradient-to-b from-destructive/[0.07] to-card p-8 text-center shadow-lg ring-1 ring-destructive/20">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="size-7 text-destructive" aria-hidden />
          </div>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-foreground">Could not load users</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-8 gap-2 rounded-xl shadow-sm"
            variant="outline"
            onClick={() => {
              setFeedback(null);
              void loadData();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto max-w-5xl space-y-8 px-4 pb-20 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[320px] w-[min(100%,42rem)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,hsl(var(--primary)/0.14),transparent_65%)] opacity-90 dark:opacity-60"
          aria-hidden
        />

        <div className="relative space-y-8">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-border/70 p-6 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-8",
              "bg-gradient-to-br from-card via-card to-primary/[0.03] backdrop-blur-sm dark:from-card/95 dark:via-card/90 dark:to-primary/[0.04] dark:ring-white/[0.06]",
            )}
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/[0.06] blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <DashboardPageHero
                icon={UsersIcon}
                eyebrow="Team"
                title="Users"
                description={
                  <>
                    Invite staff, assign roles, and control who can sign in. Your permissions define what you can change
                    here. Use{" "}
                    <span className="font-medium text-foreground">Invite user</span> to add someone from the drawer.
                  </>
                }
              />
              {canCreate ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-12 gap-2 self-stretch rounded-xl px-6 shadow-lg shadow-primary/20 transition hover:shadow-primary/30 sm:self-start lg:shrink-0"
                  disabled={creating || roles.length === 0}
                  onClick={() => {
                    skipInviteDrawerResetAfterCreate.current = false;
                    setInviteDrawerOpen(true);
                  }}
                >
                  <UserPlus className="size-4" aria-hidden />
                  Invite user
                </Button>
              ) : null}
            </div>
          </div>

          <RelatedLinks />

          {feedback ? (
            <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} />
          ) : null}

          <section className={cn(panelClass, "overflow-hidden")}>
            <div className={cn(panelHeaderClass, "flex flex-wrap items-center justify-between gap-3")}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Filter className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Filters</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Results reload from the server when you change a filter.</p>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <label className="flex flex-col gap-2">
                  <span className={filterLabelClass}>Status</span>
                  <select
                    className={selectClass()}
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
                <label className="flex flex-col gap-2">
                  <span className={filterLabelClass}>Role</span>
                  <select
                    className={selectClass()}
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
                <label className="flex flex-col gap-2">
                  <span className={filterLabelClass}>Branch</span>
                  <select
                    className={selectClass()}
                    value={filterBranchId}
                    onChange={(event) => setFilterBranchId(event.target.value)}
                    aria-label="Filter by branch"
                  >
                    <option value="">All branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex sm:col-span-2 lg:col-span-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 w-full rounded-xl font-medium shadow-sm"
                    onClick={() => {
                      setFilterStatus("");
                      setFilterRoleId("");
                      setFilterBranchId("");
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className={cn(panelClass, "overflow-hidden")}>
            <div className={cn(panelHeaderClass, "flex flex-wrap items-end justify-between gap-4")}>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">Directory</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  People in your workspace for this view
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium tabular-nums text-foreground shadow-sm backdrop-blur-sm">
                <UsersIcon className="size-3.5 text-primary" aria-hidden />
                {users.length} user{users.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/40 backdrop-blur-md">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Name
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Email
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Role
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="group/row transition-colors hover:bg-muted/[0.45]"
                    >
                      <td className="px-5 py-3.5 align-middle sm:px-6">
                        {canUpdate ? (
                          nameEditUserId === user.id ? (
                            <div className="flex max-w-xs flex-col gap-2.5">
                              <input
                                className={cn(inputClass(), "text-sm")}
                                value={editingName[user.id] ?? user.name}
                                onChange={(event) =>
                                  setEditingName((previous) => ({
                                    ...previous,
                                    [user.id]: event.target.value,
                                  }))
                                }
                                aria-label={`Edit name for ${user.email}`}
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
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                  ) : (
                                    <Save className="size-3.5" aria-hidden />
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
                          ) : (
                            <div className="flex min-h-11 items-center gap-3">
                              <UserAvatar name={user.name} />
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="truncate font-medium leading-snug text-foreground">{user.name}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  className="h-8 shrink-0 gap-1.5 rounded-full border-border/80 px-3 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground"
                                  onClick={() => {
                                    setNameEditUserId(user.id);
                                    setEditingName((previous) => ({
                                      ...previous,
                                      [user.id]: user.name,
                                    }));
                                  }}
                                  aria-label={`Edit name for ${user.email}`}
                                >
                                  <Pencil className="size-3" aria-hidden />
                                  Edit
                                </Button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex min-h-11 items-center gap-3">
                            <UserAvatar name={user.name} />
                            <span className="truncate font-medium leading-snug text-foreground">{user.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle text-muted-foreground sm:px-6">
                        <span className="block max-w-[14rem] truncate text-sm leading-snug sm:max-w-xs" title={user.email}>
                          {user.email}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle sm:px-6">
                        {canAssign && roleEditUserId === user.id ? (
                          <div className="flex max-w-[14rem] flex-col gap-2.5">
                            <select
                              className={cn(selectClass(), "text-xs")}
                              value={roleChange[user.id] ?? user.role?.id ?? ""}
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
                                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                                ) : null}
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
                          <div className="flex min-h-11 flex-wrap items-center gap-2">
                            <span className="text-sm font-medium leading-snug text-foreground">
                              {user.role?.name ?? "—"}
                            </span>
                            {canAssign ? (
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                className="h-8 shrink-0 gap-1.5 rounded-full border-border/80 px-3 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground"
                                onClick={() => {
                                  setRoleEditUserId(user.id);
                                  setRoleChange((previous) => ({
                                    ...previous,
                                    [user.id]: user.role?.id ?? "",
                                  }));
                                }}
                                aria-label={`Change role for ${user.email}`}
                              >
                                <Pencil className="size-3" aria-hidden />
                                Change
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-middle sm:px-6">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-tight ring-1 ring-inset",
                            statusBadgeClass(user.status),
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle sm:px-6">
                        {canDeactivate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            className="h-9 gap-1.5 rounded-xl border-destructive/35 bg-destructive/[0.04] text-destructive shadow-sm transition hover:bg-destructive/10 hover:text-destructive"
                            disabled={deactivatingId === user.id}
                            onClick={() => void onDeactivate(user.id)}
                          >
                            {deactivatingId === user.id ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <UserX className="size-3.5" aria-hidden />
                            )}
                            Deactivate
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground/80">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 ? (
              <div className="border-t border-border/50 bg-muted/10 px-6 py-14 text-center">
                <UsersIcon className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No one matches these filters</p>
                <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or adjusting status, role, or branch.</p>
              </div>
            ) : null}
          </section>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="font-mono text-[11px] font-medium text-foreground/90">GET …/users</span>
            <span className="hidden text-muted-foreground/45 sm:inline" aria-hidden>
              ·
            </span>
            <span>Other open tabs may need a refresh to see permission changes.</span>
          </p>
        </div>
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
                className="rounded-xl"
                disabled={creating}
                onClick={() => onInviteDrawerOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-user-form"
                className="rounded-xl shadow-md shadow-primary/15"
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
          <form id="invite-user-form" className="space-y-6" onSubmit={onCreateUser}>
            <FormDrawerFields
              legend="Account"
              hint="Email must be unique in your workspace. PIN is optional for cashier-style access."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Full name
                  <input
                    className={inputClass()}
                    placeholder="Jane Doe"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, name: event.target.value }))
                    }
                    required
                    autoComplete="name"
                    aria-label="New user name"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Email
                  <input
                    className={inputClass()}
                    placeholder="jane@company.com"
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, email: event.target.value }))
                    }
                    required
                    autoComplete="email"
                    aria-label="New user email"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Role
                  <select
                    className={selectClass()}
                    value={draft.roleId}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, roleId: event.target.value }))
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
                  Status
                  <select
                    className={selectClass()}
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, status: event.target.value }))
                    }
                    aria-label="Status for new user"
                  >
                    <option value="active">active</option>
                    <option value="invited">invited</option>
                  </select>
                </label>
                <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  PIN <span className="font-normal text-muted-foreground/80">(optional, 4–6 digits)</span>
                  <input
                    className={inputClass()}
                    placeholder="For kiosk / cashier-style users"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    value={draft.pin}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, pin: event.target.value }))
                    }
                    aria-label="PIN for cashier-style user"
                  />
                </label>
              </div>
            </FormDrawerFields>
          </form>
        </FormDrawer>
      ) : null}
    </>
  );
}

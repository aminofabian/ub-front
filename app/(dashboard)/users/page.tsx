"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  MapPin,
  Palette,
  RefreshCw,
  Save,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
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

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

function selectClass() {
  return cn(
    inputClass(),
    "cursor-pointer py-2",
  );
}

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Core settings", icon: Building2 },
    { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
    { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
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
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

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
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading users…</p>
      </div>
    );
  }

  if (loadFailed && users.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
          <h1 className="mt-4 text-lg font-semibold tracking-tight">Could not load users</h1>
          <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-6 gap-2"
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
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <UsersIcon className="size-4" aria-hidden />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/90">Team</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Invite staff, assign roles, and manage access. What you can do here depends on your permissions (create,
            update, assign role, deactivate).
          </p>
        </div>
        <RelatedLinks />
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
            feedback.kind === "success" &&
              "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-950 dark:text-emerald-100",
            feedback.kind === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
          <Filter className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Filters</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Narrow the list; filters reload results from the server.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:max-w-[12rem]">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
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
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
            <span className="text-xs font-medium text-muted-foreground">Role</span>
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
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
            <span className="text-xs font-medium text-muted-foreground">Branch</span>
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
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={() => {
              setFilterStatus("");
              setFilterRoleId("");
              setFilterBranchId("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </section>

      {canCreate ? (
        <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-primary/[0.04] to-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight">Invite user</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Creates the account and sends them down your configured flow.</p>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12" onSubmit={onCreateUser}>
            <input
              className={cn(inputClass(), "md:col-span-3")}
              placeholder="Full name"
              value={draft.name}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, name: event.target.value }))
              }
              required
              aria-label="New user name"
            />
            <input
              className={cn(inputClass(), "md:col-span-3")}
              placeholder="Email"
              type="email"
              value={draft.email}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, email: event.target.value }))
              }
              required
              aria-label="New user email"
            />
            <select
              className={cn(selectClass(), "md:col-span-2")}
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
            <select
              className={cn(selectClass(), "md:col-span-2")}
              value={draft.status}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, status: event.target.value }))
              }
              aria-label="Status for new user"
            >
              <option value="active">active</option>
              <option value="invited">invited</option>
            </select>
            <input
              className={cn(inputClass(), "md:col-span-2")}
              placeholder="PIN (4–6 digits, optional)"
              inputMode="numeric"
              pattern="\d{4,6}"
              value={draft.pin}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, pin: event.target.value }))
              }
              aria-label="PIN for cashier-style user"
            />
            <Button className="md:col-span-12 md:w-fit" type="submit" disabled={creating} size="lg">
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
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Directory</h2>
          <p className="text-xs text-muted-foreground">{users.length} user{users.length === 1 ? "" : "s"} in this view</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/20">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Role</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 align-top sm:px-5">
                    {canUpdate ? (
                      <div className="flex max-w-xs flex-col gap-2">
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
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          className="w-fit gap-1.5"
                          disabled={savingNameId === user.id}
                          onClick={() => void onSaveName(user.id)}
                        >
                          {savingNameId === user.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Save className="size-3.5" aria-hidden />
                          )}
                          Save name
                        </Button>
                      </div>
                    ) : (
                      <span className="font-medium">{user.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground sm:px-5">
                    <span className="break-all">{user.email}</span>
                  </td>
                  <td className="px-4 py-3 align-top sm:px-5">
                    <p className="text-xs font-medium text-foreground">{user.role?.name ?? "—"}</p>
                    {canAssign ? (
                      <div className="mt-2 flex max-w-[14rem] flex-col gap-2">
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
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          className="w-fit gap-1.5 text-xs"
                          disabled={savingRoleId === user.id}
                          onClick={() => void onAssignRole(user.id)}
                        >
                          {savingRoleId === user.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : null}
                          Save role
                        </Button>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top sm:px-5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        user.status === "active"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top sm:px-5">
                    {canDeactivate ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        className="gap-1.5"
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
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 ? (
          <p className="border-t border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">
            No users match these filters.
          </p>
        ) : null}
      </section>

      <p className="text-xs text-muted-foreground">
        <span className="font-mono">GET …/users</span> with filters · changes may require a session refresh for other tabs
      </p>
    </div>
  );
}

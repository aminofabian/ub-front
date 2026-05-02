"use client";

import { useCallback, useEffect, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
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

export default function UsersPage() {
  const { me, refreshSession } = useDashboard();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [draft, setDraft] = useState<UserDraft>(DEFAULT_DRAFT);
  const [message, setMessage] = useState("");
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [roleChange, setRoleChange] = useState<Record<string, string>>({});

  const canCreate = hasPermission(me?.permissions, Permission.UsersCreate);
  const canUpdate = hasPermission(me?.permissions, Permission.UsersUpdate);
  const canAssign = hasPermission(me?.permissions, Permission.UsersAssignRole);
  const canDeactivate = hasPermission(me?.permissions, Permission.UsersDeactivate);

  const loadData = useCallback(async () => {
    const filters = {
      status: filterStatus.trim() || undefined,
      roleId: filterRoleId.trim() || undefined,
      branchId: filterBranchId.trim() || undefined,
    };
    const [userRows, roleRows, branchRows] = await Promise.all([
      fetchUsers(filters),
      fetchRoles(),
      fetchBranches(),
    ]);
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
  }, [filterStatus, filterRoleId, filterBranchId]);

  useEffect(() => {
    loadData().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Failed to load users."),
    );
  }, [loadData]);

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
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
      setMessage("User created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create user failed.");
    }
  };

  const onSaveName = async (userId: string) => {
    const name = editingName[userId]?.trim();
    if (!name) {
      return;
    }
    setMessage("");
    try {
      await updateUser(userId, { name });
      await loadData();
      setMessage("User updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const onAssignRole = async (userId: string) => {
    const row = users.find((u) => u.id === userId);
    const selected = roleChange[userId] ?? row?.role?.id ?? "";
    if (!selected || selected === row?.role?.id) {
      setMessage("Choose a different role, then save.");
      return;
    }
    setMessage("");
    try {
      await assignUserRole(userId, selected);
      setRoleChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      await refreshSession();
      setMessage("Role updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Role update failed.");
    }
  };

  const onDeactivate = async (userId: string) => {
    if (!window.confirm("Deactivate this user?")) {
      return;
    }
    setMessage("");
    try {
      await deactivateUser(userId);
      await loadData();
      await refreshSession();
      setMessage("User deactivated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Deactivate failed.");
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          List, create, update, change role, and deactivate (per your permissions).
        </p>
      </header>

      <div className="flex max-w-4xl flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Status</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
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
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Role</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
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
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Branch</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
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
          className="h-9"
          onClick={() => {
            setFilterStatus("");
            setFilterRoleId("");
            setFilterBranchId("");
          }}
        >
          Clear filters
        </Button>
      </div>

      {canCreate ? (
        <form
          className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-6"
          onSubmit={onCreateUser}
        >
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Name"
            value={draft.name}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, name: event.target.value }))
            }
            required
            aria-label="New user name"
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
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
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
            className="rounded-md border bg-background px-3 py-2 text-sm"
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
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="PIN (4–6 digits, optional)"
            inputMode="numeric"
            pattern="\d{4,6}"
            value={draft.pin}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, pin: event.target.value }))
            }
            aria-label="PIN for cashier-style user"
          />
          <Button className="md:col-span-2 md:w-fit" type="submit">
            Create user
          </Button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-3 py-2 align-top">
                  {canUpdate ? (
                    <div className="flex flex-col gap-1">
                      <input
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
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
                        className="h-7 w-fit text-xs"
                        onClick={() => onSaveName(user.id)}
                      >
                        Save name
                      </Button>
                    </div>
                  ) : (
                    user.name
                  )}
                </td>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2 align-top">
                  <span className="text-xs text-muted-foreground">
                    {user.role?.name ?? "—"}
                  </span>
                  {canAssign ? (
                    <div className="mt-1 flex flex-col gap-1">
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs"
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
                        className="h-7 w-fit text-xs"
                        onClick={() => onAssignRole(user.id)}
                      >
                        Save role
                      </Button>
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{user.status}</td>
                <td className="px-3 py-2 align-top">
                  {canDeactivate ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      type="button"
                      className="h-7 text-xs"
                      onClick={() => onDeactivate(user.id)}
                    >
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

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}

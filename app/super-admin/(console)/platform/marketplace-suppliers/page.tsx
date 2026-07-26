"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activateSaMarketplaceSupplier,
  createSaMarketplaceSupplierUser,
  fetchSaMarketplaceSupplierUsers,
  fetchSaMarketplaceSuppliers,
  forceLogoutSaMarketplaceSupplierUser,
  inviteSaMarketplaceSupplier,
  resetSaMarketplaceSupplierUserPassword,
  suspendSaMarketplaceSupplier,
  suspendSaMarketplaceSupplierUser,
  unlockSaMarketplaceSupplierUser,
  unsuspendSaMarketplaceSupplierUser,
  type SaMarketplaceSupplierRow,
  type SaMarketplaceSupplierUserRow,
} from "@/lib/super-admin-api";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return <Badge className="bg-emerald-600/15 text-emerald-800">Active</Badge>;
  if (s === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function SuperAdminMarketplaceSuppliersPage() {
  const [rows, setRows] = useState<SaMarketplaceSupplierRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<SaMarketplaceSupplierRow | null>(null);
  const [users, setUsers] = useState<SaMarketplaceSupplierUserRow[]>([]);
  const [usersError, setUsersError] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [resetPasswordByUser, setResetPasswordByUser] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      setRows(
        await fetchSaMarketplaceSuppliers({
          q: search.trim() || undefined,
          status: statusFilter.trim() || undefined,
          size: 100,
        }),
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load marketplace suppliers.");
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadUsers = useCallback(async (supplierId: string) => {
    setUsersError("");
    try {
      setUsers(await fetchSaMarketplaceSupplierUsers(supplierId));
    } catch (e) {
      setUsers([]);
      setUsersError(e instanceof Error ? e.message : "Could not load portal users.");
    }
  }, []);

  const openSupplier = async (row: SaMarketplaceSupplierRow) => {
    setSelected(row);
    setInvitePhone(row.contactPhone ?? "");
    setInviteResult("");
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setResetPasswordByUser({});
    await loadUsers(row.id);
  };

  const selectedLabel = useMemo(() => selected?.name ?? "Supplier", [selected]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      showThemedSuccessToast(label);
      if (selected) {
        await loadUsers(selected.id);
        await reload();
        const refreshed = (await fetchSaMarketplaceSuppliers({ size: 100 })).find((r) => r.id === selected.id);
        if (refreshed) setSelected(refreshed);
      } else {
        await reload();
      }
    } catch (e) {
      showThemedErrorToast(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Marketplace suppliers"
        description="Invite, reset passwords, suspend portal users, and force logout for Supplier Portal accounts."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={busy}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Refresh
          </Button>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone…"
          />
        </label>
        <label className="w-40 space-y-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Username</th>
              <th className="px-3 py-2 font-medium">Users</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No marketplace suppliers found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{row.id}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <div>{row.contactPhone || "—"}</div>
                    <div>{row.contactEmail || "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.username || "—"}</td>
                  <td className="px-3 py-2.5">{row.portalUserCount}</td>
                  <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button type="button" size="sm" variant="outline" onClick={() => void openSupplier(row)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SuperAdminDrawer
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selectedLabel}
        description="Portal invites, users, and session controls."
        width="wide"
      >
        {selected ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(selected.status)}
              {selected.status.toLowerCase() === "suspended" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void runAction("Supplier activated", async () => {
                      await activateSaMarketplaceSupplier(selected.id);
                    })
                  }
                >
                  Activate supplier
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => {
                    showThemedConfirmToast({
                      id: `suspend-marketplace-supplier-${selected.id}`,
                      title: "Suspend this marketplace supplier?",
                      description: "All portal sessions will be revoked and login will be blocked.",
                      confirmLabel: "Suspend",
                      onConfirm: () =>
                        void runAction("Supplier suspended", async () => {
                          await suspendSaMarketplaceSupplier(selected.id);
                        }),
                    });
                  }}
                >
                  Suspend supplier
                </Button>
              )}
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Invite to portal</h3>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-xs"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="Phone (optional)"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void runAction("Invite created", async () => {
                      const res = await inviteSaMarketplaceSupplier(selected.id, {
                        phone: invitePhone.trim() || undefined,
                        sendSms: Boolean(invitePhone.trim()),
                      });
                      setInviteResult(
                        `Code ${res.claimCode} · expires ${new Date(res.expiresAt).toLocaleString()}` +
                          (res.smsSent ? " · SMS sent" : " · SMS not sent") +
                          `\n${res.claimUrl}`,
                      );
                    })
                  }
                >
                  Create invite{invitePhone.trim() ? " + SMS" : ""}
                </Button>
              </div>
              {inviteResult ? (
                <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{inviteResult}</pre>
              ) : null}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Create portal user</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Name"
                />
                <Input
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email"
                />
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={busy || !newUserName.trim() || !newUserEmail.trim() || !newUserPassword}
                onClick={() =>
                  void runAction("Portal user created", async () => {
                    await createSaMarketplaceSupplierUser(selected.id, {
                      name: newUserName.trim(),
                      email: newUserEmail.trim(),
                      password: newUserPassword,
                    });
                    setNewUserName("");
                    setNewUserEmail("");
                    setNewUserPassword("");
                  })
                }
              >
                Create user
              </Button>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Portal users</h3>
              {usersError ? <AuthAlert variant="error">{usersError}</AuthAlert> : null}
              {users.length === 0 && !usersError ? (
                <p className="text-sm text-muted-foreground">No portal users yet.</p>
              ) : (
                <ul className="space-y-3">
                  {users.map((user) => (
                    <li key={user.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.phone || "—"} · {user.email || "—"} · {user.roleKey}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {user.active ? (
                              <Badge className="bg-emerald-600/15 text-emerald-800">Active</Badge>
                            ) : (
                              <Badge variant="destructive">Suspended</Badge>
                            )}
                            {user.lockedUntil ? <Badge variant="secondary">Locked</Badge> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {user.active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction("User suspended", async () => {
                                  await suspendSaMarketplaceSupplierUser(selected.id, user.id);
                                })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction("User unsuspended", async () => {
                                  await unsuspendSaMarketplaceSupplierUser(selected.id, user.id);
                                })
                              }
                            >
                              Unsuspend
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void runAction("Sessions revoked", async () => {
                                await forceLogoutSaMarketplaceSupplierUser(selected.id, user.id);
                              })
                            }
                          >
                            Force logout
                          </Button>
                          {user.lockedUntil ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runAction("User unlocked", async () => {
                                  await unlockSaMarketplaceSupplierUser(selected.id, user.id);
                                })
                              }
                            >
                              Unlock
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Input
                          type="password"
                          className="max-w-xs"
                          value={resetPasswordByUser[user.id] ?? ""}
                          onChange={(e) =>
                            setResetPasswordByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                          }
                          placeholder="New password"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy || !(resetPasswordByUser[user.id] ?? "").trim()}
                          onClick={() =>
                            void runAction("Password reset", async () => {
                              await resetSaMarketplaceSupplierUserPassword(
                                selected.id,
                                user.id,
                                (resetPasswordByUser[user.id] ?? "").trim(),
                              );
                              setResetPasswordByUser((prev) => ({ ...prev, [user.id]: "" }));
                            })
                          }
                        >
                          Reset password
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </SuperAdminDrawer>
    </div>
  );
}

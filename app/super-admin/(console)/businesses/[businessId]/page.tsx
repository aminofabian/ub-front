"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaBusinessStats,
  type SaBusinessUserRow,
  type SaDomainRow,
  addSaDomain,
  deleteSaBusiness,
  deleteSaDomain,
  fetchSaBusinessStats,
  fetchSaBusinessUsers,
  fetchSaDomains,
  patchSaBusiness,
  setSaPrimaryDomain,
} from "@/lib/super-admin-api";

function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(amount);
}

type Tab = "overview" | "domains" | "users";

function BusinessDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdRaw = params.businessId;
  const businessId =
    typeof businessIdRaw === "string"
      ? businessIdRaw
      : Array.isArray(businessIdRaw)
        ? businessIdRaw[0]
        : "";
  const titleName = searchParams.get("name") ?? "";
  const tierParam = searchParams.get("tier") ?? "";
  const activeParam = searchParams.get("active");

  // ── State ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Business settings
  const [bizName, setBizName] = useState(titleName);
  const [bizTier, setBizTier] = useState(tierParam);
  const [bizActive, setBizActive] = useState(activeParam !== "0");

  // Domains
  const [domains, setDomains] = useState<SaDomainRow[]>([]);
  const [newDomain, setNewDomain] = useState("");

  // Users
  const [users, setUsers] = useState<SaBusinessUserRow[]>([]);

  // Stats
  const [stats, setStats] = useState<SaBusinessStats | null>(null);

  // Shared
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ── Derived: admins vs staff ─────────────────────────────────────────
  const admins = useMemo(
    () => users.filter((u) => u.roleKey === "owner" || u.roleKey === "admin"),
    [users],
  );
  const staff = useMemo(
    () => users.filter((u) => u.roleKey !== "owner" && u.roleKey !== "admin"),
    [users],
  );

  // ── Data loading ─────────────────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    if (!businessId) return;
    try {
      setDomains(await fetchSaDomains(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load domains.");
    }
  }, [businessId]);

  const loadUsers = useCallback(async () => {
    if (!businessId) return;
    try {
      setUsers(await fetchSaBusinessUsers(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users.");
    }
  }, [businessId]);

  const loadStats = useCallback(async () => {
    if (!businessId) return;
    try {
      setStats(await fetchSaBusinessStats(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stats.");
    }
  }, [businessId]);

  useEffect(() => {
    setError("");
    void loadDomains();
    void loadUsers();
    void loadStats();
  }, [loadDomains, loadUsers, loadStats]);

  useEffect(() => {
    setBizName(titleName);
    setBizTier(tierParam);
    setBizActive(activeParam !== "0");
  }, [titleName, tierParam, activeParam]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const onSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setBusy(true);
    setError("");
    try {
      await patchSaBusiness(businessId, {
        name: bizName.trim() || undefined,
        subscriptionTier: bizTier.trim() || undefined,
        active: bizActive,
      });
      const t = bizTier.trim();
      router.replace(
        `/super-admin/businesses/${encodeURIComponent(businessId)}?name=${encodeURIComponent(bizName.trim())}&tier=${encodeURIComponent(t)}&active=${bizActive ? "1" : "0"}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const onAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setBusy(true);
    setError("");
    try {
      await addSaDomain(businessId, newDomain);
      setNewDomain("");
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add domain failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSetPrimary = async (domainId: string) => {
    if (!businessId) return;
    setBusy(true);
    setError("");
    try {
      await setSaPrimaryDomain(businessId, domainId);
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set primary.");
    } finally {
      setBusy(false);
    }
  };

  const performDeleteDomain = async (row: SaDomainRow) => {
    if (!businessId) return;
    setBusy(true);
    setError("");
    try {
      await deleteSaDomain(businessId, row.id);
      showThemedSuccessToast(`Domain “${row.domain}” deleted.`);
      await loadDomains();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete domain.";
      setError(message);
      showThemedErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteDomain = (row: SaDomainRow) => {
    if (!businessId) return;
    if (row.primary) {
      setError("Promote another domain to primary before deleting this one.");
      return;
    }
    showThemedConfirmToast({
      id: `delete-sa-domain-${row.id}`,
      title: `Delete domain “${row.domain}”?`,
      description:
        "This stops routing the host to this tenant. Active sessions on that host will be redirected to the primary domain on next request.",
      onConfirm: () => performDeleteDomain(row),
    });
  };

  const performDeleteTenant = async () => {
    if (!businessId) return;
    setBusy(true);
    setError("");
    try {
      await deleteSaBusiness(businessId);
      showThemedSuccessToast(`Tenant “${bizName || businessId}” deleted.`);
      router.push(APP_ROUTES.superAdminBusinesses);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setError(message);
      showThemedErrorToast(message);
    } finally {
      setBusy(false);
    }
  };

  const onDeleteTenant = () => {
    if (!businessId) return;
    showThemedConfirmToast({
      id: `delete-sa-business-${businessId}`,
      title: `Archive tenant “${bizName || businessId}”?`,
      description:
        "All users, domains, and sessions for this tenant will be removed from active use.",
      onConfirm: () => performDeleteTenant(),
    });
  };

  if (!businessId) {
    return <AuthAlert variant="error">Missing business id.</AuthAlert>;
  }

  // ── Tab helpers ──────────────────────────────────────────────────────
  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          type="button"
          asChild
        >
          <Link href={APP_ROUTES.superAdminBusinesses}>
            &larr; All businesses
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {bizName || "Business"}{" "}
          <span className="text-base font-normal text-muted-foreground">
            &middot; super-admin
          </span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
          {businessId}
        </p>
      </div>

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-border/60">
        <button
          type="button"
          className={tabClass("overview")}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={tabClass("users")}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.length})
        </button>
        <button
          type="button"
          className={tabClass("domains")}
          onClick={() => setActiveTab("domains")}
        >
          Domains ({domains.length})
        </button>
      </div>

      {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Business settings */}
          <Card>
            <CardHeader>
              <CardTitle>Business settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="max-w-md space-y-3" onSubmit={onSaveBusiness}>
                <label className="block">
                  <span className="text-sm font-medium">Display name</span>
                  <input
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={bizName}
                    onChange={(ev) => setBizName(ev.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Subscription tier</span>
                  <input
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={bizTier}
                    onChange={(ev) => setBizTier(ev.target.value)}
                    placeholder="starter"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bizActive}
                    onChange={(ev) => setBizActive(ev.target.checked)}
                  />
                  Active
                </label>
                <Button type="submit" disabled={busy}>
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Total Users
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.totalUsers}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Active Users
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.activeUsers}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Products
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.totalProducts}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Branches
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.totalBranches}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Open Shifts
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.openShifts}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Sales Today
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.totalSalesToday}
                    </div>
                    {stats.revenueToday > 0 ? (
                      <div className="mt-0.5 text-xs text-green-600 font-medium">
                        {formatKES(stats.revenueToday)}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Sales This Month
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">
                      {stats.totalSalesThisMonth}
                    </div>
                    {stats.revenueThisMonth > 0 ? (
                      <div className="mt-0.5 text-xs text-green-600 font-medium">
                        {formatKES(stats.revenueThisMonth)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading statistics&hellip;
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick user summary */}
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Loading users&hellip;
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Admins &amp; Owners ({admins.length})
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {admins.slice(0, 5).map((u) => (
                        <li key={u.id} className="flex justify-between gap-2">
                          <span className="font-medium truncate">
                            {u.name || u.email}
                          </span>
                          <span className="text-muted-foreground capitalize">
                            {u.roleKey}
                          </span>
                        </li>
                      ))}
                      {admins.length > 5 ? (
                        <li className="text-xs text-muted-foreground">
                          +{admins.length - 5} more
                        </li>
                      ) : null}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Staff ({staff.length})
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {staff.slice(0, 5).map((u) => (
                        <li key={u.id} className="flex justify-between gap-2">
                          <span className="font-medium truncate">
                            {u.name || u.email}
                          </span>
                          <span className="text-muted-foreground capitalize">
                            {u.roleKey}
                          </span>
                        </li>
                      ))}
                      {staff.length > 5 ? (
                        <li className="text-xs text-muted-foreground">
                          +{staff.length - 5} more
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Delete tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Archives this business and soft-deletes every user under it.
                Super-admin stays signed in; you will return to the business
                list.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-4"
                disabled={busy}
                onClick={() => void onDeleteTenant()}
              >
                {busy ? "Working&hellip;" : "Delete this tenant"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Admins & Owners */}
          <Card>
            <CardHeader>
              <CardTitle>Admins &amp; Owners ({admins.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          No admins or owners.
                        </td>
                      </tr>
                    ) : (
                      admins.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">{u.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.email}
                          </td>
                          <td className="px-3 py-2">
                            <span className="capitalize rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {u.roleName || u.roleKey}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`capitalize rounded px-2 py-0.5 text-xs font-medium ${
                                u.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.branchName}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Staff */}
          <Card>
            <CardHeader>
              <CardTitle>Staff ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          No staff users.
                        </td>
                      </tr>
                    ) : (
                      staff.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">{u.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.email}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                              {u.roleName || u.roleKey}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`capitalize rounded px-2 py-0.5 text-xs font-medium ${
                                u.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {u.branchName}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DOMAINS TAB ───────────────────────────────────────────────── */}
      {activeTab === "domains" && (
        <Card>
          <CardHeader>
            <CardTitle>Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hostnames mapped to this tenant (lowercase). One can be marked
              primary.
            </p>
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={onAddDomain}
            >
              <label className="flex-1">
                <span className="text-sm font-medium">New domain</span>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newDomain}
                  onChange={(ev) => setNewDomain(ev.target.value)}
                  placeholder="kiosk.example.com"
                />
              </label>
              <Button type="submit" disabled={busy}>
                Add
              </Button>
            </form>

            <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">Primary</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {domains.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No domains. Add one above or recreate with primary
                        domain.
                      </td>
                    </tr>
                  ) : (
                    domains.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          {d.domain}
                        </td>
                        <td className="px-3 py-2">{d.primary ? "Yes" : "—"}</td>
                        <td className="px-3 py-2">{d.active ? "Yes" : "No"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {!d.primary ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => void onSetPrimary(d.id)}
                              >
                                Make primary
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                              disabled={busy || d.primary}
                              title={
                                d.primary
                                  ? "Promote another domain first to delete the primary"
                                  : "Delete this domain mapping"
                              }
                              onClick={() => void onDeleteDomain(d)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SuperAdminBusinessDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">
          Loading business&hellip;
        </div>
      }
    >
      <BusinessDetailInner />
    </Suspense>
  );
}

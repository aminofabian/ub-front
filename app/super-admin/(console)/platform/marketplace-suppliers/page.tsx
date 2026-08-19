"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import {
  SaSection,
  saSelectClass,
  saSegmentButtonClass,
  saSegmentWrapClass,
} from "@/components/super-admin/sa-section";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateSaMarketplaceSupplier,
  createSaMarketplaceSupplier,
  createSaMarketplaceSupplierUser,
  fetchSaMarketplaceSupplierShops,
  fetchSaMarketplaceSupplierStats,
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
  type SaMarketplaceSupplierShopLink,
  type SaMarketplaceSupplierStats,
  type SaMarketplaceSupplierUserRow,
} from "@/lib/super-admin-api";

type PortalFilter = "all" | "has_users" | "needs_invite";
type ShopFilter = "all" | "linked" | "orphan";
type SortKey = "updatedAt,desc" | "name,asc" | "createdAt,desc" | "supplierNumber,asc";

const PAGE_SIZE = 50;

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return <Badge className="bg-emerald-600/15 text-emerald-800">Active</Badge>;
  if (s === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  if (s === "draft") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function connectionBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return <Badge className="bg-emerald-600/15 text-emerald-800">Linked</Badge>;
  if (s === "suspended") return <Badge variant="destructive">Suspended</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
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
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    showThemedSuccessToast(`${label} copied`);
  } catch {
    showThemedErrorToast(`Could not copy ${label.toLowerCase()}.`);
  }
}

export default function SuperAdminMarketplaceSuppliersPage() {
  const [rows, setRows] = useState<SaMarketplaceSupplierRow[]>([]);
  const [stats, setStats] = useState<SaMarketplaceSupplierStats | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [portalFilter, setPortalFilter] = useState<PortalFilter>("all");
  const [shopFilter, setShopFilter] = useState<ShopFilter>("all");
  const [sort, setSort] = useState<SortKey>("updatedAt,desc");
  const [selected, setSelected] = useState<SaMarketplaceSupplierRow | null>(null);
  const [users, setUsers] = useState<SaMarketplaceSupplierUserRow[]>([]);
  const [shops, setShops] = useState<SaMarketplaceSupplierShopLink[]>([]);
  const [usersError, setUsersError] = useState("");
  const [shopsError, setShopsError] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [resetPasswordByUser, setResetPasswordByUser] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const [pageResult, nextStats] = await Promise.all([
        fetchSaMarketplaceSuppliers({
          q: search || undefined,
          status: statusFilter || undefined,
          page,
          size: PAGE_SIZE,
          sort,
        }),
        fetchSaMarketplaceSupplierStats(),
      ]);
      setRows(pageResult.content);
      setTotalElements(pageResult.totalElements);
      setTotalPages(Math.max(1, pageResult.totalPages));
      setStats(nextStats);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load marketplace suppliers.");
    }
  }, [page, search, sort, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const users = row.portalUserCount ?? 0;
      const shops = row.linkedShopCount ?? 0;
      if (portalFilter === "has_users" && users < 1) return false;
      if (portalFilter === "needs_invite" && users > 0) return false;
      if (shopFilter === "linked" && shops < 1) return false;
      if (shopFilter === "orphan" && shops > 0) return false;
      return true;
    });
  }, [portalFilter, rows, shopFilter]);

  const loadUsers = useCallback(async (supplierId: string) => {
    setUsersError("");
    try {
      setUsers(await fetchSaMarketplaceSupplierUsers(supplierId));
    } catch (e) {
      setUsers([]);
      setUsersError(e instanceof Error ? e.message : "Could not load portal users.");
    }
  }, []);

  const loadShops = useCallback(async (supplierId: string) => {
    setShopsError("");
    try {
      setShops(await fetchSaMarketplaceSupplierShops(supplierId));
    } catch (e) {
      setShops([]);
      setShopsError(e instanceof Error ? e.message : "Could not load linked shops.");
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
    await Promise.all([loadUsers(row.id), loadShops(row.id)]);
  };

  const selectedLabel = useMemo(() => selected?.name ?? "Supplier", [selected]);

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      showThemedSuccessToast(label);
      if (selected) {
        await Promise.all([loadUsers(selected.id), loadShops(selected.id), reload()]);
        const refreshed = (
          await fetchSaMarketplaceSuppliers({
            q: search || undefined,
            status: statusFilter || undefined,
            page,
            size: PAGE_SIZE,
            sort,
          })
        ).content.find((r) => r.id === selected.id);
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const created = await createSaMarketplaceSupplier({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        contactEmail: createEmail.trim() || undefined,
        contactPhone: createPhone.trim() || undefined,
      });
      showThemedSuccessToast(`Created ${created.supplierNumber || created.name}`);
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreateDescription("");
      await reload();
      await openSupplier(created);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const setStatusChip = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Marketplace suppliers"
        description="Platform identities created when tenants add suppliers, claim the portal, or get invited. Invite, reset access, and see which shops each supplier serves."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={busy}>
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              New identity
            </Button>
          </>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <SaSection
        title="Identities"
        description={
          <>
            Showing {visibleRows.length}
            {portalFilter !== "all" || shopFilter !== "all" ? " filtered" : ""} of {totalElements} · page {page + 1} /{" "}
            {totalPages}
          </>
        }
        padded={false}
      >
        <div className="space-y-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="ms-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ms-search"
                  className="pl-8"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Name, S-number, email, phone, username…"
                />
              </div>
            </div>
            <div className="w-full space-y-1.5 sm:w-44">
              <Label htmlFor="ms-sort">Sort</Label>
              <select
                id="ms-sort"
                className={saSelectClass}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(0);
                }}
              >
                <option value="updatedAt,desc">Recently updated</option>
                <option value="createdAt,desc">Newest first</option>
                <option value="name,asc">Name A–Z</option>
                <option value="supplierNumber,asc">Supplier number</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className={saSegmentWrapClass} role="group" aria-label="Filter by status">
              {(
                [
                  ["", "All", stats?.total],
                  ["active", "Active", stats?.active],
                  ["draft", "Draft", stats?.draft],
                  ["suspended", "Suspended", stats?.suspended],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value || "all"}
                  type="button"
                  aria-pressed={statusFilter === value}
                  className={saSegmentButtonClass(statusFilter === value)}
                  onClick={() => setStatusChip(value)}
                >
                  {label}
                  {typeof count === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className={saSegmentWrapClass} role="group" aria-label="Filter by portal">
              {(
                [
                  ["all", "Any portal", undefined],
                  ["has_users", "Has users", stats?.withPortalUsers],
                  ["needs_invite", "Needs invite", stats?.needingInvite],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={portalFilter === value}
                  className={saSegmentButtonClass(portalFilter === value)}
                  onClick={() => setPortalFilter(value)}
                >
                  {label}
                  {typeof count === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className={saSegmentWrapClass} role="group" aria-label="Filter by shops">
              {(
                [
                  ["all", "Any shops", undefined],
                  ["linked", "Linked shops", stats?.withLinkedShops],
                  ["orphan", "No shops yet", undefined],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shopFilter === value}
                  className={saSegmentButtonClass(shopFilter === value)}
                  onClick={() => setShopFilter(value)}
                >
                  {label}
                  {typeof count === "number" ? (
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
            {rows.length === 0
              ? "No marketplace suppliers yet. Tenants create them when adding suppliers, or create one here."
              : "No suppliers match the current filters on this page."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/60 lg:hidden">
              {visibleRows.map((row) => {
                const shopCount = row.linkedShopCount ?? 0;
                return (
                  <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {row.supplierNumber || row.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.portalUserCount} portal · {shopCount} shop{shopCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {statusBadge(row.status)}
                      <Button type="button" size="sm" variant="outline" onClick={() => void openSupplier(row)}>
                        Manage
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Portal</th>
              <th className="px-3 py-2 font-medium">Tenant shops</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? null : (
              visibleRows.map((row) => {
                const shopCount = row.linkedShopCount ?? 0;
                const shopNames = row.linkedShopNames ?? [];
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">{row.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <span>{row.supplierNumber || row.id.slice(0, 8)}</span>
                        {row.supplierNumber ? (
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-muted"
                            aria-label="Copy supplier number"
                            onClick={() => void copyText(row.supplierNumber!, "Supplier number")}
                          >
                            <Copy className="size-3" />
                          </button>
                        ) : null}
                        {row.username ? (
                          <a
                            href={`/s/${encodeURIComponent(row.username)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-foreground/70 hover:text-foreground"
                          >
                            @{row.username}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground/80">no hub username</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      <div>{row.contactPhone || "—"}</div>
                      <div className="truncate max-w-[14rem]">{row.contactEmail || "—"}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-muted-foreground" aria-hidden />
                        <span className="tabular-nums">{row.portalUserCount}</span>
                        <span className="text-muted-foreground">
                          {row.portalUserCount === 1 ? "user" : "users"}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {row.portalUserCount > 0
                          ? `Last login ${formatWhen(row.lastPortalLoginAt)}`
                          : "Invite needed"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" aria-hidden />
                        <span className="tabular-nums">{shopCount}</span>
                        <span className="text-muted-foreground">{shopCount === 1 ? "shop" : "shops"}</span>
                      </div>
                      <div className="mt-1 max-w-[12rem] truncate text-[11px] text-muted-foreground">
                        {shopNames.length > 0
                          ? shopNames.join(" · ")
                          : shopCount > 0
                            ? "Linked tenants"
                            : "Not linked yet"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">{statusBadge(row.status)}</td>
                    <td className="px-3 py-3 align-top text-muted-foreground">{formatWhen(row.updatedAt)}</td>
                    <td className="px-3 py-3 align-top text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => void openSupplier(row)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
            </div>
          </>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2 sm:px-5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </SaSection>

      <SuperAdminDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create marketplace identity"
        description="Draft platform supplier. Tenants can attach by S-number; you can invite them to the portal after."
        width="wide"
      >
        <form className="space-y-4" onSubmit={(e) => void onCreate(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="ms-create-name">Name</Label>
            <Input
              id="ms-create-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Coastal Care Supplies"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-create-phone">Phone</Label>
              <Input
                id="ms-create-phone"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="2547…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-create-email">Email</Label>
              <Input
                id="ms-create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="hello@supplier.example"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-create-desc">Notes</Label>
            <Input
              id="ms-create-desc"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Optional context for support"
            />
          </div>
          {createError ? <AuthAlert variant="error">{createError}</AuthAlert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create draft"}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SuperAdminDrawer>

      <SuperAdminDrawer
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selectedLabel}
        description="Tenant links, portal invites, users, and session controls."
        width="wide"
      >
        {selected ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(selected.status)}
                    <span className="font-mono text-xs text-muted-foreground">
                      {selected.supplierNumber || selected.id}
                    </span>
                    {selected.supplierNumber ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => void copyText(selected.supplierNumber!, "Supplier number")}
                      >
                        <Copy className="size-3" />
                        Copy number
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Created {formatWhen(selected.createdAt)} · Updated {formatWhen(selected.updatedAt)}
                  </p>
                  {selected.username ? (
                    <a
                      href={`/s/${encodeURIComponent(selected.username)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-foreground underline-offset-2 hover:underline"
                    >
                      Public hub /s/{selected.username}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No public hub username claimed yet.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
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
                      Activate
                    </Button>
                  ) : (
                    <>
                      {selected.status.toLowerCase() === "draft" ? (
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
                          <Check className="mr-1 size-3.5" />
                          Activate
                        </Button>
                      ) : null}
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
                        Suspend
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <div>{selected.contactPhone || "—"}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="break-all">{selected.contactEmail || "—"}</div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Tenant shops</h3>
                <span className="text-xs text-muted-foreground">
                  {shops.length} link{shops.length === 1 ? "" : "s"} · as named by each tenant
                </span>
              </div>
              {shopsError ? <AuthAlert variant="error">{shopsError}</AuthAlert> : null}
              {shops.length === 0 && !shopsError ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No tenant has linked this identity yet. Shops appear here when a business adds or attaches this
                  supplier.
                </p>
              ) : (
                <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                  {shops.map((shop) => (
                    <li key={shop.connectionId} className="px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{shop.businessName}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Local name: <span className="text-foreground">{shop.localSupplierName}</span>
                            {shop.businessSlug ? ` · ${shop.businessSlug}` : null}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Linked {formatWhen(shop.linkedAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {connectionBadge(shop.connectionStatus)}
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link
                              href={`/super-admin/businesses/${encodeURIComponent(shop.businessId)}?name=${encodeURIComponent(shop.businessName)}`}
                            >
                              Open tenant
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <UserPlus className="size-3.5" aria-hidden />
                Invite to portal
              </h3>
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
                {inviteResult ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = inviteResult.split("\n").at(-1);
                      if (url) void copyText(url, "Claim URL");
                    }}
                  >
                    <Copy className="mr-1 size-3.5" />
                    Copy claim URL
                  </Button>
                ) : null}
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
                <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                  {users.map((user) => (
                    <li key={user.id} className="px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.phone || "—"} · {user.email || "—"} · {user.roleKey}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Last login {formatWhen(user.lastLoginAt)} · Created {formatWhen(user.createdAt)}
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

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Store,
  UserPlus,
} from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
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
import { cn } from "@/lib/utils";

import {
  MarketplaceSuppliersTheatre,
  type PortalFilter,
  type ShopFilter,
  type SortKey,
} from "./_components/marketplace-suppliers-theatre";

const PAGE_SIZE = 50;
const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") {
    return (
      <span className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
        Active
      </span>
    );
  }
  if (s === "suspended") {
    return (
      <span className="rounded-none border border-[#9a2e16]/35 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[#9a2e16]">
        Suspended
      </span>
    );
  }
  if (s === "draft") {
    return (
      <span
        className={cn(
          "rounded-none border bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground",
          HAIRLINE,
        )}
      >
        Draft
      </span>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function connectionBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") {
    return (
      <span className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
        Linked
      </span>
    );
  }
  if (s === "suspended") {
    return (
      <span className="rounded-none border border-[#9a2e16]/35 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[#9a2e16]">
        Suspended
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-none border bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground",
        HAIRLINE,
      )}
    >
      {status}
    </span>
  );
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
  const [booting, setBooting] = useState(true);
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
  const [resetPasswordByUser, setResetPasswordByUser] = useState<
    Record<string, string>
  >({});
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
      setLoadError(
        e instanceof Error ? e.message : "Could not load marketplace suppliers.",
      );
    } finally {
      setBooting(false);
    }
  }, [page, search, sort, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const portalUsers = row.portalUserCount ?? 0;
      const linkedShops = row.linkedShopCount ?? 0;
      if (portalFilter === "has_users" && portalUsers < 1) return false;
      if (portalFilter === "needs_invite" && portalUsers > 0) return false;
      if (shopFilter === "linked" && linkedShops < 1) return false;
      if (shopFilter === "orphan" && linkedShops > 0) return false;
      return true;
    });
  }, [portalFilter, rows, shopFilter]);

  const loadUsers = useCallback(async (supplierId: string) => {
    setUsersError("");
    try {
      setUsers(await fetchSaMarketplaceSupplierUsers(supplierId));
    } catch (e) {
      setUsers([]);
      setUsersError(
        e instanceof Error ? e.message : "Could not load portal users.",
      );
    }
  }, []);

  const loadShops = useCallback(async (supplierId: string) => {
    setShopsError("");
    try {
      setShops(await fetchSaMarketplaceSupplierShops(supplierId));
    } catch (e) {
      setShops([]);
      setShopsError(
        e instanceof Error ? e.message : "Could not load linked shops.",
      );
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

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      showThemedSuccessToast(label);
      if (selected) {
        await Promise.all([
          loadUsers(selected.id),
          loadShops(selected.id),
          reload(),
        ]);
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

  const manageBody = selected ? (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {statusBadge(selected.status)}
              <span className="font-mono text-[11px] text-muted-foreground">
                {selected.supplierNumber || selected.id}
              </span>
              {selected.supplierNumber ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    void copyText(selected.supplierNumber!, "Supplier number")
                  }
                >
                  <Copy className="size-3" aria-hidden />
                  Copy number
                </button>
              ) : null}
            </div>
            <p className={cn(dashboardHintClass(), "mt-2")}>
              Created {formatWhen(selected.createdAt)} · Updated{" "}
              {formatWhen(selected.updatedAt)}
            </p>
            {selected.username ? (
              <a
                href={`/s/${encodeURIComponent(selected.username)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[13px] text-foreground underline-offset-2 hover:underline"
              >
                Public hub /s/{selected.username}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <p className={cn(dashboardHintClass(), "mt-1")}>
                No public hub username claimed yet.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.status.toLowerCase() === "suspended" ? (
              <Button
                type="button"
                size="sm"
                className={PRIMARY_BTN}
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
                    className={PRIMARY_BTN}
                    disabled={busy}
                    onClick={() =>
                      void runAction("Supplier activated", async () => {
                        await activateSaMarketplaceSupplier(selected.id);
                      })
                    }
                  >
                    <Check className="mr-1 size-3.5" aria-hidden />
                    Activate
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8 rounded-none"
                  disabled={busy}
                  onClick={() => {
                    showThemedConfirmToast({
                      id: `suspend-marketplace-supplier-${selected.id}`,
                      title: "Suspend this marketplace supplier?",
                      description:
                        "All portal sessions will be revoked and login will be blocked.",
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
        <div className={cn("grid gap-2 border bg-white p-3 text-[13px] sm:grid-cols-2", HAIRLINE)}>
          <div>
            <p className={dashboardLabelClass()}>Phone</p>
            <div>{selected.contactPhone || "—"}</div>
          </div>
          <div>
            <p className={dashboardLabelClass()}>Email</p>
            <div className="break-all">{selected.contactEmail || "—"}</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold tracking-[-0.015em]">
            Tenant shops
          </h3>
          <span className={dashboardHintClass()}>
            {shops.length} link{shops.length === 1 ? "" : "s"}
          </span>
        </div>
        {shopsError ? <DashboardFeedback kind="error" text={shopsError} /> : null}
        {shops.length === 0 && !shopsError ? (
          <p
            className={cn(
              "border border-dashed px-3 py-3 text-[12px] text-muted-foreground",
              HAIRLINE,
            )}
          >
            No tenant has linked this identity yet.
          </p>
        ) : (
          <ul className={cn("divide-y border bg-white", HAIRLINE)}>
            {shops.map((shop) => (
              <li key={shop.connectionId} className="px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold tracking-[-0.015em]">
                      {shop.businessName}
                    </div>
                    <div className={cn(dashboardHintClass(), "mt-0.5")}>
                      Local name:{" "}
                      <span className="text-foreground">{shop.localSupplierName}</span>
                      {shop.businessSlug ? ` · ${shop.businessSlug}` : null}
                    </div>
                    <div className={cn(dashboardHintClass(), "mt-1")}>
                      Linked {formatWhen(shop.linkedAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {connectionBadge(shop.connectionStatus)}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-none"
                      asChild
                    >
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
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.015em]">
          <UserPlus className="size-3.5" aria-hidden />
          Invite to portal
        </h3>
        <div className="flex flex-wrap gap-2">
          <Input
            className={cn(dashboardInputClass(), "max-w-xs")}
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
            placeholder="Phone (optional)"
          />
          <Button
            type="button"
            size="sm"
            className={PRIMARY_BTN}
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
              className="h-8 rounded-none"
              onClick={() => {
                const url = inviteResult.split("\n").at(-1);
                if (url) void copyText(url, "Claim URL");
              }}
            >
              <Copy className="mr-1 size-3.5" aria-hidden />
              Copy claim URL
            </Button>
          ) : null}
        </div>
        {inviteResult ? (
          <pre
            className={cn(
              "whitespace-pre-wrap border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] p-3 text-[11px]",
              HAIRLINE,
            )}
          >
            {inviteResult}
          </pre>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-[13px] font-semibold tracking-[-0.015em]">
          Create portal user
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            className={dashboardInputClass()}
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Name"
          />
          <Input
            className={dashboardInputClass()}
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="Email"
          />
          <Input
            className={dashboardInputClass()}
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Password"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          disabled={
            busy ||
            !newUserName.trim() ||
            !newUserEmail.trim() ||
            !newUserPassword
          }
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
        <h3 className="text-[13px] font-semibold tracking-[-0.015em]">
          Portal users
        </h3>
        {usersError ? <DashboardFeedback kind="error" text={usersError} /> : null}
        {users.length === 0 && !usersError ? (
          <p className={dashboardHintClass()}>No portal users yet.</p>
        ) : (
          <ul className={cn("divide-y border bg-white", HAIRLINE)}>
            {users.map((user) => (
              <li key={user.id} className="px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold tracking-[-0.015em]">
                      {user.name}
                    </div>
                    <div className={dashboardHintClass()}>
                      {user.phone || "—"} · {user.email || "—"} · {user.roleKey}
                    </div>
                    <div className={cn(dashboardHintClass(), "mt-1")}>
                      Last login {formatWhen(user.lastLoginAt)} · Created{" "}
                      {formatWhen(user.createdAt)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {user.active ? (
                        <span className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-none border border-[#9a2e16]/35 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-[#9a2e16]">
                          Suspended
                        </span>
                      )}
                      {user.lockedUntil ? (
                        <span
                          className={cn(
                            "rounded-none border bg-transparent px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-muted-foreground",
                            HAIRLINE,
                          )}
                        >
                          Locked
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {user.active ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-none"
                        disabled={busy}
                        onClick={() =>
                          void runAction("User suspended", async () => {
                            await suspendSaMarketplaceSupplierUser(
                              selected.id,
                              user.id,
                            );
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
                        className="h-8 rounded-none"
                        disabled={busy}
                        onClick={() =>
                          void runAction("User unsuspended", async () => {
                            await unsuspendSaMarketplaceSupplierUser(
                              selected.id,
                              user.id,
                            );
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
                      className="h-8 rounded-none"
                      disabled={busy}
                      onClick={() =>
                        void runAction("Sessions revoked", async () => {
                          await forceLogoutSaMarketplaceSupplierUser(
                            selected.id,
                            user.id,
                          );
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
                        className="h-8 rounded-none"
                        disabled={busy}
                        onClick={() =>
                          void runAction("User unlocked", async () => {
                            await unlockSaMarketplaceSupplierUser(
                              selected.id,
                              user.id,
                            );
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
                    className={cn(dashboardInputClass(), "max-w-xs")}
                    value={resetPasswordByUser[user.id] ?? ""}
                    onChange={(e) =>
                      setResetPasswordByUser((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    placeholder="New password"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className={PRIMARY_BTN}
                    disabled={
                      busy || !(resetPasswordByUser[user.id] ?? "").trim()
                    }
                    onClick={() =>
                      void runAction("Password reset", async () => {
                        await resetSaMarketplaceSupplierUserPassword(
                          selected.id,
                          user.id,
                          (resetPasswordByUser[user.id] ?? "").trim(),
                        );
                        setResetPasswordByUser((prev) => ({
                          ...prev,
                          [user.id]: "",
                        }));
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
  ) : null;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Store}
        eyebrow="Platform"
        title="Marketplace"
        description="Supplier identities, portal invites, and which shops each one serves."
      >
        <button
          type="button"
          disabled={busy || booting}
          onClick={() => void reload()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh marketplace suppliers"
        >
          <RefreshCw
            className={cn("size-3.5", (busy || booting) && "animate-spin")}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          size="sm"
          className={cn(PRIMARY_BTN, "gap-1.5")}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden />
          New identity
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}

      <MarketplaceSuppliersTheatre
        rows={visibleRows}
        stats={stats}
        loading={booting}
        busy={busy}
        totalElements={totalElements}
        totalPages={totalPages}
        page={page}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(0);
        }}
        portalFilter={portalFilter}
        onPortalFilterChange={setPortalFilter}
        shopFilter={shopFilter}
        onShopFilterChange={setShopFilter}
        sort={sort}
        onSortChange={(value) => {
          setSort(value);
          setPage(0);
        }}
        onPageChange={setPage}
        selected={selected}
        onSelect={(row) => void openSupplier(row)}
        onClearSelection={() => setSelected(null)}
        drawerBody={manageBody}
      />

      <FormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create marketplace identity"
        description="Draft platform supplier. Tenants can attach by S-number; invite them to the portal after."
        contextLabel="Marketplace"
        headerDensity="compact"
        appearance="sharp"
        width="wide"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form="ms-create-form"
              className={PRIMARY_BTN}
              disabled={busy}
            >
              {busy ? "Creating…" : "Create draft"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <form
          id="ms-create-form"
          className="space-y-4"
          onSubmit={(e) => void onCreate(e)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ms-create-name" className={dashboardLabelClass()}>
              Name
            </Label>
            <Input
              id="ms-create-name"
              className={dashboardInputClass()}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Coastal Care Supplies"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ms-create-phone" className={dashboardLabelClass()}>
                Phone
              </Label>
              <Input
                id="ms-create-phone"
                className={dashboardInputClass()}
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                placeholder="2547…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-create-email" className={dashboardLabelClass()}>
                Email
              </Label>
              <Input
                id="ms-create-email"
                className={dashboardInputClass()}
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="hello@supplier.example"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-create-desc" className={dashboardLabelClass()}>
              Notes
            </Label>
            <Input
              id="ms-create-desc"
              className={dashboardInputClass()}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Optional context for support"
            />
          </div>
          {createError ? (
            <DashboardFeedback kind="error" text={createError} />
          ) : null}
        </form>
      </FormDrawer>
    </div>
  );
}

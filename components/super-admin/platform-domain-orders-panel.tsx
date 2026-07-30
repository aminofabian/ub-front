"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  attachSaDomainOrderHostafrica,
  fetchSaDomainOrders,
  markSaDomainOrderNsActive,
  markSaDomainOrderPaid,
  refreshSaDomainOrderRegisterUrl,
  syncSaDomainOrder,
  syncSaOpenDomainOrders,
  type SaDomainOrderRecord,
} from "@/lib/super-admin-api";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "registering", label: "Registering" },
  { value: "owned", label: "Owned" },
  { value: "provisioning", label: "Provisioning" },
  { value: "live", label: "Live" },
  { value: "failed", label: "Failed" },
] as const;

function formatPrice(cents: number | null | undefined, currency: string | null | undefined): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  const cur = (currency || "KES").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  let className = "bg-muted text-muted-foreground";
  if (s === "live") className = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  else if (s === "failed") className = "bg-destructive/15 text-destructive";
  else if (s === "awaiting_payment") className = "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  else if (s === "registering" || s === "owned" || s === "provisioning") {
    className = "bg-sky-500/15 text-sky-900 dark:text-sky-200";
  }
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PlatformDomainOrdersPanel() {
  const [rows, setRows] = useState<SaDomainOrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [haDraft, setHaDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const list = await fetchSaDomainOrders(statusFilter || undefined);
      setRows(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load domain orders.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (orderId: string, label: string, fn: () => Promise<SaDomainOrderRecord>) => {
    setBusyId(orderId);
    setActionError("");
    setSuccess("");
    try {
      const updated = await fn();
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSuccess(`${label}: ${updated.fqdn} → ${updated.status}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `${label} failed.`);
    } finally {
      setBusyId(null);
    }
  };

  const onMarkPaid = (row: SaDomainOrderRecord) => {
    showThemedConfirmToast({
      title: `Mark ${row.fqdn} paid?`,
      description: "Moves awaiting payment → registering. Use until Palmart wallet billing is wired.",
      confirmLabel: "Mark paid",
      onConfirm: () => void runAction(row.id, "Marked paid", () => markSaDomainOrderPaid(row.id)),
    });
  };

  const onSyncOpen = async () => {
    setBusyId("__sync_open__");
    setActionError("");
    setSuccess("");
    try {
      const result = await syncSaOpenDomainOrders();
      setSuccess(`Synced open orders (advanced ${result.advanced}).`);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Sync open failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ops queue for Kenyan TLD purchases. After merchant pay (or Mark paid), open HostAfrica register_url on the
        platform account, then Sync. Vercel DNS + NS cutover run automatically once owned.
      </p>

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {actionError ? <AuthAlert variant="error">{actionError}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value || "all"}
              type="button"
              size="sm"
              variant={statusFilter === f.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!!busyId} onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            Reload
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!!busyId}
            onClick={() => void onSyncOpen()}
          >
            {busyId === "__sync_open__" ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
            ) : null}
            Sync all open
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} order${rows.length === 1 ? "" : "s"}`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No domain orders match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const s = row.status.toLowerCase();
                  const busy = busyId === row.id;
                  return (
                    <tr key={row.id} className="border-b last:border-0 align-top hover:bg-muted/20">
                      <td className="px-3 py-3">
                        <div className="font-mono text-sm font-medium">{row.fqdn}</div>
                        {row.hostafricaDomainId ? (
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            HA {row.hostafricaDomainId}
                          </div>
                        ) : null}
                        {row.lastError ? (
                          <div className="mt-1 max-w-[16rem] text-[11px] text-destructive/90">{row.lastError}</div>
                        ) : null}
                        {row.registerUrl ? (
                          <a
                            href={row.registerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Open HostAfrica register checkout
                          </a>
                        ) : s === "registering" ? (
                          <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
                            No register_url yet — refresh below
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{row.businessName || "—"}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {row.businessSlug || row.businessId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {statusBadge(row.status)}
                          {row.nsStatus ? (
                            <span className="text-[11px] text-muted-foreground">NS {row.nsStatus}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {formatPrice(row.priceCents, row.currency)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatWhen(row.updatedAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {(s === "awaiting_payment" || s === "quoted") && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => onMarkPaid(row)}
                              >
                                Mark paid
                              </Button>
                            )}
                            {s === "registering" ? (
                              <>
                                {row.registerUrl ? (
                                  <Button type="button" size="sm" asChild>
                                    <a href={row.registerUrl} target="_blank" rel="noreferrer">
                                      Open HA register
                                    </a>
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(row.id, "Register URL", () =>
                                      refreshSaDomainOrderRegisterUrl(row.id),
                                    )
                                  }
                                >
                                  Refresh register URL
                                </Button>
                              </>
                            ) : null}
                            {s !== "live" && s !== "failed" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(row.id, "Synced", () => syncSaDomainOrder(row.id))
                                }
                              >
                                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Sync"}
                              </Button>
                            ) : null}
                            {s !== "live" &&
                            s !== "registering" &&
                            s !== "awaiting_payment" &&
                            row.nsStatus?.toLowerCase() !== "active" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(row.id, "NS active", () => markSaDomainOrderNsActive(row.id))
                                }
                              >
                                Mark NS active
                              </Button>
                            ) : null}
                          </div>
                          {!row.hostafricaDomainId && s !== "live" && s !== "failed" ? (
                            <div className="flex max-w-xs gap-1.5">
                              <Input
                                className="h-8 text-xs"
                                placeholder="HostAfrica domain id"
                                value={haDraft[row.id] || ""}
                                onChange={(e) =>
                                  setHaDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy || !(haDraft[row.id] || "").trim()}
                                onClick={() =>
                                  void runAction(row.id, "Attached HA", () =>
                                    attachSaDomainOrderHostafrica(row.id, (haDraft[row.id] || "").trim()),
                                  )
                                }
                              >
                                Attach
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

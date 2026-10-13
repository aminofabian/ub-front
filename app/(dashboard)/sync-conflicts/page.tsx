"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchSyncConflicts,
  fetchSyncConflictCount,
  resolveSyncConflictServerWins,
  resolveSyncConflictLocalWins,
  type SyncConflictRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { showConfirmModal } from "@/components/confirm-modal";

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function SyncConflictsPage() {
  const { me } = useDashboard();
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const canManage = hasPermission(
    me?.permissions,
    Permission.BusinessManageSettings,
  );

  const load = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        fetchSyncConflicts(),
        fetchSyncConflictCount(),
      ]);
      setConflicts(list);
      setPendingCount(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [canManage]);

  const resolve = async (conflictId: string, mode: "server" | "local") => {
    setResolving(conflictId);
    try {
      if (mode === "server") {
        await resolveSyncConflictServerWins(conflictId);
      } else {
        const conflict = conflicts.find((c) => c.id === conflictId);
        await resolveSyncConflictLocalWins(
          conflictId,
          conflict?.localSnapshot ?? "{}",
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolution failed");
    } finally {
      setResolving(null);
    }
  };

  if (!canManage) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        You don&apos;t have permission to manage sync conflicts.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Sync Conflicts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and resolve conflicts from offline edits that diverged from
            the server.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-none border bg-background px-3 py-1.5 text-xs font-medium shadow-none hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-none border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          {pendingCount} pending conflict{pendingCount !== 1 ? "s" : ""}{" "}
          requiring resolution.
        </div>
      )}

      {error && (
        <div className="rounded-none border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading conflicts…
        </div>
      ) : conflicts.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle className="mx-auto mb-2 size-8 text-green-500" />
          No pending sync conflicts.
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((c) => (
            <div
              key={c.id}
              className="rounded-none border bg-background p-4 shadow-none"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
                      {c.entityType}
                    </span>
                    <span className="break-all font-mono text-xs text-muted-foreground">
                      {c.entityId}
                    </span>
                    {c.resolution !== "pending" && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        {c.resolution}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Local: {c.localVersion ?? "—"} → Server:{" "}
                    {c.serverVersion ?? "—"}
                  </p>
                  {c.createdAt && (
                    <p className="text-[11px] text-muted-foreground/60">
                      Detected {new Date(c.createdAt).toLocaleString()}
                    </p>
                  )}
                  {c.localSnapshot && c.localSnapshot !== "{}" ? (
                    <details className="text-[11px] text-muted-foreground">
                      <summary className="cursor-pointer select-none">
                        This device&apos;s data
                      </summary>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all border bg-muted/30 p-2 text-[11px]">
                        {prettyJson(c.localSnapshot)}
                      </pre>
                    </details>
                  ) : null}
                </div>

                {c.resolution === "pending" && (
                  <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        showConfirmModal({
                          id: `sync-server-${c.id}`,
                          title: "Keep the server version?",
                          description:
                            "This device's unsaved changes for this record will be discarded.",
                          confirmLabel: "Keep server",
                          onConfirm: () => void resolve(c.id, "server"),
                        })
                      }
                      disabled={resolving === c.id}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-none border bg-background px-3 text-[12px] font-medium shadow-none hover:bg-muted disabled:opacity-50 sm:min-h-8 sm:flex-none sm:px-2.5"
                    >
                      <XCircle className="size-3.5" />
                      Server wins
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        showConfirmModal({
                          id: `sync-local-${c.id}`,
                          title: "Keep this device's version?",
                          description:
                            "The server's version will be overwritten by this device's changes.",
                          confirmLabel: "Keep local",
                          onConfirm: () => void resolve(c.id, "local"),
                        })
                      }
                      disabled={resolving === c.id}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-none bg-primary px-3 text-[12px] font-medium text-primary-foreground shadow-none hover:bg-primary/90 disabled:opacity-50 sm:min-h-8 sm:flex-none sm:px-2.5"
                    >
                      <CheckCircle className="size-3.5" />
                      Local wins
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  ChevronDown,
  Loader2,
  PlusCircle,
  Clock,
  User,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  cancelPosDraft,
  listPosDrafts,
  PosDraftApiError,
  type PosDraftSummaryResponse,
} from "@/lib/pos-draft-api";

type PendingSalesPanelProps = {
  onResumeDraft: (draftId: string) => void;
  /** Server draft ids already open in cart tabs — hidden from the list. */
  openDraftIds?: string[];
  refreshKey?: number;
};

export function PendingSalesPanel({
  onResumeDraft,
  openDraftIds = [],
  refreshKey = 0,
}: PendingSalesPanelProps) {
  const { branchId, me, business } = useDashboard();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<PosDraftSummaryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const firstFetchDone = useRef(false);

  const canCancelAny = hasPermission(
    me?.permissions,
    Permission.PosDraftsCancelAny,
  );
  const canCancelOwn = hasPermission(
    me?.permissions,
    Permission.PosDraftsCancelOwn,
  );
  const myId = me?.id?.trim() ?? "";

  const openDraftSet = useMemo(() => new Set(openDraftIds), [openDraftIds]);

  const fetchDrafts = useCallback(async () => {
    const bid = branchId?.trim();
    if (!bid || !online) return;
    setLoading(true);
    try {
      const result = await listPosDrafts({
        branchId: bid,
        status: "pending",
        hoursBack: 48,
      });
      const list = (result.drafts ?? []).filter((d) => !openDraftSet.has(d.id));
      setDrafts(list);
      if (!firstFetchDone.current) {
        firstFetchDone.current = true;
      }
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, [branchId, online, openDraftSet]);

  useEffect(() => {
    if (open) fetchDrafts();
  }, [open, fetchDrafts, refreshKey]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchDrafts, 30_000);
    return () => clearInterval(interval);
  }, [open, fetchDrafts]);

  const pendingCount = drafts.length;

  const handleCancel = useCallback(
    async (draft: PosDraftSummaryResponse, e: React.MouseEvent) => {
      e.stopPropagation();
      const isOwn = draft.createdBy === myId;
      if (!canCancelAny && !(canCancelOwn && isOwn)) {
        toast.error("You cannot cancel this sale.");
        return;
      }
      setCancellingId(draft.id);
      try {
        await cancelPosDraft(draft.id, "Cancelled from pending list");
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        toast.success(`Sale #${draft.ticketNumber} cancelled`);
      } catch (err) {
        const msg =
          err instanceof PosDraftApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not cancel sale";
        toast.error(msg);
      } finally {
        setCancellingId(null);
      }
    },
    [canCancelAny, canCancelOwn, myId],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <ShoppingCart className="size-3.5" />
        <span>Pending</span>
        {pendingCount > 0 && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-sm font-semibold">Pending sales</span>
              {loading && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {!online ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Go online to load pending sales.
                </p>
              ) : loading && drafts.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Loading…
                </p>
              ) : drafts.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No other pending sales at this branch.
                </p>
              ) : (
                <div className="divide-y divide-border/30">
                  {drafts.map((draft) => {
                    const canCancel =
                      canCancelAny ||
                      (canCancelOwn && draft.createdBy === myId);
                    return (
                      <div
                        key={draft.id}
                        className="flex items-start gap-2 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onResumeDraft(draft.id);
                            setOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <ClipboardList className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold text-foreground">
                                #{draft.ticketNumber}
                              </span>
                              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                {draft.lineCount}{" "}
                                {draft.lineCount === 1 ? "item" : "items"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs font-semibold text-foreground">
                              {Number(draft.grandTotal).toLocaleString("en-KE", {
                                style: "currency",
                                currency,
                              })}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <User className="size-2.5" />
                                {draft.createdByName || "Staff"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-2.5" />
                                {formatRelativeTime(draft.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <PlusCircle className="mt-1 size-4 shrink-0 text-muted-foreground" />
                        </button>
                        {canCancel && (
                          <button
                            type="button"
                            title="Cancel sale"
                            disabled={cancellingId === draft.id}
                            onClick={(e) => void handleCancel(draft, e)}
                            className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            {cancellingId === draft.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <XCircle className="size-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {drafts.length > 0 && (
              <div className="border-t border-border/40 px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    void fetchDrafts();
                    toast.success("Pending sales refreshed");
                  }}
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Refresh list
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

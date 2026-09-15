"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Clock,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  ApiRequestError,
  decideStoreRoomMovement,
  fetchStoreRoomActivity,
  type StoreRoomActivityRecord,
  type StoreRoomMovementRecord,
  type StoreRoomReason,
} from "@/lib/api";
import { DEFAULT_PROBLEM_TITLE } from "@/lib/problem";
import { cn } from "@/lib/utils";

import {
  isStockLoss,
  STORE_ROOM_REASONS,
  storeRoomReasonLabel,
} from "./store-room-movement-drawer";

type RangeKey = "today" | "week";

/**
 * The shop's local window. The server has no opinion about what "today" means here,
 * so the boundaries are computed from the browser and sent as instants.
 */
function rangeWindow(range: RangeKey): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") {
    start.setDate(start.getDate() - 6);
  }
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatQuantity(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatWhen(iso: string, range: RangeKey): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "today") return time;
  const day = at.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${day} ${time}`;
}

/**
 * "What left the store room?" — who, when, how much, why, and what still needs a
 * decision.
 *
 * The summary and the filter options come from the whole window while the list is
 * filtered, so the headline does not move when somebody narrows the list.
 */
export function StoreRoomActivity({
  reloadToken,
  onPutIn,
  onRecorded,
  canWrite,
  canDecide,
}: {
  reloadToken: number;
  onPutIn?: () => void;
  /** Called after an approve/reject so the register can re-read live counts. */
  onRecorded?: () => void;
  canWrite: boolean;
  canDecide: boolean;
}) {
  const [data, setData] = useState<StoreRoomActivityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<RangeKey>("today");
  const [reason, setReason] = useState("");
  const [actor, setActor] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { from, to } = rangeWindow(range);
    setLoading(true);
    fetchStoreRoomActivity({
      from,
      to,
      limit: 100,
      reason: reason || undefined,
      createdBy: actor || undefined,
      status: pendingOnly ? "pending" : undefined,
    })
      .then((next) => {
        setData(next);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [range, reason, actor, pendingOnly]);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const decide = async (movement: StoreRoomMovementRecord, approve: boolean) => {
    setDecidingId(movement.id);
    setDecisionError(null);
    try {
      await decideStoreRoomMovement(movement.id, approve);
      load();
      onRecorded?.();
    } catch (err) {
      setDecisionError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error && err.message.trim()
            ? err.message
            : DEFAULT_PROBLEM_TITLE,
      );
    } finally {
      setDecidingId(null);
    }
  };

  const summary = data?.summary;
  const movements = data?.movements ?? [];
  const facets = data?.facets;
  const filtersActive = Boolean(reason || actor || pendingOnly);

  /** Only reasons that actually appear, so the list is never a dead end. */
  const reasonOptions = useMemo(() => {
    if (!facets) return [];
    const known = new Map(
      STORE_ROOM_REASONS.map((option) => [option.value, option.label]),
    );
    return facets.reasons.map((facet) => ({
      value: facet.reason,
      label: known.get(facet.reason) ?? String(facet.reason).replace(/_/g, " "),
      count: facet.count,
    }));
  }, [facets]);

  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "flex min-h-0 flex-col")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            {range === "today" ? "Today in the store room" : "Last 7 days"}
          </h2>
          <p className={dashboardHintClass()}>
            {summary
              ? `${summary.takeOuts} taken out · ${summary.putIns} put in`
              : "Loading…"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canWrite && onPutIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={onPutIn}
            >
              <ArrowDownToLine className="size-3.5" aria-hidden />
              Put in
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Refresh activity"
            disabled={loading}
            onClick={load}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {summary && summary.pending > 0 ? (
        <p className="mt-2 flex items-start gap-2 border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-300">
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {summary.pending} take-out{summary.pending === 1 ? "" : "s"} waiting on a
            decision. Stock has not moved for {summary.pending === 1 ? "it" : "them"} yet.
          </span>
        </p>
      ) : null}

      {summary && Number(summary.stockLossQuantity) > 0 ? (
        <p className="mt-2 border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-[12px] leading-snug text-rose-700 dark:text-rose-400">
          {formatQuantity(summary.stockLossQuantity)} item
          {Number(summary.stockLossQuantity) === 1 ? "" : "s"} left the shop
          (spoilage, expiry, theft, staff use and the like).
        </p>
      ) : null}

      {/* Filters — options come from what the window actually contains. */}
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <select
          className={cn(dashboardSelectClass(), "h-8 text-xs")}
          value={range}
          onChange={(event) => setRange(event.target.value as RangeKey)}
          aria-label="Date range"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
        </select>
        <select
          className={cn(dashboardSelectClass(), "h-8 text-xs")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-label="Filter by reason"
        >
          <option value="">Every reason</option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
        <select
          className={cn(dashboardSelectClass(), "h-8 text-xs")}
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          aria-label="Filter by person"
        >
          <option value="">Anyone</option>
          {(facets?.actors ?? []).map((facet) => (
            <option key={facet.userId} value={facet.userId}>
              {facet.name} ({facet.count})
            </option>
          ))}
        </select>
      </div>

      {summary && summary.pending > 0 ? (
        <label className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            className="size-3.5"
            checked={pendingOnly}
            onChange={(event) => setPendingOnly(event.target.checked)}
          />
          Only what needs a decision
        </label>
      ) : null}

      {decisionError ? (
        <p className="mt-2 border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-[12px] leading-snug text-destructive">
          {decisionError}
        </p>
      ) : null}

      {failed ? (
        <p className={cn(dashboardHintClass(), "mt-3")}>
          Could not load activity.
        </p>
      ) : !loading && movements.length === 0 ? (
        <p className={cn(dashboardHintClass(), "mt-3 border-dashed py-4 text-center")}>
          {filtersActive ? "Nothing matches those filters." : "Nothing has moved yet."}
        </p>
      ) : (
        <ul className="mt-2 -mr-1 min-h-0 max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {movements.map((movement) => {
            const loss = isStockLoss(movement.stockEffect);
            const incoming = movement.direction === "in";
            const pending = movement.status === "pending";
            const rejected = movement.status === "rejected";
            const Icon = incoming ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <li
                key={movement.id}
                className="flex items-start gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] py-2 last:border-b-0"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border",
                    pending
                      ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                      : rejected
                        ? "border-[color-mix(in_srgb,var(--order-ink,#15231f)_15%,transparent)] text-muted-foreground/60"
                        : loss
                          ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                          : incoming
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_15%,transparent)] text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug">
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatQuantity(movement.quantity)}
                    </span>
                    <span className="text-muted-foreground"> × </span>
                    <span
                      className={cn(
                        "font-medium text-foreground",
                        rejected && "line-through opacity-70",
                      )}
                    >
                      {movement.storeItemName ?? movement.itemName ?? "Deleted item"}
                    </span>
                    {pending ? (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        waiting
                      </span>
                    ) : null}
                    {rejected ? (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        turned down
                      </span>
                    ) : null}
                  </p>
                  <p className={cn(dashboardHintClass(), "mt-0.5")}>
                    {storeRoomReasonLabel(movement.reason)}
                    {movement.createdByName ? ` · ${movement.createdByName}` : ""}
                    {` · ${formatWhen(movement.createdAt, range)}`}
                    {loss && movement.movementCount > 1
                      ? ` · ${movement.movementCount} stock batches`
                      : ""}
                    {movement.decidedByName
                      ? ` · decided by ${movement.decidedByName}`
                      : ""}
                  </p>
                  {movement.note ? (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-foreground/70">
                      “{movement.note}”
                    </p>
                  ) : null}
                  {pending && canDecide ? (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-[11px]"
                        disabled={decidingId === movement.id}
                        onClick={() => void decide(movement, true)}
                      >
                        {decidingId === movement.id ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : (
                          <Check className="size-3" aria-hidden />
                        )}
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                        disabled={decidingId === movement.id}
                        onClick={() => void decide(movement, false)}
                      >
                        <X className="size-3" aria-hidden />
                        Turn down
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

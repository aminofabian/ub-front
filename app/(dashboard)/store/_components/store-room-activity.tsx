"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  RotateCcw,
} from "lucide-react";

import {
  DASHBOARD_SECTION_SURFACE,
  dashboardHintClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchStoreRoomActivity,
  type StoreRoomActivityRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import { isStockLoss, storeRoomReasonLabel } from "./store-room-movement-drawer";

/**
 * The shop's local day. The server has no opinion about what "today" means here, so
 * the window is computed from the browser's own midnight and sent as instants.
 */
function localDayWindow(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatQuantity(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * "What left the store room today?" — who, when, how much, and why.
 *
 * Reloads when the parent bumps `reloadToken`, so a take-out recorded in the drawer
 * lands here immediately.
 */
export function StoreRoomActivity({
  reloadToken,
  onPutIn,
  canWrite,
}: {
  reloadToken: number;
  onPutIn?: () => void;
  canWrite: boolean;
}) {
  const [data, setData] = useState<StoreRoomActivityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    const { from, to } = localDayWindow();
    setLoading(true);
    fetchStoreRoomActivity({ from, to, limit: 100 })
      .then((next) => {
        setData(next);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  const movements = data?.movements ?? [];
  const summary = data?.summary;

  return (
    <div className={cn(DASHBOARD_SECTION_SURFACE, "flex min-h-0 flex-col")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
            Today in the store room
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

      {summary && Number(summary.stockLossQuantity) > 0 ? (
        <p className="mt-2 border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-[12px] leading-snug text-rose-700 dark:text-rose-400">
          {formatQuantity(summary.stockLossQuantity)} item
          {Number(summary.stockLossQuantity) === 1 ? "" : "s"} left the shop today
          (spoilage, expiry, theft, staff use and the like).
        </p>
      ) : null}

      {failed ? (
        <p className={cn(dashboardHintClass(), "mt-3")}>
          Could not load today&apos;s activity.
        </p>
      ) : !loading && movements.length === 0 ? (
        <p className={cn(dashboardHintClass(), "mt-3 border-dashed py-4 text-center")}>
          Nothing has moved yet today.
        </p>
      ) : (
        <ul className="mt-2 -mr-1 min-h-0 max-h-72 space-y-0.5 overflow-y-auto pr-1">
          {movements.map((movement) => {
            const loss = isStockLoss(movement.stockEffect);
            const incoming = movement.direction === "in";
            const Icon = incoming ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <li
                key={movement.id}
                className="flex items-start gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] py-2 last:border-b-0"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center border",
                    loss
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
                    <span className="font-medium text-foreground">
                      {movement.storeItemName ?? movement.itemName ?? "Deleted item"}
                    </span>
                  </p>
                  <p className={cn(dashboardHintClass(), "mt-0.5")}>
                    {storeRoomReasonLabel(movement.reason)}
                    {movement.createdByName
                      ? ` · ${movement.createdByName}`
                      : movement.createdBy
                        ? " · unknown"
                        : ""}
                    {` · ${formatTime(movement.createdAt)}`}
                    {loss && movement.movementCount > 1
                      ? ` · ${movement.movementCount} stock batches`
                      : ""}
                  </p>
                  {movement.note ? (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-foreground/70">
                      “{movement.note}”
                    </p>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Link2Off,
  PackageX,
  TriangleAlert,
} from "lucide-react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchStoreRoomActivity,
  type StoreItemRecord,
  type StoreRoomActivityRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import { storeItemCount } from "../_lib/store-item-count";

function todayWindow(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100);
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const day = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Math.round((day.getTime() - start.getTime()) / 86_400_000);
}

type AttentionRow = {
  id: string;
  label: string;
  detail: string;
  tone: "amber" | "rose" | "muted";
  icon: typeof PackageX;
  onClick?: () => void;
};

/**
 * Middle-column overview when nothing is selected — a quiet read of the room
 * before you dig into one product's history.
 */
export function StoreRoomPulse({
  rows,
  connected,
  reloadToken,
  onPutIn,
  onSelect,
  onShowUnlinked,
  className,
}: {
  rows: StoreItemRecord[];
  connected: boolean;
  reloadToken: number;
  onPutIn?: () => void;
  onSelect: (row: StoreItemRecord) => void;
  onShowUnlinked?: () => void;
  className?: string;
}) {
  const [activity, setActivity] = useState<StoreRoomActivityRecord | null>(
    null,
  );
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = todayWindow();
    setLoadingActivity(true);
    fetchStoreRoomActivity({ from, to, limit: 80 })
      .then((next) => {
        if (!cancelled) {
          setActivity(next);
        }
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingActivity(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const pulse = useMemo(() => {
    let units = 0;
    let empty = 0;
    let low = 0;
    let unlinked = 0;
    let expiring = 0;
    let expired = 0;
    let heaviest: StoreItemRecord | null = null;
    let heaviestCount = -1;
    const emptyRows: StoreItemRecord[] = [];

    for (const row of rows) {
      const count = storeItemCount(row, connected);
      units += count;
      if (connected && !row.itemId) unlinked += 1;
      if (count <= 0) {
        empty += 1;
        emptyRows.push(row);
      } else if (count <= 3) {
        low += 1;
      }
      if (count > heaviestCount) {
        heaviestCount = count;
        heaviest = row;
      }
      const days = daysUntil(row.expiryDate);
      if (days != null) {
        if (days < 0) expired += 1;
        else if (days <= 7) expiring += 1;
      }
    }

    const takeOuts = activity?.summary.takeOuts ?? 0;
    const putIns = activity?.summary.putIns ?? 0;
    const pending = activity?.summary.pending ?? 0;
    const loss = Number(activity?.summary.stockLossQuantity ?? 0);

    return {
      lines: rows.length,
      units,
      empty,
      low,
      unlinked,
      expiring,
      expired,
      heaviest,
      heaviestCount,
      emptyRows,
      takeOuts,
      putIns,
      pending,
      loss: Number.isFinite(loss) ? loss : 0,
      needsAttention: empty + low + pending + (expired > 0 ? expired : 0),
    };
  }, [rows, connected, activity]);

  const attention: AttentionRow[] = [];
  if (pulse.empty + pulse.low > 0) {
    attention.push({
      id: "restock",
      label: "Need restock",
      detail:
        pulse.empty > 0
          ? `${pulse.empty} empty · ${pulse.low} low`
          : `${pulse.low} at three or fewer`,
      tone: "amber",
      icon: PackageX,
      onClick:
        pulse.emptyRows[0] != null
          ? () => onSelect(pulse.emptyRows[0]!)
          : undefined,
    });
  }
  if (pulse.pending > 0) {
    attention.push({
      id: "pending",
      label: "Awaiting OK",
      detail: `${formatQty(pulse.pending)} take-out${
        pulse.pending === 1 ? "" : "s"
      }`,
      tone: "amber",
      icon: ArrowUpFromLine,
    });
  }
  if (connected && pulse.unlinked > 0) {
    attention.push({
      id: "unlinked",
      label: "Unlinked",
      detail: `${formatQty(pulse.unlinked)} not on a product`,
      tone: "amber",
      icon: Link2Off,
      onClick: onShowUnlinked,
    });
  }
  if (pulse.expired + pulse.expiring > 0) {
    attention.push({
      id: "expiry",
      label: pulse.expired > 0 ? "Expired" : "Expiring",
      detail:
        pulse.expired > 0
          ? `${pulse.expired} past · ${pulse.expiring} this week`
          : `${pulse.expiring} within 7 days`,
      tone: pulse.expired > 0 ? "rose" : "amber",
      icon: TriangleAlert,
    });
  }
  if (pulse.loss > 0) {
    attention.push({
      id: "loss",
      label: "Written off",
      detail: `${formatQty(pulse.loss)} today`,
      tone: "rose",
      icon: TriangleAlert,
    });
  }

  const toneText = {
    amber: "text-amber-800 dark:text-amber-300",
    rose: "text-rose-700 dark:text-rose-400",
    muted: "text-muted-foreground",
  } as const;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-transparent",
        className,
      )}
    >
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2.5 py-2 sm:px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Room
            </h2>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>
              {pulse.needsAttention > 0
                ? `${pulse.needsAttention} to glance at`
                : "Quiet — pick a line to dig in"}
            </p>
          </div>
          {onPutIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onPutIn}
            >
              <ArrowDownToLine className="size-3.5" aria-hidden />
              Put in
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3">
        <div className="space-y-3">
          <div>
            <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
              {formatQty(pulse.units)}
              <span className="ml-1.5 text-[11px] font-medium tracking-normal text-muted-foreground">
                on hand
              </span>
            </p>
            <p className={cn(dashboardHintClass(), "mt-1.5")}>
              {formatQty(pulse.lines)} line{pulse.lines === 1 ? "" : "s"}
              {pulse.heaviest && pulse.heaviestCount > 0 ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => onSelect(pulse.heaviest!)}
                    className="underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {pulse.heaviest.name}
                  </button>
                  {` heaviest (${formatQty(pulse.heaviestCount)})`}
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] py-2 text-[12px] tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowUpFromLine className="size-3 opacity-70" aria-hidden />
              <span className="font-semibold text-foreground">
                {loadingActivity ? "…" : formatQty(pulse.takeOuts)}
              </span>
              <span>out</span>
            </span>
            <span
              className="h-3 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1">
              <ArrowDownToLine className="size-3 opacity-70" aria-hidden />
              <span className="font-semibold text-foreground">
                {loadingActivity ? "…" : formatQty(pulse.putIns)}
              </span>
              <span>in</span>
            </span>
            {!loadingActivity && pulse.pending > 0 ? (
              <>
                <span
                  className="h-3 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]"
                  aria-hidden
                />
                <span className="font-medium text-amber-800 dark:text-amber-300">
                  {formatQty(pulse.pending)} waiting
                </span>
              </>
            ) : null}
          </div>

          {attention.length > 0 ? (
            <ul className="space-y-0.5">
              {attention.map((row) => {
                const Icon = row.icon;
                const body = (
                  <>
                    <Icon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        toneText[row.tone],
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12px] font-medium leading-snug",
                          toneText[row.tone],
                        )}
                      >
                        {row.label}
                      </span>
                      <span className="block text-[11px] leading-snug text-muted-foreground">
                        {row.detail}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={row.id}>
                    {row.onClick ? (
                      <button
                        type="button"
                        onClick={row.onClick}
                        className="flex w-full items-start gap-2 px-1 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,transparent)]"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="flex items-start gap-2 px-1 py-1.5">
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {pulse.emptyRows.length > 0 ? (
            <div>
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Empty
              </p>
              <ul className="mt-1">
                {pulse.emptyRows.slice(0, 5).map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className="flex w-full items-center justify-between gap-2 px-1 py-1 text-left text-[12px] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3.5%,transparent)]"
                    >
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {row.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-[11px] text-amber-800 dark:text-amber-300">
                        0
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {pulse.emptyRows.length > 5 ? (
                <p className={cn(dashboardHintClass(), "px-1 pt-0.5")}>
                  +{pulse.emptyRows.length - 5} more
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className={cn(dashboardHintClass(), "mt-4 px-1")}>
          Select a product to see its moves.
        </p>
      </div>
    </div>
  );
}

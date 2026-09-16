"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  Link2Off,
  Package,
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

type PulseTile = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: "ink" | "teal" | "amber" | "rose" | "muted";
  icon: typeof Package;
  onClick?: () => void;
};

/**
 * Middle-column overview when nothing is selected — a quick read of the room
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

  const tiles: PulseTile[] = [
    {
      id: "lines",
      label: "Lines",
      value: formatQty(pulse.lines),
      hint: "products in the room",
      tone: "ink",
      icon: Package,
    },
    {
      id: "units",
      label: "On hand",
      value: formatQty(pulse.units),
      hint: "units counted live",
      tone: "teal",
      icon: Package,
    },
    {
      id: "out",
      label: "Taken today",
      value: loadingActivity ? "…" : formatQty(pulse.takeOuts),
      hint: "moves out of the room",
      tone: "ink",
      icon: ArrowUpFromLine,
    },
    {
      id: "in",
      label: "Put back",
      value: loadingActivity ? "…" : formatQty(pulse.putIns),
      hint: "returned to the room",
      tone: "teal",
      icon: ArrowDownToLine,
    },
    {
      id: "restock",
      label: "Need restock",
      value: formatQty(pulse.empty + pulse.low),
      hint:
        pulse.empty > 0
          ? `${pulse.empty} empty · ${pulse.low} running low`
          : pulse.low > 0
            ? "at three or fewer"
            : "everything has stock",
      tone: pulse.empty + pulse.low > 0 ? "amber" : "muted",
      icon: PackageX,
      onClick:
        pulse.emptyRows[0] != null
          ? () => onSelect(pulse.emptyRows[0]!)
          : undefined,
    },
    {
      id: "pending",
      label: "Awaiting OK",
      value: loadingActivity ? "…" : formatQty(pulse.pending),
      hint: "take-outs held for approval",
      tone: pulse.pending > 0 ? "amber" : "muted",
      icon: Clock,
    },
  ];

  if (connected && pulse.unlinked > 0) {
    tiles.push({
      id: "unlinked",
      label: "Unlinked",
      value: formatQty(pulse.unlinked),
      hint: "not following a product yet",
      tone: "amber",
      icon: Link2Off,
      onClick: onShowUnlinked,
    });
  }

  if (pulse.expired + pulse.expiring > 0) {
    tiles.push({
      id: "expiry",
      label: pulse.expired > 0 ? "Expired" : "Expiring",
      value: formatQty(pulse.expired + pulse.expiring),
      hint:
        pulse.expired > 0
          ? `${pulse.expired} past date · ${pulse.expiring} within a week`
          : "dated within 7 days",
      tone: pulse.expired > 0 ? "rose" : "amber",
      icon: TriangleAlert,
    });
  }

  if (pulse.loss > 0) {
    tiles.push({
      id: "loss",
      label: "Written off",
      value: formatQty(pulse.loss),
      hint: "spoilage, theft, staff use today",
      tone: "rose",
      icon: TriangleAlert,
    });
  }

  const toneClass: Record<PulseTile["tone"], string> = {
    ink: "text-foreground",
    teal: "text-[var(--pos-primary,#0f766e)]",
    amber: "text-amber-700",
    rose: "text-rose-700",
    muted: "text-muted-foreground",
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white", className)}>
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              Room pulse
            </h2>
            <p className={cn(dashboardHintClass(), "mt-0.5")}>
              {pulse.needsAttention > 0
                ? `${pulse.needsAttention} thing${
                    pulse.needsAttention === 1 ? "" : "s"
                  } to glance at`
                : "Quiet day — pick a line on the left to dig in"}
            </p>
          </div>
          {onPutIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-1.5 text-[11px]"
              onClick={onPutIn}
            >
              <ArrowDownToLine className="size-3.5" aria-hidden />
              Put in
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3">
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const body = (
              <>
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {tile.label}
                  </span>
                  <Icon
                    className={cn("size-3.5 shrink-0", toneClass[tile.tone])}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "mt-1.5 block text-[1.45rem] font-semibold leading-none tracking-[-0.03em] tabular-nums",
                    toneClass[tile.tone],
                  )}
                >
                  {tile.value}
                </span>
                <span className={cn(dashboardHintClass(), "mt-1 block leading-snug")}>
                  {tile.hint}
                </span>
              </>
            );
            return tile.onClick ? (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                className="bg-white px-2.5 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]"
              >
                {body}
              </button>
            ) : (
              <div key={tile.id} className="bg-white px-2.5 py-2.5">
                {body}
              </div>
            );
          })}
        </div>

        {pulse.heaviest && pulse.heaviestCount > 0 ? (
          <button
            type="button"
            onClick={() => onSelect(pulse.heaviest!)}
            className="mt-2 flex w-full items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-2.5 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,white)]"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Heaviest line
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-foreground">
                {pulse.heaviest.name}
              </span>
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--pos-primary,#0f766e)]">
              {formatQty(pulse.heaviestCount)}
            </span>
          </button>
        ) : null}

        {pulse.emptyRows.length > 0 ? (
          <div className="mt-2 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]">
            <p className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Empty — restock these
            </p>
            <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
              {pulse.emptyRows.slice(0, 6).map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row)}
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {row.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-amber-700">
                      0
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {pulse.emptyRows.length > 6 ? (
              <p className={cn(dashboardHintClass(), "px-2.5 py-1.5")}>
                +{pulse.emptyRows.length - 6} more empty
              </p>
            ) : null}
          </div>
        ) : null}

        <p className={cn(dashboardHintClass(), "mt-3 text-center")}>
          Select a product on the left to see its moves.
        </p>
      </div>
    </div>
  );
}

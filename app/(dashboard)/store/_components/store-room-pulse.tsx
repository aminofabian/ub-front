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

  const satellites = attention.slice(0, 4);
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M22 42 C 38 28, 58 22, 72 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M28 48 C 48 58, 62 52, 74 62"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M24 52 C 30 72, 48 78, 38 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {onPutIn ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute right-3 top-3 z-[2] h-8 gap-1.5 rounded-none border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] bg-white shadow-none"
          onClick={onPutIn}
        >
          <ArrowDownToLine className="size-3.5" aria-hidden />
          Put in
        </Button>
      ) : null}

      <article className={cn(card, "left-[8%] top-[22%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          On hand
        </p>
        <p
          className="mt-2 text-[2.15rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatQty(pulse.units)}
        </p>
        <p className={cn(dashboardHintClass(), "mt-2")}>
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
              {` heaviest`}
            </>
          ) : null}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] tabular-nums text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">
              {loadingActivity ? "…" : formatQty(pulse.takeOuts)}
            </span>{" "}
            out today
          </span>
          <span>
            <span className="font-semibold text-foreground">
              {loadingActivity ? "…" : formatQty(pulse.putIns)}
            </span>{" "}
            in
          </span>
        </p>
      </article>

      {satellites.map((row, index) => {
        const Icon = row.icon;
        const place =
          index === 0
            ? "right-[7%] top-[14%]"
            : index === 1
              ? "right-[10%] top-[46%]"
              : index === 2
                ? "left-[12%] bottom-[12%]"
                : "right-[18%] bottom-[10%]";
        const body = (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Watch
            </p>
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold leading-snug",
                toneText[row.tone],
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {row.label}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              {row.detail}
            </p>
          </>
        );
        return row.onClick ? (
          <button
            key={row.id}
            type="button"
            onClick={row.onClick}
            className={cn(card, place, "text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)]")}
          >
            {body}
          </button>
        ) : (
          <article key={row.id} className={cn(card, place)}>
            {body}
          </article>
        );
      })}

      {satellites.length === 0 ? (
        <article className={cn(card, "right-[10%] top-[38%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quiet
          </p>
          <p className="mt-1.5 text-[14px] font-semibold text-foreground">
            Nothing needs a glance
          </p>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            Pick a line on the left to pin it here.
          </p>
        </article>
      ) : null}
    </div>
  );
}

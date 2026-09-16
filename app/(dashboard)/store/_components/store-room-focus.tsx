"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Link2, Link2Off } from "lucide-react";

import { dashboardHintClass } from "@/components/dashboard-page-ui";
import {
  fetchItemById,
  fetchStoreRoomActivity,
  type ItemDetailRecord,
  type StoreItemRecord,
  type StoreRoomMovementRecord,
} from "@/lib/api";
import { formatMoney, resolveCurrencyCode } from "@/lib/money";
import type { SupplyPackMode } from "@/lib/supply-pack-math";
import { cn } from "@/lib/utils";

import { storeItemCount } from "../_lib/store-item-count";
import {
  catalogNativePack,
  isPacked,
  packBreakdownLabel,
  packStockEach,
  type StorePackCatalog,
} from "../_lib/store-item-pack";
import { storeRoomReasonLabel } from "./store-room-movement-drawer";

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

function weekWindow(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatWhen(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const now = new Date();
  const sameDay =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  return `${at.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

const card =
  "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

function RoomPaths() {
  return (
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
  );
}

/** Marks drawn from the barcode digits — a shelf sticker, not a scanner. */
function BarcodeMark({ value }: { value: string }) {
  const units = Array.from(value).flatMap((ch, i) => {
    const n = /\d/.test(ch) ? Number(ch) : (ch.charCodeAt(0) % 10);
    return [
      { key: `${i}-n`, w: 1 + (n % 3), gap: false },
      { key: `${i}-g`, w: n % 2 === 0 ? 1 : 2, gap: true },
    ];
  });
  const total = units.reduce((sum, u) => sum + u.w, 0) || 1;
  let x = 0;
  return (
    <svg
      viewBox={`0 0 ${total} 24`}
      className="h-8 w-full text-foreground"
      preserveAspectRatio="none"
      aria-hidden
    >
      {units.map((u) => {
        const rect = u.gap ? null : (
          <rect key={u.key} x={x} y="0" width={u.w} height="24" fill="currentColor" />
        );
        x += u.w;
        return rect;
      })}
    </svg>
  );
}

function UnitTally({ count }: { count: number }) {
  const shown = Math.min(24, Math.max(0, Math.round(count)));
  const extra = Math.max(0, Math.round(count) - 24);
  return (
    <div className="mt-3 flex items-end gap-2">
      <div className="grid grid-cols-8 gap-0.5">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5",
              i < shown
                ? "bg-[var(--pos-primary,#0f766e)]"
                : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
            )}
            aria-hidden
          />
        ))}
      </div>
      {extra > 0 ? (
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          +{formatQty(extra)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Middle-column read of one product — same paper as the room pulse, pinned
 * to the line you just picked.
 */
export function StoreRoomFocus({
  row,
  rows,
  connected,
  currency,
  packCatalog,
  packMode,
  reloadToken,
  className,
}: {
  row: StoreItemRecord;
  rows: StoreItemRecord[];
  connected: boolean;
  currency: string;
  packCatalog: StorePackCatalog | null;
  packMode: SupplyPackMode | null;
  reloadToken: number;
  className?: string;
}) {
  const [catalog, setCatalog] = useState<ItemDetailRecord | null>(null);
  const [moves, setMoves] = useState<StoreRoomMovementRecord[]>([]);

  const count = storeItemCount(row, connected);
  const code = resolveCurrencyCode(currency);
  const breakdownPack = isPacked(packMode)
    ? packMode
    : catalogNativePack(packCatalog);
  const onHandEach = packStockEach(count, packCatalog);
  const onHandBreakdown = packBreakdownLabel(onHandEach, breakdownPack);

  const roomShare = useMemo(() => {
    let units = 0;
    for (const item of rows) units += storeItemCount(item, connected);
    return units > 0 ? count / units : 0;
  }, [rows, connected, count]);

  const days = daysUntil(row.expiryDate);
  const linked = connected && row.itemId != null;
  const buy =
    row.buyingPrice == null || row.buyingPrice === ""
      ? null
      : formatMoney(row.buyingPrice, code);
  const sell =
    catalog?.bundlePrice == null || catalog.bundlePrice === ""
      ? null
      : formatMoney(catalog.bundlePrice, code);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = weekWindow();
    fetchStoreRoomActivity({ from, to, limit: 80 })
      .then((next) => {
        if (cancelled) return;
        setMoves(
          (next.movements ?? []).filter((move) => move.storeItemId === row.id),
        );
      })
      .catch(() => {
        if (!cancelled) setMoves([]);
      });
    return () => {
      cancelled = true;
    };
  }, [row.id, reloadToken]);

  useEffect(() => {
    const itemId = row.itemId?.trim();
    if (!itemId) {
      setCatalog(null);
      return;
    }
    let cancelled = false;
    fetchItemById(itemId, { toast: false })
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      });
    return () => {
      cancelled = true;
    };
  }, [row.itemId]);

  const thumb = catalog?.thumbnailUrl?.trim() || null;
  const recent = moves.slice(0, 3);
  const outQty = moves
    .filter((m) => m.direction === "out" && m.status === "applied")
    .reduce((sum, m) => sum + Number(m.quantity), 0);
  const inQty = moves
    .filter((m) => m.direction === "in" && m.status === "applied")
    .reduce((sum, m) => sum + Number(m.quantity), 0);

  let shelf = "No expiry marked";
  if (days != null) {
    if (days < 0) shelf = `Expired ${formatQty(Math.abs(days))} day${Math.abs(days) === 1 ? "" : "s"} ago`;
    else if (days === 0) shelf = "Expires today";
    else shelf = `${formatQty(days)} day${days === 1 ? "" : "s"} left`;
  }

  const sharePct = Math.round(roomShare * 100);

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <RoomPaths />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]"
        aria-hidden
      >
        <div
          className="h-full bg-[var(--pos-primary,#0f766e)]"
          style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
        />
      </div>

      <article className={cn(card, "left-[7%] top-[12%] w-[min(20rem,calc(100%-1.75rem))]")}>
        <div className="flex items-start gap-3">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="size-14 shrink-0 object-cover"
            />
          ) : (
            <span
              className="grid size-14 shrink-0 place-items-center border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-[1.35rem] font-semibold text-[var(--pos-primary,#0f766e)]"
              style={{ fontFamily: "var(--font-heading)" }}
              aria-hidden
            >
              {row.name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p
              className="text-[1.2rem] font-semibold leading-tight tracking-[-0.03em] text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {row.name}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {linked
                ? row.inventoryItemName ?? catalog?.name ?? "Following inventory"
                : connected
                  ? "Not on a till product"
                  : "Back-room count"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p
              className="text-[2.35rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {formatQty(onHandBreakdown ? onHandEach : count)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {onHandBreakdown ?? "on hand"}
            </p>
          </div>
          <p className="max-w-[9rem] text-right text-[11px] leading-snug text-muted-foreground">
            {sharePct > 0
              ? `${sharePct}% of the room`
              : "None of the room"}
          </p>
        </div>
        <UnitTally count={count} />
      </article>

      {row.barcode ? (
        <article className={cn(card, "right-[7%] top-[10%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Barcode
          </p>
          <div className="mt-2">
            <BarcodeMark value={row.barcode} />
          </div>
          <p className="mt-1.5 font-mono text-[11px] tabular-nums tracking-[0.12em] text-foreground">
            {row.barcode}
          </p>
        </article>
      ) : (
        <article className={cn(card, "right-[7%] top-[10%]")}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Barcode
          </p>
          <p className="mt-1.5 text-[14px] font-semibold text-foreground">
            None on this line
          </p>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            Add one in the editor if you scan this bag.
          </p>
        </article>
      )}

      <article className={cn(card, "right-[9%] top-[42%]")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {linked ? "On the till" : "In this room"}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
          {linked ? (
            <Link2 className="size-3.5 shrink-0 text-[var(--pos-primary,#0f766e)]" aria-hidden />
          ) : (
            <Link2Off className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          {linked ? "Counts follow sales" : "Typed by hand"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          {[
            catalog?.sku ? `SKU ${catalog.sku}` : null,
            catalog?.aisleName ? catalog.aisleName : null,
            catalog?.size ? catalog.size : null,
            buy ? `Buy ${buy}` : null,
            sell ? `Sell ${sell}` : null,
          ]
            .filter(Boolean)
            .join(" · ") ||
            (linked
              ? "Live on-hand comes from inventory."
              : "Saving the number on the right writes this row.")}
        </p>
      </article>

      <article
        className={cn(
          card,
          "left-[8%] bottom-[11%]",
          days != null && days < 0 && "border-rose-500/35",
          days != null && days >= 0 && days <= 7 && "border-amber-500/40",
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Shelf life
        </p>
        <p
          className={cn(
            "mt-1.5 text-[14px] font-semibold",
            days != null && days < 0
              ? "text-rose-700 dark:text-rose-400"
              : days != null && days <= 7
                ? "text-amber-800 dark:text-amber-300"
                : "text-foreground",
          )}
        >
          {shelf}
        </p>
        {row.expiryDate ? (
          <p className={cn(dashboardHintClass(), "mt-1")}>{row.expiryDate}</p>
        ) : null}
      </article>

      <article className={cn(card, "right-[16%] bottom-[8%] w-[min(19rem,calc(100%-2rem))]")}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            This week
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{formatQty(outQty)}</span>
            {" out · "}
            <span className="font-semibold text-foreground">{formatQty(inQty)}</span>
            {" in"}
          </p>
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
            Nothing has moved through the door for this line.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {recent.map((move) => {
              const incoming = move.direction === "in";
              const Icon = incoming ? ArrowDownToLine : ArrowUpFromLine;
              return (
                <li key={move.id} className="flex items-start gap-2">
                  <Icon
                    className={cn(
                      "mt-0.5 size-3 shrink-0",
                      incoming
                        ? "text-[var(--pos-primary,#0f766e)]"
                        : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground">
                    <span className="font-semibold tabular-nums">
                      {incoming ? "+" : "−"}
                      {formatQty(Number(move.quantity))}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {storeRoomReasonLabel(move.reason)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {formatWhen(move.createdAt)}
                      {move.createdByName ? ` · ${move.createdByName}` : ""}
                      {move.status === "pending" ? " · waiting" : ""}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </div>
  );
}

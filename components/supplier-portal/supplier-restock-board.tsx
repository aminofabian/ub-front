"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import {
  downloadSupplierPortalRestockBoard,
  fetchSupplierPortalRestockBoard,
  type SupplierPortalRestockBoard,
  type SupplierPortalRestockWindow,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function fmtQty(v: unknown): string {
  const n = toNum(v);
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en", { maximumFractionDigits: 2 });
}

function fmtDay(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric" }).format(
      new Date(`${iso}T12:00:00`),
    );
  } catch {
    return iso;
  }
}

const WINDOWS: Array<{ id: SupplierPortalRestockWindow; label: string }> = [
  { id: "day", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
];

export function SupplierRestockBoard({ className }: Props) {
  const [window, setWindow] = useState<SupplierPortalRestockWindow>("week");
  const [board, setBoard] = useState<SupplierPortalRestockBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);

  const refresh = useCallback(async (w: SupplierPortalRestockWindow) => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchSupplierPortalRestockBoard({ window: w });
      setBoard(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load restock board");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(window);
  }, [window, refresh]);

  const onDownload = async (format: "pdf" | "csv") => {
    setDownloading(format);
    try {
      await downloadSupplierPortalRestockBoard({ window, format });
      toast.success(format === "pdf" ? "Restock PDF downloaded" : "Restock CSV downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !board) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
          "bg-white/85 px-4 py-5 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Building restock plan…
      </div>
    );
  }

  if (error && !board) {
    return (
      <p className={cn("border border-red-300/80 bg-red-50 px-3 py-2 text-sm text-red-800", className)}>
        {error}
      </p>
    );
  }

  if (!board) return null;

  const maxDaily = Math.max(
    1,
    ...board.daily.map((d) =>
      Math.max(toNum(d.suppliedQty), toNum(d.tillQty), toNum(d.damageQty)),
    ),
  );
  const s = board.summary;

  return (
    <section
      className={cn(
        "border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3.5 py-3 sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-[var(--pos-primary,#0f766e)]" />
            <h3 className="font-[family-name:var(--font-heading)] text-[1.15rem] font-semibold tracking-tight sm:text-[1.3rem]">
              Restock plan
            </h3>
          </div>
          <p className="mt-1 max-w-xl text-[12px] leading-snug text-muted-foreground">
            Supplied, damages, shelf stock, and what to load next
            {board.stockShopCount === 0
              ? " — ask shops to share stock for on-hand counts."
              : "."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindow(w.id)}
              className={cn(
                "h-8 border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                window === w.id
                  ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
              )}
            >
              {w.label}
            </button>
          ))}
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void onDownload("pdf")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em]",
              "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white",
              "disabled:opacity-50",
            )}
          >
            {downloading === "pdf" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            PDF run-sheet
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void onDownload("csv")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-bold uppercase tracking-[0.12em]",
              "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] text-muted-foreground",
              "disabled:opacity-50",
            )}
          >
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <Stat label="Supplied" value={`${fmtQty(s.suppliedQty)} u`} />
        <Stat label="Till sold" value={`${fmtQty(s.tillQty)} u`} hint={board.velocityShopCount ? undefined : "No share yet"} />
        <Stat label="Damages" value={`${fmtQty(s.damageQty)} u`} />
        <Stat
          label="On hand"
          value={board.stockShopCount > 0 ? `${fmtQty(s.onHandQty)} u` : "—"}
          hint={board.stockShopCount > 0 ? undefined : "Not shared"}
        />
        <Stat label="Suggested" value={`${fmtQty(s.suggestedQty)} u`} />
        <Stat
          label="Needs load"
          value={String(s.needsRestockCount)}
          hint={s.outOfStockCount > 0 ? `${s.outOfStockCount} out of stock` : undefined}
        />
      </div>

      {board.daily.length > 0 ? (
        <div className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3.5 py-3 sm:px-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Last 7 days
          </p>
          <ul className="mt-2.5 grid grid-cols-7 gap-1.5">
            {board.daily.map((d) => {
              const supplied = toNum(d.suppliedQty);
              const till = toNum(d.tillQty);
              const damage = toNum(d.damageQty);
              const hSup = Math.max(4, Math.round((supplied / maxDaily) * 56));
              const hTill = Math.max(till > 0 ? 4 : 0, Math.round((till / maxDaily) * 56));
              const hDmg = Math.max(damage > 0 ? 3 : 0, Math.round((damage / maxDaily) * 56));
              return (
                <li key={d.date} className="min-w-0 text-center">
                  <div className="flex h-16 items-end justify-center gap-0.5">
                    <span
                      className="w-2 bg-[var(--pos-primary,#0f766e)]"
                      style={{ height: `${hSup}px` }}
                      title={`Supplied ${fmtQty(supplied)}`}
                    />
                    {board.velocityShopCount > 0 ? (
                      <span
                        className="w-2 bg-amber-500/85"
                        style={{ height: `${hTill}px` }}
                        title={`Till ${fmtQty(till)}`}
                      />
                    ) : null}
                    {damage > 0 ? (
                      <span
                        className="w-1.5 bg-rose-500/80"
                        style={{ height: `${hDmg}px` }}
                        title={`Damage ${fmtQty(damage)}`}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium tabular-nums text-muted-foreground">
                    {fmtDay(d.date)}
                  </p>
                  <p className="truncate font-mono text-[10px] tabular-nums">
                    {fmtQty(supplied)}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            <span className="mr-2 inline-block size-2 bg-[var(--pos-primary,#0f766e)]" />
            Supplied
            {board.velocityShopCount > 0 ? (
              <>
                <span className="ml-3 mr-2 inline-block size-2 bg-amber-500/85" />
                Till
              </>
            ) : null}
            <span className="ml-3 mr-2 inline-block size-2 bg-rose-500/80" />
            Damage
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-3.5 py-2.5 font-bold sm:px-4">Product</th>
              <th className="px-2 py-2.5 font-bold">Shop</th>
              <th className="px-2 py-2.5 text-right font-bold">Supplied</th>
              <th className="px-2 py-2.5 text-right font-bold">Till</th>
              <th className="px-2 py-2.5 text-right font-bold">Damage</th>
              <th className="px-2 py-2.5 text-right font-bold">In store</th>
              <th className="px-2 py-2.5 text-right font-bold">Cover</th>
              <th className="px-3.5 py-2.5 text-right font-bold sm:px-4">Load next</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3.5 py-6 text-sm text-muted-foreground sm:px-4">
                  No product movement in this window yet. After you supply a shop, lines land here
                  with a suggested restock qty.
                </td>
              </tr>
            ) : (
              board.rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] last:border-b-0"
                >
                  <td className="px-3.5 py-2.5 sm:px-4">
                    <p className="font-medium leading-snug">{row.productName}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      <UrgencyChip urgency={row.urgency} />
                      {row.sku ? <span className="ml-2 normal-case tracking-normal">{row.sku}</span> : null}
                    </p>
                  </td>
                  <td className="max-w-[8rem] truncate px-2 py-2.5 text-muted-foreground">
                    {row.shopName}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                    {fmtQty(row.suppliedQty)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {row.velocityVisible ? fmtQty(row.tillQty) : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                    {toNum(row.damageQty) > 0 ? (
                      <span className="text-rose-700">{fmtQty(row.damageQty)}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">
                    {row.stockVisible ? fmtQty(row.onHand) : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {row.daysOfCover != null ? `${fmtQty(row.daysOfCover)}d` : "—"}
                  </td>
                  <td className="px-3.5 py-2.5 text-right sm:px-4">
                    <span
                      className={cn(
                        "inline-block min-w-[2.5rem] font-mono text-[13px] font-semibold tabular-nums",
                        toNum(row.suggestedRestock) > 0
                          ? "text-[var(--pos-primary,#0f766e)]"
                          : "text-muted-foreground",
                      )}
                    >
                      {fmtQty(row.suggestedRestock)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="px-3 py-2.5 sm:px-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-[family-name:var(--font-heading)] text-[1.15rem] font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function UrgencyChip({ urgency }: { urgency: string }) {
  const label =
    urgency === "out"
      ? "out"
      : urgency === "low"
        ? "low cover"
        : urgency === "plan"
          ? "plan"
          : "ok";
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[9px] font-bold tracking-wider",
        urgency === "out" && "text-rose-700",
        urgency === "low" && "text-amber-700",
        urgency === "plan" && "text-[var(--pos-primary,#0f766e)]",
        urgency === "ok" && "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

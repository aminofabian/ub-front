"use client";

import { useCallback, useState } from "react";
import { Gauge, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchPriceRadar, type PriceRadarRecord } from "@/lib/sokomind";

function money(value: number | string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function stanceLabel(stance: string): string {
  switch (stance) {
    case "missing":
      return "No shelf price";
    case "below_band":
      return "Below band";
    case "above_band":
      return "Above band";
    case "on_target":
      return "On target";
    case "in_band":
      return "In band";
    case "at_or_below_cost":
      return "At/below cost";
    default:
      return stance;
  }
}

function stanceClass(stance: string): string {
  switch (stance) {
    case "at_or_below_cost":
    case "below_band":
      return "text-amber-700 dark:text-amber-400";
    case "above_band":
      return "text-sky-700 dark:text-sky-400";
    case "on_target":
    case "in_band":
      return "text-emerald-700 dark:text-emerald-400";
    default:
      return "text-muted-foreground";
  }
}

export function PriceRadarCard({
  itemId,
  supplierId,
  branchId,
  className,
}: {
  itemId: string;
  supplierId?: string;
  branchId?: string;
  className?: string;
}) {
  const [row, setRow] = useState<PriceRadarRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const id = itemId.trim();
    if (!id) {
      setError("Item id required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await fetchPriceRadar(id, { supplierId, branchId });
      setRow(next);
    } catch (e) {
      setRow(null);
      setError(e instanceof Error ? e.message : "Price Radar unavailable.");
    } finally {
      setBusy(false);
    }
  }, [itemId, supplierId, branchId]);

  return (
    <div className={cn("rounded-xl border bg-card/60 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Gauge className="size-4" aria-hidden />
          Price Radar
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          disabled={busy || !itemId.trim()}
          onClick={() => void load()}
        >
          {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          {row ? "Refresh" : "Run"}
        </Button>
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Rule margin + global catalog recommend (Brain). Requires Brain enabled in Super Admin →
        SokoMind.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {row ? (
        <div className="space-y-2 text-sm">
          <p className={cn("text-xs font-medium uppercase tracking-wide", stanceClass(row.stance))}>
            {stanceLabel(row.stance)}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{row.rationale}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="tabular-nums">{money(row.cost)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Current</dt>
              <dd className="tabular-nums">{money(row.currentSell)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Rule suggest</dt>
              <dd className="font-medium tabular-nums">{money(row.ruleSuggestedSell)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Global sell</dt>
              <dd className="tabular-nums">{money(row.globalRecommendedSell)}</dd>
            </div>
            <div className="col-span-2 flex justify-between gap-2 border-t pt-1.5">
              <dt className="text-muted-foreground">Band</dt>
              <dd className="tabular-nums">
                {money(row.bandLow)} – {money(row.bandHigh)}
                {row.bandMid != null ? ` (mid ${money(row.bandMid)})` : ""}
              </dd>
            </div>
          </dl>
          {row.note ? <p className="text-[11px] text-muted-foreground">{row.note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

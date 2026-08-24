"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  fetchRestockPrep,
  type RestockPrepItemRecord,
  type RestockPrepRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  RestockProductTitle,
  restockProductCombinedName,
  restockProductSkuHint,
} from "../../_components/restock-product-title";

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const REASON_LABELS: Record<string, string> = {
  BELOW_MIN: "Below min",
  WILL_STOCK_OUT: "Will stock out",
  FAST_MOVER: "Fast mover",
  STOCKOUT_RECOVERY: "Recovering stock-out",
};

export default function RestockPrepPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId ?? "";
  const router = useRouter();

  const [prep, setPrep] = useState<RestockPrepRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noted, setNoted] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!runId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setPrep(await fetchRestockPrep(runId.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tonight's list.");
      setPrep(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleNoted = (id: string) => {
    setNoted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const done = noted.size;

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 p-3 sm:p-4">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-teal-500/70 to-emerald-500/70" />
        <div className="space-y-3 p-4">
          <div className="flex items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 rounded-xl px-2"
              onClick={() => router.back()}
              aria-label="Back"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-1.5 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground">
                <ClipboardList className="size-4 shrink-0 text-primary" aria-hidden />
                Tonight&apos;s list
              </h1>
              <p className="text-xs text-muted-foreground">
                {prep
                  ? `${prep.branchName} · ${formatDate(prep.runDate)} · prep view`
                  : "Loading…"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-xl px-2.5 text-xs"
              disabled={loading}
              onClick={() => void load()}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
            </Button>
          </div>

          {error ? <DashboardFeedback kind="error" text={error} /> : null}

          {loading && !prep ? (
            <div className="flex items-center justify-center gap-1.5 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : prep ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {prep.lineCount} item{prep.lineCount === 1 ? "" : "s"}
                </span>
                {done > 0 ? (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {done} packed
                  </span>
                ) : null}
              </div>

              {prep.items.length === 0 ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-6 text-center">
                  <CheckCircle2 className="mx-auto size-5 text-emerald-600" aria-hidden />
                  <p className="mt-2 text-sm font-medium text-foreground">Nothing to prep</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Everything is above its threshold for now.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {prep.items.map((item) => renderItem(item))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  function renderItem(item: RestockPrepItemRecord) {
    const isNoted = noted.has(item.itemId);
    const lowConfidence = item.confidence === "low";
    const label = restockProductCombinedName(item);
    const skuHint = restockProductSkuHint(item);
    return (
      <li
        key={item.itemId}
        className={cn(
          "flex items-start gap-2 rounded-xl border px-3 py-2.5",
          isNoted
            ? "border-emerald-500/30 bg-emerald-500/[0.06]"
            : "border-border/70 bg-background/80",
        )}
      >
        <button
          type="button"
          onClick={() => toggleNoted(item.itemId)}
          aria-pressed={isNoted}
          aria-label={isNoted ? `Mark ${label} as to pack again` : `Mark ${label} as packed`}
          className={cn(
            "mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border",
            isNoted
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-border bg-muted/40 text-transparent hover:border-foreground/30",
          )}
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <RestockProductTitle
              className={cn("min-w-0 flex-1 break-words", lowConfidence && !isNoted && "opacity-80")}
              itemName={item.itemName}
              variantName={item.variantName}
              itemSku={item.itemSku}
              size="sm"
              struck={isNoted}
            />
            <p className="shrink-0 text-lg font-bold tabular-nums leading-tight text-foreground">
              {formatQty(item.suggestedQty)}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {skuHint ? `${skuHint} · ` : ""}
            {item.evidence}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {item.reasonCode.split("+").map((r) => REASON_LABELS[r] ?? r).join(" · ")}
            </span>
            <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              on hand {formatQty(item.onHand)} · par {formatQty(item.par)}
            </span>
          </div>
        </div>
      </li>
    );
  }
}

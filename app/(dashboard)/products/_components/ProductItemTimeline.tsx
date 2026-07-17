"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Package, ScanBarcode } from "lucide-react";

import {
  fetchItemTimeline,
  type ItemTimelineEntryRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  detailCollapsibleTriggerClass,
  detailSectionClass,
  detailSectionLabelClass,
} from "./product-detail-styles";

function formatWhen(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "2-digit" }),
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function entryIcon(entry: ItemTimelineEntryRecord) {
  if (entry.eventType === "item.scanned") {
    return ScanBarcode;
  }
  if (entry.kind === "stock") {
    return Package;
  }
  return History;
}

function entryAccent(entry: ItemTimelineEntryRecord): string {
  if (entry.eventType === "item.scanned") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (entry.kind === "stock") {
    const delta = Number(entry.quantityDelta);
    if (Number.isFinite(delta) && delta < 0) {
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    }
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  }
  return "bg-muted text-muted-foreground";
}

export function ProductItemTimeline({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ItemTimelineEntryRecord[] | null>(
    null,
  );

  useEffect(() => {
    setEntries(null);
    setError(null);
    setOpen(false);
  }, [itemId]);

  useEffect(() => {
    if (!open || !itemId.trim()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchItemTimeline(itemId, { limit: 40 })
      .then((res) => {
        if (!cancelled) setEntries(res.entries ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setEntries(null);
          setError(
            e instanceof Error ? e.message : "Could not load timeline.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, itemId]);

  return (
    <section className={detailSectionClass}>
      <button
        type="button"
        className={detailCollapsibleTriggerClass}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <History
          className="size-3.5 shrink-0 text-muted-foreground/70"
          aria-hidden
        />
        <span className={detailSectionLabelClass}>Activity</span>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/40 bg-background/50 px-3 py-2.5">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading timeline…
            </div>
          ) : error ? (
            <p className="py-2 text-xs text-destructive">{error}</p>
          ) : !entries?.length ? (
            <p className="py-2 text-xs text-muted-foreground">
              No activity yet. Catalog edits, stock movements, and intentional
              scans will show up here.
            </p>
          ) : (
            <ol className="relative space-y-0">
              {entries.map((entry, idx) => {
                const Icon = entryIcon(entry);
                const last = idx === entries.length - 1;
                return (
                  <li
                    key={`${entry.kind}-${entry.id}`}
                    className="relative flex gap-2.5 pb-3 last:pb-0"
                  >
                    {!last ? (
                      <span
                        className="absolute left-[13px] top-7 bottom-0 w-px bg-border/60"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-[1] mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                        entryAccent(entry),
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">
                          {entry.title}
                        </p>
                        <time
                          dateTime={entry.createdAt}
                          className="shrink-0 text-[10px] tabular-nums text-muted-foreground"
                        >
                          {formatWhen(entry.createdAt)}
                        </time>
                      </div>
                      {entry.summary ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {entry.summary}
                        </p>
                      ) : null}
                      {entry.actorName ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                          {entry.actorName}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}

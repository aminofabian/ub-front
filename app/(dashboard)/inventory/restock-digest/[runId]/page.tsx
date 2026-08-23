"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Moon,
  PackageSearch,
  RefreshCw,
  ShoppingCart,
  X,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchRestockRun,
  postRestockRunAccept,
  postRestockSuggestionDismiss,
  postRestockSuggestionSnooze,
  type RestockCreatedPoRecord,
  type RestockRunRecord,
  type RestockSuggestionRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Feedback = { kind: "error" | "success"; text: string };

function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function formatMoney(value: number | string | null | undefined, currency = "KES"): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
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

function StatusBadge({ status }: { status: RestockRunRecord["status"] }) {
  const label =
    status === "accepted"
      ? "Accepted"
      : status === "partially_accepted"
        ? "Partly accepted"
        : status === "expired"
          ? "Expired"
          : status === "notified"
            ? "Notified"
            : "Ready to review";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "accepted"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : status === "partially_accepted"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "bg-primary/10 text-primary",
      )}
    >
      {status === "accepted" || status === "partially_accepted" ? (
        <CheckCircle2 className="size-3" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

function SuggestionBadge({
  label,
  tone,
}: {
  label: string;
  tone: "muted" | "primary" | "amber" | "emerald";
}) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "amber" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "emerald" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "muted" && "bg-muted/70 text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

const REASON_LABELS: Record<string, string> = {
  BELOW_MIN: "Below min",
  WILL_STOCK_OUT: "Will stock out",
  FAST_MOVER: "Fast mover",
  STOCKOUT_RECOVERY: "Recovering stock-out",
};

export default function RestockDigestReviewPage() {
  const params = useParams<{ runId: string }>();
  const runId = params?.runId ?? "";
  const router = useRouter();
  const { me } = useDashboard();

  const canRead =
    hasPermission(me?.permissions, Permission.PurchasingPathARead) ||
    hasPermission(me?.permissions, Permission.OrderPadRead);
  const canWritePo = hasPermission(me?.permissions, Permission.PurchasingPathAWrite);
  const canWritePad = hasPermission(me?.permissions, Permission.OrderPadWrite);

  const [run, setRun] = useState<RestockRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [createdPos, setCreatedPos] = useState<RestockCreatedPoRecord[]>([]);

  const load = useCallback(async () => {
    if (!runId.trim() || !canRead) return;
    setLoading(true);
    setFeedback(null);
    setCreatedPos([]);
    try {
      const data = await fetchRestockRun(runId.trim());
      setRun(data);
      setQty((prev) => {
        const next = { ...prev };
        for (const s of data.suggestions) {
          if (next[s.id] === undefined) {
            next[s.id] = formatQty(s.suggestedQty);
          }
        }
        return next;
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not load tonight's list.",
      });
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId, canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => (run?.suggestions ?? []).filter((s) => s.status === "pending"),
    [run],
  );
  const poLines = pending.filter((s) => s.target === "po");
  const padLines = pending.filter((s) => s.target === "pad");
  const runActive =
    run != null &&
    (run.status === "generated" ||
      run.status === "notified" ||
      run.status === "partially_accepted");

  const supplierGroups = useMemo(() => {
    const map = new Map<string, RestockSuggestionRecord[]>();
    for (const s of poLines) {
      const key = s.supplierId ?? "unassigned";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()].map(([supplierId, lines]) => ({
      supplierId,
      supplierName: lines[0]?.supplierName?.trim() || "Supplier",
      lines,
    }));
  }, [poLines]);

  const confidenceCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const s of run?.suggestions ?? []) {
      if (s.confidence in counts) counts[s.confidence as keyof typeof counts] += 1;
    }
    return counts;
  }, [run]);

  const overridesFor = useCallback(
    (ids: string[]): Record<string, number | string> | undefined => {
      const overrides: Record<string, number | string> = {};
      let changed = false;
      for (const id of ids) {
        const raw = (qty[id] ?? "").trim();
        const input = raw === "" ? Number.NaN : Number(raw);
        const suggestion = run?.suggestions.find((s) => s.id === id);
        if (!suggestion || !Number.isFinite(input)) continue;
        const suggested = Number(suggestion.suggestedQty);
        if (input !== suggested) {
          overrides[id] = input;
          changed = true;
        }
      }
      return changed ? overrides : undefined;
    },
    [qty, run],
  );

  const applyAccept = useCallback(
    (resp: { run: RestockRunRecord; purchaseOrders: RestockCreatedPoRecord[]; padLinesCreated: number; skippedLines: { itemName: string; reason: string }[] }) => {
      setRun(resp.run);
      setCreatedPos(resp.purchaseOrders);
      const parts: string[] = [];
      for (const po of resp.purchaseOrders) {
        parts.push(`PO ${po.poNumber} drafted for ${po.supplierName || "supplier"}`);
      }
      if (resp.padLinesCreated > 0) {
        parts.push(`${resp.padLinesCreated} line${resp.padLinesCreated === 1 ? "" : "s"} added to the order pad`);
      }
      if (resp.skippedLines.length > 0) {
        const first = resp.skippedLines[0];
        const more = resp.skippedLines.length > 1 ? ` (+${resp.skippedLines.length - 1} more)` : "";
        parts.push(`${first.itemName} skipped: ${first.reason}${more}`);
      }
      if (parts.length === 0) {
        parts.push("Nothing left to accept");
      }
      setFeedback({ kind: parts.some((p) => p.includes("skipped")) ? "error" : "success", text: parts.join(" · ") });
    },
    [],
  );

  async function acceptLines(ids: string[], mode: "po" | "pad" | "all") {
    if (ids.length === 0) return;
    setBusyAction(`accept:${mode}:${ids.join(",")}`);
    setFeedback(null);
    try {
      const resp = await postRestockRunAccept(runId, {
        lineIds: ids,
        qtyOverrides: overridesFor(ids),
        mode,
      });
      applyAccept(resp);
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Accept failed" });
    } finally {
      setBusyAction(null);
    }
  }

  async function dismiss(id: string) {
    setBusyAction(`dismiss:${id}`);
    setFeedback(null);
    try {
      setRun(await postRestockSuggestionDismiss(id));
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Could not dismiss" });
    } finally {
      setBusyAction(null);
    }
  }

  async function snooze(id: string) {
    setBusyAction(`snooze:${id}`);
    setFeedback(null);
    try {
      setRun(await postRestockSuggestionSnooze(id, 1));
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof Error ? e.message : "Could not snooze" });
    } finally {
      setBusyAction(null);
    }
  }

  if (!canRead) {
    return (
      <DashboardAccessDenied
        title="Tonight's list"
        description="You need purchasing or order pad access to review the nightly restock list."
      />
    );
  }

  const currency = run?.currency ?? "KES";

  return (
    <div className="mx-auto w-full max-w-lg space-y-3 p-3 sm:p-4">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-primary/70 to-emerald-500/70" />
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
                {run ? `${run.branchName} · ${formatDate(run.runDate)}` : "Loading…"}
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

          {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

          {createdPos.length > 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-2.5">
              <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                Draft purchase orders created
              </p>
              <div className="mt-1.5 space-y-1">
                {createdPos.map((po) => (
                  <Link
                    key={po.purchaseOrderId}
                    href={`/order?sid=${encodeURIComponent(po.supplierId)}`}
                    className="flex items-center gap-1 text-xs text-emerald-800 underline underline-offset-2 transition-colors hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-emerald-100"
                  >
                    <ShoppingCart className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {po.poNumber} · {po.supplierName} · {po.lineCount} line
                      {po.lineCount === 1 ? "" : "s"} — open ordering
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {loading && !run ? (
            <div className="flex items-center justify-center gap-1.5 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : run ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={run.status} />
                <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {run.lineCount} item{run.lineCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  ~{formatMoney(run.estTotal, currency)}
                </span>
              </div>

              {run.lineCount > 0 ? (
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  Confidence: {confidenceCounts.high} high · {confidenceCounts.medium} medium ·{" "}
                  {confidenceCounts.low} low
                </p>
              ) : null}

              {run.lineCount === 0 ? (
                <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-6 text-center">
                  <CheckCircle2 className="mx-auto size-5 text-emerald-600" aria-hidden />
                  <p className="mt-2 text-sm font-medium text-foreground">Nothing to order</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Everything is above its threshold for now.
                  </p>
                </div>
              ) : (
                <>
                  {run.status === "accepted" ? (
                    <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-3.5 py-2.5 text-xs text-emerald-950 dark:text-emerald-100">
                      This list is fully handled. Draft POs and order pad lines were created
                      from the accepted suggestions.
                    </p>
                  ) : null}
                  {run.status === "expired" ? (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-950 dark:text-amber-100">
                      This list expired because a newer one was generated. Its pending lines
                      can no longer be accepted — review the newest list instead.
                    </p>
                  ) : null}

                  {/* Supplier groups (target=po) */}
                  {supplierGroups.map((group) => (
                    <section key={group.supplierId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {group.supplierName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {group.lines.length} line{group.lines.length === 1 ? "" : "s"} to order
                          </p>
                        </div>
                        {canWritePo ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 shrink-0 rounded-xl px-3 text-xs"
                            disabled={busyAction !== null || !runActive}
                            onClick={() => void acceptLines(group.lines.map((l) => l.id), "po")}
                          >
                            {busyAction?.startsWith("accept:po") ? (
                              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <ShoppingCart className="mr-1.5 size-3.5" aria-hidden />
                            )}
                            Accept group
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        {group.lines.map((s) => renderLine(s))}
                      </div>
                    </section>
                  ))}

                  {/* Pad section (target=pad) */}
                  {padLines.length > 0 ? (
                    <section className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            Needs a supplier
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            No supplier link yet — lands on the order pad
                          </p>
                        </div>
                        {canWritePad ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 rounded-xl px-3 text-xs"
                            disabled={busyAction !== null || !runActive}
                            onClick={() => void acceptLines(padLines.map((l) => l.id), "pad")}
                          >
                            {busyAction?.startsWith("accept:pad") ? (
                              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <PackageSearch className="mr-1.5 size-3.5" aria-hidden />
                            )}
                            Add to order pad
                          </Button>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">{padLines.map((s) => renderLine(s))}</div>
                    </section>
                  ) : null}

                  {/* Handled lines recap */}
                  {run.suggestions.some((s) => s.status !== "pending") ? (
                    <div className="space-y-1.5 border-t border-border/60 pt-3">
                      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Handled
                      </p>
                      {run.suggestions
                        .filter((s) => s.status !== "pending")
                        .map((s) => renderLine(s))}
                    </div>
                  ) : null}

                  {/* Accept all */}
                  {pending.length > 0 && runActive && (canWritePo || canWritePad) ? (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        className="h-9 rounded-xl"
                        disabled={busyAction !== null}
                        onClick={() => void acceptLines(pending.map((l) => l.id), "all")}
                      >
                        {busyAction?.startsWith("accept:all") ? (
                          <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="mr-1.5 size-4" aria-hidden />
                        )}
                        Accept all ({pending.length})
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  function renderLine(s: RestockSuggestionRecord) {
    const busy = busyAction === `dismiss:${s.id}` || busyAction === `snooze:${s.id}`;
    const pending = s.status === "pending";
    const qtyValue = (qty[s.id] ?? formatQty(s.suggestedQty)).trim();
    const parsedQty = qtyValue === "" ? Number.NaN : Number(qtyValue);
    const edited = Number.isFinite(parsedQty) && parsedQty !== Number(s.suggestedQty);
    const lineTotal = Number.isFinite(parsedQty) && s.unitCost != null
      ? parsedQty * Number(s.unitCost)
      : null;
    const lowConfidence = s.confidence === "low";
    const actionable = pending && runActive;

    return (
      <div
        key={s.id}
        className={cn(
          "rounded-xl border px-3 py-2.5",
          s.status === "accepted"
            ? "border-emerald-500/30 bg-emerald-500/[0.06]"
            : s.status === "snoozed" || s.status === "dismissed"
              ? "border-border/60 bg-muted/20 opacity-75"
              : "border-border/70 bg-background/80",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "break-words text-sm font-medium leading-snug text-foreground",
                s.status !== "pending" && "text-muted-foreground line-through",
              )}
            >
              {s.itemName}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {s.itemSku ? `${s.itemSku} · ` : ""}
              {s.evidence}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <SuggestionBadge
                label={s.reasonCode.split("+").map((r) => REASON_LABELS[r] ?? r).join(" · ")}
                tone="primary"
              />
              <SuggestionBadge
                label={s.confidence === "high" ? "High" : s.confidence === "medium" ? "Medium" : "Low"}
                tone={s.confidence === "high" ? "emerald" : s.confidence === "medium" ? "primary" : "muted"}
              />
              {s.status === "accepted" ? (
                <SuggestionBadge
                  label={s.purchaseOrderId ? "In draft PO" : "On order pad"}
                  tone="emerald"
                />
              ) : null}
              {s.status === "snoozed" && s.snoozeUntil ? (
                <SuggestionBadge label={`Snoozed until ${formatDate(s.snoozeUntil)}`} tone="amber" />
              ) : null}
              {s.status === "dismissed" ? <SuggestionBadge label="Dismissed" tone="muted" /> : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {actionable ? (
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  className={cn(
                    "h-7 w-16 rounded-md border bg-background px-1.5 text-right text-sm font-semibold tabular-nums",
                    edited
                      ? "border-primary/50 text-primary"
                      : "border-border/70 text-foreground",
                    lowConfidence && "opacity-80",
                  )}
                  value={qtyValue}
                  disabled={busyAction !== null}
                  onChange={(e) => setQty((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  aria-label={`Quantity for ${s.itemName}`}
                />
              </div>
            ) : (
              <p className="text-sm font-semibold tabular-nums text-foreground">
                ×{formatQty(s.acceptedQty ?? s.suggestedQty)}
              </p>
            )}
            {s.unitCost != null ? (
              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                {formatMoney(s.unitCost, currency)}/unit
              </p>
            ) : null}
            {lineTotal != null ? (
              <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {formatMoney(lineTotal, currency)}
              </p>
            ) : null}
          </div>
        </div>

        {actionable ? (
          <div className="mt-2 flex items-center justify-end gap-1">
            <span className="mr-auto text-[10px] tabular-nums text-muted-foreground">
              on hand {formatQty(s.onHand)} · par {formatQty(s.par)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground"
              disabled={busyAction !== null}
              onClick={() => void snooze(s.id)}
            >
              {busy && busyAction === `snooze:${s.id}` ? (
                <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
              ) : (
                <Moon className="mr-1 size-3" aria-hidden />
              )}
              Snooze
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-destructive"
              disabled={busyAction !== null}
              onClick={() => void dismiss(s.id)}
            >
              {busy && busyAction === `dismiss:${s.id}` ? (
                <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
              ) : (
                <X className="mr-1 size-3" aria-hidden />
              )}
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
}

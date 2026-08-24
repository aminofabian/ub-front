"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";

import {
  DashboardAccessDenied,
  DashboardFeedback,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchRestockRun,
  fetchRestockRunGroupPdf,
  postRestockRunAccept,
  postRestockSuggestionDismiss,
  postRestockSuggestionSnooze,
  type RestockCreatedPoRecord,
  type RestockRunRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { DigestBoard } from "../_components/digest-board";
import {
  downloadBlob,
  formatDate,
  formatMoney,
  formatQty,
  slug,
} from "../_lib/digest-format";
import { buildDepartments } from "../_lib/group-departments";
import {
  buildSupplierRail,
  firstPendingRailKey,
} from "../_lib/group-suppliers";

type Feedback = { kind: "error" | "success"; text: string };

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
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [createdPos, setCreatedPos] = useState<RestockCreatedPoRecord[]>([]);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  const [supplierKey, setSupplierKey] = useState<string | null>(null);

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
          if (next[s.id] === undefined) next[s.id] = formatQty(s.suggestedQty);
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

  const departments = useMemo(
    () => buildDepartments(run?.suggestions ?? []),
    [run],
  );
  const visibleDepartments = useMemo(
    () => (deptFilter ? departments.filter((d) => d.id === deptFilter) : departments),
    [departments, deptFilter],
  );
  const rail = useMemo(
    () => buildSupplierRail(visibleDepartments),
    [visibleDepartments],
  );

  useEffect(() => {
    const next = firstPendingRailKey(rail);
    if (!next) {
      setSupplierKey(null);
      return;
    }
    if (!supplierKey || !rail.some((item) => item.key === supplierKey)) {
      setSupplierKey(next);
    }
  }, [rail, supplierKey]);

  const pending = useMemo(
    () =>
      visibleDepartments
        .flatMap((d) => d.lines)
        .filter((s) => s.status === "pending"),
    [visibleDepartments],
  );
  const runActive =
    run != null &&
    (run.status === "generated" ||
      run.status === "notified" ||
      run.status === "partially_accepted");
  const activeDept = deptFilter
    ? departments.find((d) => d.id === deptFilter)
    : undefined;

  const overridesFor = useCallback(
    (ids: string[]): Record<string, number | string> | undefined => {
      const overrides: Record<string, number | string> = {};
      let changed = false;
      for (const id of ids) {
        const raw = (qty[id] ?? "").trim();
        const input = raw === "" ? Number.NaN : Number(raw);
        const suggestion = run?.suggestions.find((s) => s.id === id);
        if (!suggestion || !Number.isFinite(input)) continue;
        if (input !== Number(suggestion.suggestedQty)) {
          overrides[id] = input;
          changed = true;
        }
      }
      return changed ? overrides : undefined;
    },
    [qty, run],
  );

  const applyAccept = useCallback(
    (resp: {
      run: RestockRunRecord;
      purchaseOrders: RestockCreatedPoRecord[];
      padLinesCreated: number;
      skippedLines: { itemName: string; reason: string }[];
    }) => {
      setRun(resp.run);
      setCreatedPos(resp.purchaseOrders);
      const parts: string[] = [];
      for (const po of resp.purchaseOrders) {
        parts.push(`PO ${po.poNumber} drafted for ${po.supplierName || "supplier"}`);
      }
      if (resp.padLinesCreated > 0) {
        parts.push(
          `${resp.padLinesCreated} line${resp.padLinesCreated === 1 ? "" : "s"} added to the order pad`,
        );
      }
      if (resp.skippedLines.length > 0) {
        const first = resp.skippedLines[0];
        const more =
          resp.skippedLines.length > 1 ? ` (+${resp.skippedLines.length - 1} more)` : "";
        parts.push(`${first.itemName} skipped: ${first.reason}${more}`);
      }
      if (parts.length === 0) parts.push("Nothing left to accept");
      setFeedback({
        kind: parts.some((p) => p.includes("skipped")) ? "error" : "success",
        text: parts.join(" · "),
      });
    },
    [],
  );

  async function acceptLines(ids: string[], mode: "po" | "pad" | "all") {
    if (ids.length === 0) return;
    setBusyAction(`accept:${mode}:${ids.join(",")}`);
    setFeedback(null);
    try {
      applyAccept(
        await postRestockRunAccept(runId, {
          lineIds: ids,
          qtyOverrides: overridesFor(ids),
          mode,
        }),
      );
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

  async function downloadGroupPdf(opts: {
    key: string;
    filename: string;
    departmentId?: string;
    supplierId?: string;
    pad?: boolean;
  }) {
    setPdfBusy(opts.key);
    setFeedback(null);
    try {
      downloadBlob(
        await fetchRestockRunGroupPdf(runId, {
          departmentId: opts.departmentId,
          supplierId: opts.supplierId,
          pad: opts.pad,
        }),
        opts.filename,
      );
    } catch (e) {
      setFeedback({
        kind: "error",
        text: e instanceof Error ? e.message : "Could not download PDF",
      });
    } finally {
      setPdfBusy(null);
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
  const dateLabel = run ? formatDate(run.runDate) : "";
  const pdfDate = run?.runDate ?? "list";
  const filterPdfName = activeDept ? slug(activeDept.name) : "all";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#e8eef5] dark:bg-background">
      <header className="z-20 shrink-0 border-b border-border bg-[#e8eef5] dark:bg-background">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-none px-0"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              Tonight&apos;s list
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {run ? `${run.branchName} · ${dateLabel}` : "Loading…"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {run && run.lineCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-none px-2 text-[11px]"
                disabled={busyAction !== null || pdfBusy === "filter"}
                onClick={() =>
                  void downloadGroupPdf({
                    key: "filter",
                    filename: `restock-${pdfDate}-${filterPdfName}.pdf`,
                    departmentId: activeDept?.id,
                  })
                }
              >
                {pdfBusy === "filter" ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-1 size-3.5" aria-hidden />
                )}
                {activeDept ? "PDF" : "All PDF"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none px-2"
              disabled={loading}
              onClick={() => void load()}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
            </Button>
          </div>
        </div>

        {run ? (
          <div className="grid grid-cols-3 border-t border-border sm:grid-cols-4">
            <StatCell label="Items" value={String(run.lineCount)} />
            <StatCell label="Estimate" value={formatMoney(run.estTotal, currency)} />
            <StatCell label="Suppliers" value={String(Math.max(rail.filter((r) => r.kind !== "handled").length, 0))} />
            <div className="hidden items-center justify-between gap-2 border-l border-border px-3 py-1.5 sm:flex">
              <StatusBadge status={run.status} />
              {pending.length > 0 && runActive && (canWritePo || canWritePad) ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-none px-2.5 text-[11px]"
                  disabled={busyAction !== null}
                  onClick={() => void acceptLines(pending.map((l) => l.id), "all")}
                >
                  {busyAction?.startsWith("accept:all") ? (
                    <Loader2 className="mr-1 size-3 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="mr-1 size-3" aria-hidden />
                  )}
                  {activeDept ? "Accept aisle" : "Accept all"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {departments.length > 0 ? (
          <nav
            className="flex gap-0 overflow-x-auto border-t border-border"
            aria-label="Departments"
          >
            <button
              type="button"
              aria-pressed={deptFilter == null}
              className={cn(
                "shrink-0 border-r border-border px-3.5 py-2 text-[12px] font-semibold",
                deptFilter == null
                  ? "bg-[#16202a] text-white dark:bg-foreground dark:text-background"
                  : "bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
              onClick={() => {
                setDeptFilter(null);
                setSupplierKey(null);
              }}
            >
              All
              <span className="ml-1.5 tabular-nums opacity-70">{run?.lineCount ?? 0}</span>
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={deptFilter === d.id}
                className={cn(
                  "shrink-0 border-r border-border px-3.5 py-2 text-[12px] font-medium",
                  deptFilter === d.id
                    ? "bg-[#16202a] text-white dark:bg-foreground dark:text-background"
                    : "bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                )}
                onClick={() => {
                  setDeptFilter(d.id === deptFilter ? null : d.id);
                  setSupplierKey(null);
                }}
              >
                {d.name}
                <span className="ml-1.5 tabular-nums opacity-70">{d.lines.length}</span>
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      {feedback ? (
        <div className="border-b border-border bg-background px-3 py-2 sm:px-4">
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        </div>
      ) : null}

      {createdPos.length > 0 ? (
        <div className="border-b border-border bg-emerald-500/[0.07] px-3 py-2 sm:px-4">
          <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
            Draft purchase orders created
          </p>
          <div className="mt-1 space-y-0.5">
            {createdPos.map((po) => (
              <Link
                key={po.purchaseOrderId}
                href={`/order?sid=${encodeURIComponent(po.supplierId)}`}
                className="flex items-center gap-1 text-xs text-emerald-800 underline underline-offset-2 dark:text-emerald-200"
              >
                <ShoppingCart className="size-3 shrink-0" aria-hidden />
                {po.poNumber} · {po.supplierName} · {po.lineCount} line
                {po.lineCount === 1 ? "" : "s"}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {run?.status === "accepted" ? (
        <p className="border-b border-border bg-emerald-500/[0.07] px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100 sm:px-4">
          This list is fully handled. Draft POs and order pad lines were created from the
          accepted suggestions.
        </p>
      ) : null}
      {run?.status === "expired" ? (
        <p className="border-b border-border bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-950 dark:text-amber-100 sm:px-4">
          This list expired because a newer one was generated. Pending lines can no longer be
          accepted.
        </p>
      ) : null}

      {loading && !run ? (
        <div className="flex min-h-[70vh] flex-col md:grid md:grid-cols-[minmax(16.5rem,32%)_minmax(0,1fr)]">
          <div className="border-b border-border bg-[#dce6f0] md:border-b-0 md:border-r dark:bg-muted/40">
            <div className="h-11" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse border-b border-border/60 bg-muted/30" />
            ))}
          </div>
          <div className="bg-card">
            <div className="h-16 animate-pulse bg-[#dce6f0] dark:bg-muted/40" />
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="h-16 animate-pulse bg-muted/25" />
              ))}
            </div>
          </div>
        </div>
      ) : run?.lineCount === 0 ? (
        <div className="m-6 flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-16 text-center">
          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
          <p className="text-sm font-medium text-foreground">Nothing to order</p>
          <p className="text-xs text-muted-foreground">
            Everything is above its threshold for now.
          </p>
        </div>
      ) : run ? (
        <DigestBoard
          rail={rail}
          selectedKey={supplierKey}
          onSelect={setSupplierKey}
          departmentId={activeDept?.id}
          departmentName={activeDept?.name}
          currency={currency}
          pdfDate={pdfDate}
          qty={qty}
          setQty={setQty}
          busyAction={busyAction}
          pdfBusy={pdfBusy}
          runActive={runActive}
          canWritePo={canWritePo}
          canWritePad={canWritePad}
          onAccept={(ids, mode) => void acceptLines(ids, mode)}
          onDismiss={(id) => void dismiss(id)}
          onSnooze={(id) => void snooze(id)}
          onPdf={(opts) => void downloadGroupPdf(opts)}
        />
      ) : null}

      {pending.length > 0 && runActive && (canWritePo || canWritePad) ? (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-border bg-[#e8eef5] px-3 py-2 dark:bg-background sm:hidden">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {pending.length} pending
          </span>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-none"
            disabled={busyAction !== null}
            onClick={() => void acceptLines(pending.map((l) => l.id), "all")}
          >
            {activeDept ? "Accept aisle" : "Accept all"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border px-3 py-1.5 first:border-l-0">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums leading-tight text-foreground">{value}</p>
    </div>
  );
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
            : "Ready";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold",
        status === "accepted"
          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : status === "partially_accepted"
            ? "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
            : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

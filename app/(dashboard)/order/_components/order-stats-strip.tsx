"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { getSessionTenantId } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchPathAPurchaseOrders,
  type PathAPurchaseOrderListRowRecord,
} from "@/lib/api";
import { readOrderCartDraft } from "@/lib/order-cart-storage";
import { cn, formatMoney } from "@/lib/utils";

const CURRENCY = "KES";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function summarizeLocalDraft(businessId: string, branchId: string) {
  const draft = readOrderCartDraft(businessId, branchId);
  if (!draft) {
    return { suppliers: 0, lines: 0, units: 0 };
  }
  let suppliers = 0;
  let lines = 0;
  let units = 0;
  for (const cart of Object.values(draft.cartsBySupplier)) {
    const entries = Object.entries(cart).filter(([, qty]) => qty > 0);
    if (entries.length === 0) continue;
    suppliers += 1;
    lines += entries.length;
    units += entries.reduce((sum, [, qty]) => sum + qty, 0);
  }
  return { suppliers, lines, units };
}

function summarizePoRows(rows: PathAPurchaseOrderListRowRecord[]) {
  let value = 0;
  let awaitingUnits = 0;
  let lineCount = 0;
  for (const row of rows) {
    value += toNum(row.totalOrdered);
    awaitingUnits += Math.max(0, toNum(row.totalOrdered) - toNum(row.totalReceived));
    lineCount += row.lineCount;
  }
  return { count: rows.length, value, awaitingUnits, lineCount };
}

type PipelineStatProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof ShoppingCart;
  active?: boolean;
  href?: string;
  loading?: boolean;
};

function PipelineStat({
  label,
  value,
  hint,
  icon: Icon,
  active = false,
  href,
  loading = false,
}: PipelineStatProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg border",
            active
              ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white/70 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        {loading ? (
          <Loader2
            className="size-4 animate-spin text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
          {label}
        </p>
        <p className="font-heading text-[22px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)] tabular-nums">
          {value}
        </p>
        <p className="text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          {hint}
        </p>
      </div>
    </>
  );

  const className = cn(
    "relative min-w-0 flex-1 rounded-xl border px-3.5 py-3 transition-[box-shadow,border-color,transform]",
    active
      ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)] shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
    href && "group hover:-translate-y-px",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
        <ArrowRight
          className="absolute right-3 top-3 size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)] transition group-hover:text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function OrderStatsStrip() {
  const { branchId } = useDashboard();
  const businessId = getSessionTenantId()?.trim() ?? "";
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<
    PathAPurchaseOrderListRowRecord[]
  >([]);
  const [localStats, setLocalStats] = useState({
    suppliers: 0,
    lines: 0,
    units: 0,
  });

  const refresh = useCallback(async () => {
    setLocalStats(summarizeLocalDraft(businessId, branchId));
    if (!businessId) {
      setSent([]);
      setSavedDrafts([]);
      setLoading(false);
      return;
    }
    try {
      const [sentRows, draftRows] = await Promise.all([
        fetchPathAPurchaseOrders({ status: "sent" }),
        fetchPathAPurchaseOrders({ status: "draft" }),
      ]);
      setSent(sentRows);
      setSavedDrafts(draftRows);
    } catch {
      setSent([]);
      setSavedDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, branchId]);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);
    const interval = window.setInterval(onRefresh, 30_000);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const sentStats = useMemo(() => summarizePoRows(sent), [sent]);
  const savedStats = useMemo(() => summarizePoRows(savedDrafts), [savedDrafts]);

  const buildingActive = localStats.units > 0;
  const sentActive = sentStats.count > 0;
  const confirmActive = sentStats.awaitingUnits > 0;

  return (
    <section
      aria-label="Order pipeline"
      className="space-y-2.5 px-0.5 sm:px-1"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
            Order pipeline
          </p>
          <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            What&apos;s in motion right now
          </p>
        </div>
        {!loading && confirmActive ? (
          <Link
            href={APP_ROUTES.orderReceive}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--order-ink,#15231f)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#0f1a17]"
          >
            <ClipboardCheck className="size-3.5" aria-hidden />
            Confirm goods
          </Link>
        ) : null}
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[12%] top-[2.65rem] hidden h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] to-transparent sm:block"
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineStat
            label="In your basket"
            value={loading ? "—" : localStats.units}
            hint={
              localStats.lines > 0
                ? `${localStats.lines} line${localStats.lines === 1 ? "" : "s"} · ${localStats.suppliers} supplier${localStats.suppliers === 1 ? "" : "s"}`
                : "Tap products below to start"
            }
            icon={ShoppingCart}
            active={buildingActive}
            loading={loading}
          />
          <PipelineStat
            label="Saved drafts"
            value={loading ? "—" : savedStats.count}
            hint={
              savedStats.count > 0
                ? `${savedStats.lineCount} lines · not sent yet`
                : "POs you saved locally"
            }
            icon={Package}
            active={savedStats.count > 0}
            loading={loading}
          />
          <PipelineStat
            label="With suppliers"
            value={loading ? "—" : sentStats.count}
            hint={
              sentStats.count > 0
                ? formatMoney(sentStats.value, CURRENCY)
                : "Sent purchase orders"
            }
            icon={Truck}
            active={sentActive}
            href={sentStats.count > 0 ? APP_ROUTES.orderReceive : undefined}
            loading={loading}
          />
          <PipelineStat
            label="Awaiting stock"
            value={loading ? "—" : sentStats.awaitingUnits}
            hint={
              confirmActive
                ? "Units still to receive"
                : "Nothing due in yet"
            }
            icon={ClipboardCheck}
            active={confirmActive}
            href={confirmActive ? APP_ROUTES.orderReceive : undefined}
            loading={loading}
          />
        </div>
      </div>
    </section>
  );
}

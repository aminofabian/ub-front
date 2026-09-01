"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { getSessionTenantId } from "@/lib/auth";
import {
  fetchPathAPurchaseOrders,
  fetchPathBSupplies,
  fetchPurchasingIntelligenceDashboard,
  type PathAPurchaseOrderListRowRecord,
  type PathBSupplyListRowRecord,
  type PurchasingIntelligenceDashboardResponse,
} from "@/lib/api";
import { readOrderCartDraft } from "@/lib/order-cart-storage";
import {
  summarizeLifetimeStats,
  type OrderLifetimeStats,
} from "@/app/(dashboard)/order/_lib/order-lifetime-stats";

export function toOrderStatNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function summarizeLocalDraft(businessId: string, branchId: string) {
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

export function summarizePoRows(rows: PathAPurchaseOrderListRowRecord[]) {
  let value = 0;
  let awaitingUnits = 0;
  let lineCount = 0;
  for (const row of rows) {
    value += toOrderStatNum(row.totalOrdered);
    awaitingUnits += Math.max(
      0,
      toOrderStatNum(row.totalOrdered) - toOrderStatNum(row.totalReceived),
    );
    lineCount += row.lineCount;
  }
  return { count: rows.length, value, awaitingUnits, lineCount };
}

/** Open POs still expecting goods (sent + draft with remaining qty). */
export function summarizeOpenReceiveRows(
  rows: PathAPurchaseOrderListRowRecord[],
) {
  const open = rows.filter((row) => {
    const ordered = toOrderStatNum(row.totalOrdered);
    const received = toOrderStatNum(row.totalReceived);
    return ordered > received;
  });

  let awaitingUnits = 0;
  let lineCount = 0;
  let partialCount = 0;
  const supplierIds = new Set<string>();

  for (const row of open) {
    const ordered = toOrderStatNum(row.totalOrdered);
    const received = toOrderStatNum(row.totalReceived);
    awaitingUnits += Math.max(0, ordered - received);
    lineCount += row.lineCount;
    if (received > 0) partialCount += 1;
    if (row.supplierId?.trim()) supplierIds.add(row.supplierId.trim());
  }

  let oldestDays: number | null = null;
  for (const row of open) {
    if (!row.createdAt?.trim()) continue;
    const created = Date.parse(row.createdAt);
    if (Number.isNaN(created)) continue;
    const days = Math.floor((Date.now() - created) / 86_400_000);
    oldestDays = oldestDays == null ? days : Math.max(oldestDays, days);
  }

  return {
    openCount: open.length,
    awaitingUnits,
    lineCount,
    partialCount,
    supplierCount: supplierIds.size,
    oldestDays,
  };
}

export function useOrderPipelineStats() {
  const { branchId } = useDashboard();
  const businessId = getSessionTenantId()?.trim() ?? "";
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<PathAPurchaseOrderListRowRecord[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<
    PathAPurchaseOrderListRowRecord[]
  >([]);
  const [cancelled, setCancelled] = useState<PathAPurchaseOrderListRowRecord[]>(
    [],
  );
  const [supplies, setSupplies] = useState<PathBSupplyListRowRecord[]>([]);
  const [intelligence, setIntelligence] =
    useState<PurchasingIntelligenceDashboardResponse | null>(null);
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
      setCancelled([]);
      setSupplies([]);
      setIntelligence(null);
      setLoading(false);
      return;
    }
    try {
      const [sentRows, draftRows, cancelledRows, supplyRows, intel] =
        await Promise.all([
          fetchPathAPurchaseOrders({ status: "sent" }),
          fetchPathAPurchaseOrders({ status: "draft" }),
          fetchPathAPurchaseOrders({ status: "cancelled" }).catch(() => []),
          fetchPathBSupplies({ branchId: branchId || undefined }).catch(
            () => [],
          ),
          fetchPurchasingIntelligenceDashboard(
            undefined,
            undefined,
            branchId || undefined,
          ).catch(() => null),
        ]);
      setSent(sentRows);
      setSavedDrafts(draftRows);
      setCancelled(cancelledRows);
      setSupplies(supplyRows);
      setIntelligence(intel);
    } catch {
      setSent([]);
      setSavedDrafts([]);
      setCancelled([]);
      setSupplies([]);
      setIntelligence(null);
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
  const receiveStats = useMemo(
    () => summarizeOpenReceiveRows([...sent, ...savedDrafts]),
    [sent, savedDrafts],
  );
  const lifetime: OrderLifetimeStats = useMemo(
    () =>
      summarizeLifetimeStats(
        sent,
        savedDrafts,
        cancelled,
        supplies,
        intelligence,
      ),
    [sent, savedDrafts, cancelled, supplies, intelligence],
  );
  const allOrders = useMemo(
    () => [...sent, ...savedDrafts, ...cancelled],
    [sent, savedDrafts, cancelled],
  );

  return {
    loading,
    localStats,
    sentStats,
    savedStats,
    receiveStats,
    lifetime,
    allOrders,
    sent,
    savedDrafts,
    refresh,
  };
}

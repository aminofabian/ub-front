"use client";

import { ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import {
  RX_INK,
  RX_INPUT,
  RX_MUTED,
  RX_ROW,
  RX_RULE,
  RX_TD,
  RX_TH,
  Field,
  errorText,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createCentralOrder,
  draftSplitTransfers,
  fetchOrderingForecast,
  fetchPendingSplits,
  fetchSupplierLicences,
  saveOrderingSettings,
  type OrderingForecast,
  type PendingSplit,
  type SupplierLicence,
} from "@/lib/pharmacy-api";

/** Quantity typed for one product at one branch, keyed `itemId|branchId`. */
type Quantities = Record<string, string>;

const key = (itemId: string, branchId: string) => `${itemId}|${branchId}`;

/**
 * What to order: how fast each product sold over the last four weeks, how long the stock lasts,
 * how much will expire before it sells, and a suggested quantity. Ticked lines become one draft
 * order; with several branches, the order arrives at one branch and is shared out by transfer.
 */
export function PharmacyOrdering({
  canOrder,
  canSplit,
  canPickSupplier,
}: {
  canOrder: boolean;
  canSplit: boolean;
  canPickSupplier: boolean;
}) {
  const { branchId, branches } = useDashboard();
  const manyBranches = branches.length > 1;
  const [allBranches, setAllBranches] = useState(false);
  const [forecast, setForecast] = useState<OrderingForecast | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Quantities>({});
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [suppliers, setSuppliers] = useState<SupplierLicence[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [receivingId, setReceivingId] = useState(branchId || "");
  const [lead, setLead] = useState("7");
  const [cover, setCover] = useState("30");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [splits, setSplits] = useState<PendingSplit[]>([]);

  const scope = allBranches && manyBranches ? null : branchId || null;

  useEffect(() => {
    let alive = true;
    fetchOrderingForecast(scope)
      .then((f) => {
        if (!alive) return;
        setForecast(f);
        setLead(String(f.leadDays));
        setCover(String(f.coverDays));
        setTicked({});
        setQuantities({});
        setError("");
      })
      .catch((err) => alive && setError(errorText(err, "Could not work out what to order.")));
    return () => {
      alive = false;
    };
  }, [scope, reloadKey]);

  useEffect(() => {
    if (!canPickSupplier) return;
    let alive = true;
    fetchSupplierLicences()
      .then((list) => alive && setSuppliers(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [canPickSupplier]);

  useEffect(() => {
    if (!manyBranches) return;
    let alive = true;
    fetchPendingSplits()
      .then((list) => alive && setSplits(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [manyBranches, reloadKey]);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "Branch";
  const qtyFor = (itemId: string, need: { branchId: string; suggested: number }) =>
    quantities[key(itemId, need.branchId)] ?? String(need.suggested);
  const rows = forecast?.rows ?? [];
  const tickedRows = rows.filter((r) => ticked[r.itemId]);

  const saveSettings = async () => {
    const l = Number(lead);
    const c = Number(cover);
    if (!Number.isInteger(l) || l < 1 || l > 120 || !Number.isInteger(c) || c < 1 || c > 365) {
      setFormError("Delivery time is 1 to 120 days and cover is 1 to 365 days.");
      return;
    }
    setBusy(true);
    try {
      await saveOrderingSettings({ leadDays: l, coverDays: c });
      setFormError("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errorText(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  const createOrder = async () => {
    if (!supplierId) {
      setFormError("Choose the supplier.");
      return;
    }
    if (!receivingId) {
      setFormError("Choose the branch the delivery arrives at.");
      return;
    }
    const lines = [];
    for (const r of tickedRows) {
      const unitCost = Number(costs[r.itemId] ?? r.unitCost ?? "");
      if (!Number.isFinite(unitCost) || unitCost <= 0) {
        setFormError(`Enter the cost you expect to pay for ${r.name}.`);
        return;
      }
      const shares = [];
      for (const n of r.branches) {
        const quantity = Number(qtyFor(r.itemId, n));
        if (!Number.isFinite(quantity) || quantity < 0) {
          setFormError(`Check the quantity for ${r.name}.`);
          return;
        }
        if (quantity > 0) shares.push({ branchId: n.branchId, quantity });
      }
      if (shares.length > 0) lines.push({ itemId: r.itemId, unitCost, shares });
    }
    if (lines.length === 0) {
      setFormError("Tick at least one product with a quantity.");
      return;
    }
    setBusy(true);
    try {
      const made = await createCentralOrder({ supplierId, receivingBranchId: receivingId, lines });
      toast.success(`Draft order ${made.poNumber} created. Open Order to check and send it.`);
      setFormError("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errorText(err, "Could not create the order."));
    } finally {
      setBusy(false);
    }
  };

  const split = async (poId: string) => {
    setBusy(true);
    try {
      const res = await draftSplitTransfers(poId);
      toast.success(`${res.transferIds.length} draft ${res.transferIds.length === 1 ? "transfer" : "transfers"} created. Send them from Transfers.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err, "Could not draft the transfers."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Panel
        title="What to order"
        description={`Based on what sold in the last ${forecast?.windowDays ?? 28} days. For medicines, expired and undated stock is not counted. Products that did not sell in that time are not listed.`}
        flush
      >
        <div className={cn("flex flex-wrap items-end gap-3 border-b px-4 py-3", RX_RULE)}>
          {manyBranches ? (
            <Field label="Show">
              <select className={RX_INPUT} value={allBranches ? "all" : "one"} onChange={(e) => setAllBranches(e.target.value === "all")}>
                <option value="one">This branch</option>
                <option value="all">Every branch</option>
              </select>
            </Field>
          ) : null}
          <Field label="Supplier delivers in (days)" className="w-44">
            <input className={RX_INPUT} inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} disabled={!canOrder} />
          </Field>
          <Field label="Order should cover (days)" className="w-44">
            <input className={RX_INPUT} inputMode="numeric" value={cover} onChange={(e) => setCover(e.target.value)} disabled={!canOrder} />
          </Field>
          {canOrder ? (
            <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void saveSettings()}>
              Save and recalculate
            </Button>
          ) : null}
        </div>

        {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {!forecast && !error ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Working it out…</p> : null}
        {forecast && rows.length === 0 ? (
          <EmptyState
            icon={ShoppingBasket}
            title="Nothing needs ordering"
            body="Every product that sold in the last four weeks has enough stock for the delivery time plus the cover period, and none is set to expire before it sells."
          />
        ) : null}
        {forecast?.truncated ? (
          <p role="alert" className="px-4 py-3 text-sm text-[#8A4129]">
            Showing the 500 products closest to running out.
          </p>
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>
                    <span className="sr-only">Order</span>
                  </th>
                  <th className={RX_TH}>Product</th>
                  {scope == null ? <th className={RX_TH}>Branch</th> : null}
                  <th className={cn(RX_TH, "text-right")}>Sold</th>
                  <th className={cn(RX_TH, "text-right")}>In stock</th>
                  <th className={cn(RX_TH, "text-right")}>On order</th>
                  <th className={cn(RX_TH, "text-right")}>Lasts</th>
                  <th className={cn(RX_TH, "text-right")}>Will expire first</th>
                  <th className={cn(RX_TH, "text-right")}>Order</th>
                  <th className={cn(RX_TH, "text-right")}>Cost each</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  r.branches.map((n, i) => (
                    <tr key={key(r.itemId, n.branchId)} className={RX_ROW}>
                      <td className={RX_TD}>
                        {i === 0 ? (
                          <input
                            type="checkbox"
                            aria-label={`Order ${r.name}`}
                            checked={ticked[r.itemId] ?? false}
                            disabled={!canOrder}
                            onChange={(e) => setTicked((prev) => ({ ...prev, [r.itemId]: e.target.checked }))}
                          />
                        ) : null}
                      </td>
                      <td className={RX_TD}>
                        {i === 0 ? (
                          <>
                            <span className={cn("font-medium", RX_INK)}>{r.name}</span>
                            {r.medicine ? (
                              <span className="ml-2">
                                <Chip tone="live">Medicine</Chip>
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </td>
                      {scope == null ? <td className={cn(RX_TD, RX_MUTED)}>{branchName(n.branchId)}</td> : null}
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{formatQty(n.soldInWindow)}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{formatQty(n.sellable)}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums")}>{n.onOrder > 0 ? formatQty(n.onOrder) : ""}</td>
                      <td className={cn(RX_TD, "text-right tabular-nums", n.daysOfCover != null && n.daysOfCover <= forecast!.leadDays ? "font-semibold text-[#8A4129]" : "")}>
                        {n.daysOfCover != null ? `${formatQty(n.daysOfCover)} days` : ""}
                      </td>
                      <td className={cn(RX_TD, "text-right tabular-nums", n.expiringFirst > 0 ? "font-semibold text-[#8A4129]" : "")}>
                        {n.expiringFirst > 0 ? formatQty(n.expiringFirst) : ""}
                      </td>
                      <td className={cn(RX_TD, "text-right")}>
                        <input
                          className={cn(RX_INPUT, "w-24 text-right tabular-nums")}
                          aria-label={`Quantity of ${r.name} for ${branchName(n.branchId)}`}
                          inputMode="decimal"
                          value={qtyFor(r.itemId, n)}
                          disabled={!canOrder}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [key(r.itemId, n.branchId)]: e.target.value }))}
                        />
                      </td>
                      <td className={cn(RX_TD, "text-right")}>
                        {i === 0 ? (
                          <input
                            className={cn(RX_INPUT, "w-24 text-right tabular-nums")}
                            aria-label={`Cost of ${r.name}`}
                            inputMode="decimal"
                            value={costs[r.itemId] ?? (r.unitCost != null ? String(r.unitCost) : "")}
                            disabled={!canOrder}
                            onChange={(e) => setCosts((prev) => ({ ...prev, [r.itemId]: e.target.value }))}
                          />
                        ) : null}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {canOrder && rows.length > 0 ? (
          <div className={cn("flex flex-wrap items-end gap-3 border-t px-4 py-3", RX_RULE)}>
            <Field label="Supplier" className="min-w-[14rem] flex-1">
              <select className={RX_INPUT} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.supplierName}
                    {s.daysLeft != null && s.daysLeft < 0 ? " (licence lapsed)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            {manyBranches ? (
              <Field label="Delivery arrives at">
                <select className={RX_INPUT} value={receivingId} onChange={(e) => setReceivingId(e.target.value)}>
                  <option value="">Choose a branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Button type="button" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy || tickedRows.length === 0} onClick={() => void createOrder()}>
              Create draft order ({tickedRows.length})
            </Button>
          </div>
        ) : null}
        {formError ? <p role="alert" className="px-4 pb-3 text-sm text-destructive">{formError}</p> : null}
      </Panel>

      {manyBranches && splits.length > 0 ? (
        <Panel
          title="Deliveries to share out"
          description="Orders placed for several branches. Once the order is received, draft the transfers; each lot and expiry date travels with the stock."
          flush
        >
          <ul>
            {splits.map((s) => (
              <li key={s.purchaseOrderId} className={cn("flex flex-wrap items-start gap-3 border-b px-4 py-3 text-sm last:border-0", RX_RULE)}>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", RX_INK)}>
                    Order {s.poNumber} <span className={cn("font-normal", RX_MUTED)}>· arrives at {branchName(s.receivingBranchId)}</span>
                  </p>
                  <ul className={cn("mt-1 space-y-0.5 text-[13px]", RX_MUTED)}>
                    {s.lines.map((l, i) => (
                      <li key={`${l.itemId}-${l.branchId}-${i}`}>
                        {formatQty(l.quantity)} × {l.itemName} for {branchName(l.branchId)}
                      </li>
                    ))}
                  </ul>
                </div>
                {s.received ? (
                  canSplit ? (
                    <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" disabled={busy} onClick={() => void split(s.purchaseOrderId)}>
                      Draft transfers
                    </Button>
                  ) : null
                ) : (
                  <Chip tone="quiet">Not received yet</Chip>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

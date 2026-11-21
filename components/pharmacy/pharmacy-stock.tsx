"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  daysUntil,
  errorText,
  formatDate,
  formatQty,
} from "@/components/pharmacy/pharmacy-ui";
import { Chip, EmptyState, Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DISPOSAL_REASON_LABEL,
  disposeBatch,
  editBatchDetails,
  fetchBatchSafety,
  quarantineBatch,
  releaseBatch,
  type BatchSafetyRow,
  type BatchSafetyView,
  type DisposalReason,
} from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

const VIEWS: Array<{ key: BatchSafetyView; label: string; empty: string }> = [
  { key: "quarantined", label: "Quarantined", empty: "Nothing is in quarantine." },
  { key: "expired", label: "Expired on the shelf", empty: "No expired stock is on sale." },
  { key: "short_dated", label: "Expiring soon", empty: "Nothing expires soon." },
  { key: "missing_details", label: "Missing lot or expiry", empty: "Every medicine batch has a lot number and an expiry date." },
];

type Action =
  | { kind: "quarantine"; row: BatchSafetyRow }
  | { kind: "release"; row: BatchSafetyRow }
  | { kind: "dispose"; row: BatchSafetyRow }
  | { kind: "edit"; row: BatchSafetyRow };

type Props = {
  canWrite: boolean;
  initialView: BatchSafetyView;
  shortDatedDays: number;
  onChanged: () => void;
};

export function PharmacyStock({ canWrite, initialView, shortDatedDays, onChanged }: Props) {
  const { branchId } = useDashboard();
  const [view, setView] = useState<BatchSafetyView>(initialView);
  const [rows, setRows] = useState<BatchSafetyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchBatchSafety({ view, branchId: branchId || null, days: shortDatedDays })
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
        setError("");
      })
      .catch((err) => setError(errorText(err, "Could not load stock.")))
      .finally(() => setLoading(false));
  }, [view, branchId, shortDatedDays]);

  useEffect(() => {
    load();
  }, [load]);

  const [bulkBusy, setBulkBusy] = useState(false);
  /** One batch at a time, so a failure names the batch and the rest still go through. */
  const quarantineAllExpired = async () => {
    const batches = rows.filter((r) => r.status !== "quarantined");
    if (batches.length === 0) return;
    setBulkBusy(true);
    let failed = 0;
    for (const b of batches) {
      try {
        await quarantineBatch(b.batchId, "Expired");
      } catch {
        failed++;
      }
    }
    setBulkBusy(false);
    if (failed > 0) {
      setError(`${failed} of ${batches.length} could not be quarantined. They are still listed below.`);
    }
    load();
    onChanged();
  };

  const done = () => {
    setAction(null);
    load();
    onChanged();
  };

  const current = VIEWS.find((v) => v.key === view)!;

  return (
    <>
      <Panel
        title="Stock safety"
        description="Quarantined stock stays on your books but cannot be sold, at the till or online, until it is released or disposed of."
        flush
      >
        <div className={cn("flex flex-wrap gap-1.5 border-b px-4 py-3", RX_RULE)} role="group" aria-label="Which stock to show">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "h-9 rounded-[2px] border px-2.5 text-[13px] transition-colors",
                view === v.key
                  ? "border-[var(--op-accent,#1d4b3b)] bg-[var(--op-accent,#1d4b3b)] text-white"
                  : cn(RX_RULE, RX_MUTED, "hover:text-[var(--op-ink,#121a16)]"),
              )}
            >
              {v.key === "short_dated" ? `Expiring within ${shortDatedDays} days` : v.label}
            </button>
          ))}
        </div>

        {canWrite && view === "expired" && rows.length > 1 ? (
          <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5", RX_RULE)}>
            <p className={cn("text-[13px]", RX_MUTED)}>
              The till already refuses these. Quarantine takes them off the sellable count until you write them off.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-[2px] px-3.5 sm:h-9"
              disabled={bulkBusy}
              onClick={() => void quarantineAllExpired()}
            >
              {bulkBusy ? "Quarantining…" : `Quarantine all ${rows.length}`}
            </Button>
          </div>
        ) : null}
        {error ? <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
        {loading && rows.length === 0 ? <p className={cn("px-4 py-6 text-sm", RX_MUTED)}>Loading…</p> : null}
        {!loading && rows.length === 0 && !error ? (
          <EmptyState icon={ShieldCheck} title="All clear" body={current.empty} />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className={cn("border-b", RX_RULE)}>
                  <th className={RX_TH}>Product</th>
                  <th className={RX_TH}>Lot</th>
                  <th className={RX_TH}>Expiry</th>
                  <th className={cn(RX_TH, "text-right")}>In batch</th>
                  <th className={RX_TH}>Branch</th>
                  <th className={cn(RX_TH, "text-right")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const days = daysUntil(r.expiryDate);
                  const quarantined = r.status === "quarantined";
                  return (
                    <tr key={r.batchId} className={RX_ROW}>
                      <td className={RX_TD}>
                        <p className={cn("font-medium", RX_INK)}>{r.itemName}</p>
                        {quarantined && r.quarantineReason ? (
                          <p className={cn("text-[12.5px] leading-snug", RX_MUTED)}>{r.quarantineReason}</p>
                        ) : (
                          <p className={cn("font-mono text-[12px]", RX_MUTED)}>{r.batchNumber}</p>
                        )}
                      </td>
                      <td className={cn(RX_TD, "font-mono text-[13px]")}>
                        {r.lotNumber ?? <span className="text-[#8A4129]">None</span>}
                      </td>
                      <td className={RX_TD}>
                        {r.expiryDate ? (
                          <>
                            <span>{formatDate(r.expiryDate)}</span>
                            {days != null ? (
                              <span className="ml-2">
                                <Chip tone={days < 0 ? "warn" : days <= 30 ? "live" : "quiet"}>
                                  {days < 0 ? "Expired" : days === 0 ? "Today" : `${days} days`}
                                </Chip>
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-[#8A4129]">None</span>
                        )}
                      </td>
                      <td className={cn(RX_TD, "text-right font-mono tabular-nums")}>{formatQty(r.quantityRemaining)}</td>
                      <td className={cn(RX_TD, RX_MUTED)}>{r.branchName ?? ""}</td>
                      <td className={cn(RX_TD, "text-right")}>
                        {canWrite ? (
                          <div className="flex justify-end gap-1.5">
                            {view === "missing_details" ? (
                              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAction({ kind: "edit", row: r })}>
                                Add details
                              </Button>
                            ) : null}
                            {quarantined ? (
                              <>
                                <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAction({ kind: "release", row: r })}>
                                  Release
                                </Button>
                                <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAction({ kind: "dispose", row: r })}>
                                  Dispose
                                </Button>
                              </>
                            ) : (
                              <Button type="button" variant="outline" className="h-11 rounded-[2px] px-3.5 sm:h-9" onClick={() => setAction({ kind: "quarantine", row: r })}>
                                Quarantine
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {total > rows.length ? (
          <p className={cn("border-t px-4 py-2.5 text-[13px]", RX_RULE, RX_MUTED)}>
            Showing the first {rows.length} of {total}.
          </p>
        ) : null}
      </Panel>

      {action ? <BatchActionDialog action={action} onClose={() => setAction(null)} onDone={done} /> : null}
    </>
  );
}

function BatchActionDialog({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => void }) {
  const { row, kind } = action;
  const [reason, setReason] = useState(kind === "quarantine" && daysUntil(row.expiryDate) != null && daysUntil(row.expiryDate)! < 0 ? "Expired" : "");
  const [disposal, setDisposal] = useState<DisposalReason>(
    daysUntil(row.expiryDate) != null && daysUntil(row.expiryDate)! < 0 ? "EXPIRED" : "QUARANTINE_DISPOSAL",
  );
  const [quantity, setQuantity] = useState("");
  const [lot, setLot] = useState(row.lotNumber ?? "");
  const [expiry, setExpiry] = useState(row.expiryDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const titles: Record<Action["kind"], string> = {
    quarantine: "Take this batch off sale",
    release: "Put this batch back on sale",
    dispose: "Dispose of quarantined stock",
    edit: "Lot number and expiry",
  };
  const descriptions: Record<Action["kind"], string> = {
    quarantine: "It stays on your books but cannot be sold until you release it or dispose of it.",
    release: "Only release stock you are sure is safe to sell.",
    dispose: "This writes the stock off as a loss. It cannot be undone.",
    edit: "Copy them from the pack. They are needed to trace a recall and to sell the earliest expiry first.",
  };

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (kind === "quarantine") {
        if (!reason.trim()) throw new Error("Say why.");
        await quarantineBatch(row.batchId, reason.trim());
        toast.success("Batch quarantined");
      } else if (kind === "release") {
        if (!reason.trim()) throw new Error("Say why it is safe to sell.");
        await releaseBatch(row.batchId, reason.trim());
        toast.success("Batch released");
      } else if (kind === "dispose") {
        const q = quantity.trim() === "" ? null : Number(quantity);
        if (q != null && (!Number.isFinite(q) || q <= 0)) throw new Error("Enter a quantity above zero, or leave it blank for everything.");
        await disposeBatch(row.batchId, {
          quantity: q,
          wastageReason: disposal,
          note: reason.trim() || undefined,
          expectedRemaining: row.quantityRemaining,
        });
        toast.success("Stock written off");
      } else {
        if (!lot.trim() && !expiry) throw new Error("Enter a lot number or an expiry date.");
        await editBatchDetails(row.batchId, { lotNumber: lot.trim() || null, expiryDate: expiry || null });
        toast.success("Saved");
      }
      onDone();
    } catch (err) {
      setError(errorText(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent side="center" className="sm:max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>{titles[kind]}</DialogTitle>
            <DialogDescription>
              {row.itemName}
              {row.lotNumber ? `, lot ${row.lotNumber}` : ""} · {formatQty(row.quantityRemaining)} in the batch.{" "}
              {descriptions[kind]}
            </DialogDescription>
          </DialogHeader>

          {kind === "edit" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Lot number">
                <input className={RX_INPUT} value={lot} onChange={(e) => setLot(e.target.value)} maxLength={64} autoComplete="off" />
              </Field>
              <Field label="Expiry date">
                <input className={RX_INPUT} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
            </div>
          ) : null}

          {kind === "dispose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Why">
                <select className={RX_INPUT} value={disposal} onChange={(e) => setDisposal(e.target.value as DisposalReason)}>
                  {(Object.keys(DISPOSAL_REASON_LABEL) as DisposalReason[]).map((k) => (
                    <option key={k} value={k}>
                      {DISPOSAL_REASON_LABEL[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity" hint="Leave blank to dispose of everything.">
                <input className={RX_INPUT} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={formatQty(row.quantityRemaining)} />
              </Field>
            </div>
          ) : null}

          {kind !== "edit" ? (
            <Field label={kind === "dispose" ? "Note (optional)" : "Reason"}>
              <input
                className={RX_INPUT}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder={
                  kind === "quarantine"
                    ? "e.g. Supplier recall, damaged carton"
                    : kind === "release"
                      ? "e.g. Recall did not cover this lot"
                      : "e.g. Returned to supplier for destruction"
                }
              />
            </Field>
          ) : null}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {kind === "quarantine" ? "Quarantine" : kind === "release" ? "Release" : kind === "dispose" ? "Write off" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

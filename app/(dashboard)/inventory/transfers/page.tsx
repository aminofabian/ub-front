"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchBranches,
  postCompleteStockTransfer,
  postStockTransfer,
  type BranchRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

type LineDraft = { itemId: string; qty: string };

export default function InventoryTransfersPage() {
  const { me } = useDashboard();
  const allowed = hasPermission(me?.permissions, Permission.InventoryTransfer);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", qty: "1" }]);
  const [lastTransferId, setLastTransferId] = useState("");
  const [completeId, setCompleteId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          setBranches(list.filter((b) => b.active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Failed to load branches.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const onCreate = useCallback(async () => {
    setMessage("");
    const normalized = lines
      .map((l) => ({
        itemId: l.itemId.trim(),
        quantity: Number(l.qty),
      }))
      .filter((l) => l.itemId.length > 0 && Number.isFinite(l.quantity) && l.quantity > 0);
    if (!fromBranchId.trim() || !toBranchId.trim()) {
      setMessage("Choose both branches.");
      return;
    }
    if (fromBranchId === toBranchId) {
      setMessage("From and to branch must differ.");
      return;
    }
    if (normalized.length === 0) {
      setMessage("Add at least one line with item ID and quantity.");
      return;
    }
    setLoading(true);
    try {
      const created = await postStockTransfer({
        fromBranchId: fromBranchId.trim(),
        toBranchId: toBranchId.trim(),
        notes: notes.trim() || null,
        lines: normalized,
      });
      setLastTransferId(created.id);
      setCompleteId(created.id);
      setMessage(`Draft transfer created (${created.status}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setLoading(false);
    }
  }, [fromBranchId, lines, notes, toBranchId]);

  const onComplete = useCallback(async () => {
    const id = completeId.trim();
    if (!id) {
      setMessage("Enter a transfer ID to complete.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      await postCompleteStockTransfer(id);
      setMessage("Transfer completed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Complete failed.");
    } finally {
      setLoading(false);
    }
  }, [completeId]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Stock transfers</h2>
        <p className="text-sm text-muted-foreground">
          You need{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{Permission.InventoryTransfer}</code> to
          create or complete transfers.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Stock transfers</h2>
        <p className="text-sm text-muted-foreground">
          Create a draft transfer, then complete it to move stock between branches (same business). Lines use
          catalog item IDs and decimal quantities.
        </p>
      </header>

      <div className="space-y-4 rounded-md border bg-muted/20 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">From branch</span>
            <select
              className="rounded border bg-background px-2 py-1.5"
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">To branch</span>
            <select
              className="rounded border bg-background px-2 py-1.5"
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
            >
              <option value="">—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Notes (optional)</span>
          <input
            className="rounded border bg-background px-2 py-1.5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Lines</p>
          {lines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              <input
                placeholder="Item ID (UUID)"
                className="min-w-[12rem] flex-1 rounded border bg-background px-2 py-1.5 font-mono text-xs"
                value={line.itemId}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...line, itemId: e.target.value };
                  setLines(next);
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={line.qty}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...line, qty: e.target.value };
                  setLines(next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={lines.length <= 1}
                onClick={() => setLines(lines.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLines([...lines, { itemId: "", qty: "1" }])}
          >
            Add line
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={loading} onClick={() => onCreate().catch(() => undefined)}>
            {loading ? "Working…" : "Create draft transfer"}
          </Button>
        </div>
        {lastTransferId ? (
          <p className="text-sm text-muted-foreground">
            Last created transfer ID:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{lastTransferId}</code>
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Complete transfer</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Transfer ID</span>
            <input
              className="rounded border bg-background px-2 py-1.5 font-mono text-xs"
              value={completeId}
              onChange={(e) => setCompleteId(e.target.value)}
              placeholder="UUID"
            />
          </label>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => onComplete().catch(() => undefined)}>
            Complete
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={
            /created|completed|Draft/i.test(message)
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

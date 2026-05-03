"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  fetchBranches,
  fetchCurrentShift,
  postCloseShift,
  postOpenShift,
  type BranchRecord,
  type ShiftRecord,
} from "@/lib/api";
import { hasPermission, Permission } from "@/lib/permissions";

function moneyStr(v: number | string | null | undefined): string {
  if (v == null) {
    return "—";
  }
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export default function ShiftsPage() {
  const { me, business } = useDashboard();
  const canOpen = hasPermission(me?.permissions, Permission.ShiftsOpen);
  const canClose = hasPermission(me?.permissions, Permission.ShiftsClose);
  const canRead = hasPermission(me?.permissions, Permission.ShiftsRead);
  const allowed = canOpen || canClose || canRead;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [openNotes, setOpenNotes] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [current, setCurrent] = useState<ShiftRecord | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const refreshCurrent = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Choose a branch.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const s = await fetchCurrentShift(bid);
      setCurrent(s);
      setNotice("Loaded open shift.");
    } catch (e) {
      setCurrent(null);
      const msg = e instanceof Error ? e.message : "Failed to load shift.";
      if (/not\s*found/i.test(msg) || /\b404\b/.test(msg)) {
        setNotice("No open shift for this branch.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  const onOpen = useCallback(async () => {
    if (!branchId.trim() || !openingCash.trim()) {
      setError("Branch and opening cash are required.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const s = await postOpenShift({
        branchId: branchId.trim(),
        openingCash: openingCash.trim(),
        notes: openNotes.trim() || null,
      });
      setCurrent(s);
      setNotice("Shift opened.");
      setOpeningCash("");
      setOpenNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open failed.");
    } finally {
      setLoading(false);
    }
  }, [branchId, openNotes, openingCash]);

  const onClose = useCallback(async () => {
    if (!current?.id || !countedCash.trim()) {
      setError("Load an open shift and enter counted cash.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await postCloseShift(current.id, {
        countedClosingCash: countedCash.trim(),
        notes: closeNotes.trim() || null,
      });
      setCurrent(null);
      setCountedCash("");
      setCloseNotes("");
      setNotice("Shift closed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Close failed.");
    } finally {
      setLoading(false);
    }
  }, [closeNotes, countedCash, current]);

  if (!allowed) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Shifts</h2>
        <p className="text-sm text-muted-foreground">
          You need one of{" "}
          <code className="text-xs">{Permission.ShiftsOpen}</code>,{" "}
          <code className="text-xs">{Permission.ShiftsClose}</code>, or{" "}
          <code className="text-xs">{Permission.ShiftsRead}</code>.
        </p>
      </section>
    );
  }

  const currency = business?.currency?.trim() || "KES";

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Shifts</h2>
        <p className="text-sm text-muted-foreground">
          Open a drawer shift per branch, refresh to see the active shift, then close with a physical count.
          Expected closing includes cash sales from Quick sale; M-Pesa (manual) does not change the drawer expectation ({currency}).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4">
        <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className="rounded border bg-background px-2 py-1.5"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {canRead ? (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => refreshCurrent().catch(() => undefined)}
          >
            {loading ? "Loading…" : "Refresh current shift"}
          </Button>
        ) : null}
      </div>

      {canOpen ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Open shift</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Opening cash</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-32 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </label>
            <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Notes (optional)</span>
              <input
                className="rounded border bg-background px-2 py-1.5"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
              />
            </label>
            <Button type="button" disabled={loading} onClick={() => onOpen().catch(() => undefined)}>
              Open
            </Button>
          </div>
        </div>
      ) : null}

      {current && current.status === "open" ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Current shift</h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Shift ID</dt>
              <dd className="font-mono text-xs">{current.id}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Opening</dt>
              <dd className="tabular-nums">{moneyStr(current.openingCash)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Expected closing</dt>
              <dd className="tabular-nums">{moneyStr(current.expectedClosingCash)}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Opened</dt>
              <dd>{current.openedAt}</dd>
            </div>
          </dl>

          {canClose ? (
            <div className="flex flex-wrap items-end gap-3 border-t pt-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Counted closing cash</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-32 rounded border bg-background px-2 py-1.5 tabular-nums"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                />
              </label>
              <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Notes (optional)</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => onClose().catch(() => undefined)}
              >
                Close shift
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No open shift loaded. Choose a branch and refresh, or open one.
        </p>
      )}

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

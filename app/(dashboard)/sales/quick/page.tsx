"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  fetchBranches,
  fetchCurrentShift,
  fetchItems,
  fetchSaleReceiptPdf,
  postVoidSale,
  tryPostSaleWithRetries,
  type BranchRecord,
  type ItemSummaryRecord,
  type PostSalePayload,
  type SaleRecord,
} from "@/lib/api";
import { readCachedItemsSearch, writeCachedItemsSearch } from "@/lib/catalog-search-cache";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  countPendingSales,
  enqueuePendingSale,
  flushSaleOutbox,
  isSaleOutboxSupported,
} from "@/lib/sale-outbox";

type CartLine = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
};

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseQty(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return roundMoney2(n);
}

function isSaleVoided(sale: SaleRecord): boolean {
  const v = sale.voidedAt;
  return v != null && String(v).length > 0;
}

export default function QuickSalePage() {
  const { me, business } = useDashboard();
  const online = useOnlineStatus();
  const canSell = hasPermission(me?.permissions, Permission.SalesSell);
  const canVoid =
    hasPermission(me?.permissions, Permission.SalesVoidAny) ||
    hasPermission(me?.permissions, Permission.SalesVoidOwn);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searchBanner, setSearchBanner] = useState<string | null>(null);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [payMethod, setPayMethod] = useState<"cash" | "mpesa_manual">("cash");
  const [mpesaRef, setMpesaRef] = useState("");
  const [splitPay, setSplitPay] = useState(false);
  const [cashSplitStr, setCashSplitStr] = useState("");
  const [mpesaSplitStr, setMpesaSplitStr] = useState("");
  const [splitMpesaRef, setSplitMpesaRef] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [outboxBusy, setOutboxBusy] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [voidNotes, setVoidNotes] = useState("");

  const refreshOutbox = useCallback(async () => {
    if (!isSaleOutboxSupported()) {
      setOutboxCount(0);
      return;
    }
    try {
      setOutboxCount(await countPendingSales());
    } catch {
      setOutboxCount(0);
    }
  }, []);

  useEffect(() => {
    if (!canSell) {
      return;
    }
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) {
          const active = list.filter((b) => b.active);
          setBranches(active);
          const def = me?.branchId?.trim();
          if (def && active.some((b) => b.id === def)) {
            setBranchId(def);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [canSell, me?.branchId]);

  useEffect(() => {
    if (!canSell) {
      return;
    }
    queueMicrotask(() => {
      void refreshOutbox();
    });
  }, [canSell, refreshOutbox]);

  useEffect(() => {
    if (!canSell || !online) {
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await flushSaleOutbox();
      if (cancelled) {
        return;
      }
      await refreshOutbox();
      if (r.status === "blocked") {
        setError(`Queued sale blocked: ${r.message}`);
        setNotice("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSell, online, refreshOutbox]);

  useEffect(() => {
    if (!canSell) {
      return;
    }
    const q = search.trim();
    if (!q) {
      return;
    }
    const t = window.setTimeout(() => {
      if (!online) {
        const cached = readCachedItemsSearch(q);
        setHits(cached?.items ?? []);
        if (!cached) {
          setSearchBanner("Offline — no cached search for this query yet.");
        } else if (cached.stale) {
          setSearchBanner("Offline — cached catalog results (may be outdated).");
        } else {
          setSearchBanner("Offline — cached catalog results.");
        }
        return;
      }
      fetchItems(q)
        .then((items) => {
          setHits(items);
          writeCachedItemsSearch(q, items);
          setSearchBanner(null);
        })
        .catch(() => {
          const cached = readCachedItemsSearch(q);
          setHits(cached?.items ?? []);
          setSearchBanner(
            cached
              ? "Could not reach API — showing cached catalog results."
              : "Could not reach API and no cache for this search.",
          );
        });
    }, 320);
    return () => window.clearTimeout(t);
  }, [canSell, search, online]);

  const grandTotal = useMemo(() => {
    let t = 0;
    for (const line of lines) {
      const q = parseQty(line.quantity);
      const p = parseMoney(line.unitPrice);
      if (q != null && p != null) {
        t += roundMoney2(q * p);
      }
    }
    return roundMoney2(t);
  }, [lines]);

  const addLine = useCallback((item: ItemSummaryRecord) => {
    setLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        itemId: item.id,
        label: [item.name, item.sku ? `(${item.sku})` : ""].filter(Boolean).join(" "),
        quantity: "1",
        unitPrice: "",
      },
    ]);
    setSearch("");
    setHits([]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback((key: string, field: "quantity" | "unitPrice", value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)),
    );
  }, []);

  const onRetryOutbox = useCallback(async () => {
    if (!online) {
      setError("Go online to sync queued sales.");
      return;
    }
    setError("");
    setOutboxBusy(true);
    try {
      const r = await flushSaleOutbox();
      await refreshOutbox();
      if (r.status === "blocked") {
        setError(r.message);
      }
    } finally {
      setOutboxBusy(false);
    }
  }, [online, refreshOutbox]);

  const onComplete = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Choose a branch.");
      setNotice("");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line.");
      setNotice("");
      return;
    }
    const payloadLines: { itemId: string; quantity: number; unitPrice: number }[] = [];
    for (const line of lines) {
      const q = parseQty(line.quantity);
      const p = parseMoney(line.unitPrice);
      if (p == null || q == null) {
        setError("Each line needs a positive quantity and valid unit price.");
        setNotice("");
        return;
      }
      if (p < 0) {
        setError("Unit price cannot be negative.");
        setNotice("");
        return;
      }
      payloadLines.push({ itemId: line.itemId, quantity: q, unitPrice: p });
    }
    if (grandTotal <= 0) {
      setError("Grand total must be positive.");
      setNotice("");
      return;
    }
    if (!splitPay && payMethod === "mpesa_manual" && !mpesaRef.trim()) {
      setError("Enter an M-Pesa reference for manual M-Pesa sales.");
      setNotice("");
      return;
    }
    if (splitPay) {
      const c = parseMoney(cashSplitStr);
      const m = parseMoney(mpesaSplitStr);
      if (c == null || m == null || c <= 0 || m <= 0) {
        setError("Split tender needs positive cash and M-Pesa amounts.");
        setNotice("");
        return;
      }
      if (!splitMpesaRef.trim()) {
        setError("Enter the M-Pesa reference for the split.");
        setNotice("");
        return;
      }
      const sum = roundMoney2(c + m);
      if (Math.abs(sum - grandTotal) > 0.001) {
        setError(`Split amounts (${sum.toFixed(2)}) must equal cart total (${grandTotal.toFixed(2)}).`);
        setNotice("");
        return;
      }
    }

    const payments = splitPay
      ? [
          { method: "cash" as const, amount: parseMoney(cashSplitStr)! },
          {
            method: "mpesa_manual" as const,
            amount: parseMoney(mpesaSplitStr)!,
            reference: splitMpesaRef.trim(),
          },
        ]
      : [
          {
            method: payMethod,
            amount: grandTotal,
            reference: payMethod === "mpesa_manual" ? mpesaRef.trim() : null,
          },
        ];

    const idem = nextIdempotencyKey();
    const salePayload: PostSalePayload = {
      branchId: bid,
      lines: payloadLines,
      payments,
      clientSoldAt: new Date().toISOString(),
    };

    const clearCartUi = () => {
      setLines([]);
      setMpesaRef("");
      setCashSplitStr("");
      setMpesaSplitStr("");
      setSplitMpesaRef("");
    };

    setError("");
    setNotice("");

    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    if (offlineNow) {
      if (!isSaleOutboxSupported()) {
        setError("This browser cannot queue offline sales (IndexedDB unavailable).");
        return;
      }
      setLoading(true);
      try {
        await enqueuePendingSale(idem, salePayload);
        clearCartUi();
        setVoidNotes("");
        await refreshOutbox();
        setNotice(
          `Offline: sale queued on this device with idempotency key ${idem.slice(0, 12)}… It will post when you are online with an open shift.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not queue sale.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await fetchCurrentShift(bid);
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : "No open shift.";
      setError(
        /not\s*found|404|no open shift/i.test(msg)
          ? "Open a shift for this branch on the Shifts page before selling."
          : msg,
      );
      return;
    }

    try {
      const result = await tryPostSaleWithRetries(salePayload, idem);
      if (result.ok) {
        setLastSale(result.sale);
        setVoidNotes("");
        clearCartUi();
        setNotice(
          `Sale ${result.sale.id} recorded. Grand total ${grandTotal.toFixed(2)} ${business?.currency?.trim() || "KES"}.`,
        );
        await refreshOutbox();
        const drain = await flushSaleOutbox();
        await refreshOutbox();
        if (drain.status === "blocked") {
          setError(`Earlier queued sale blocked: ${drain.message}`);
        }
        return;
      }

      if (result.status === 0 || result.status >= 500) {
        if (!isSaleOutboxSupported()) {
          setError(result.message);
          return;
        }
        try {
          await enqueuePendingSale(idem, salePayload);
          clearCartUi();
          setVoidNotes("");
          await refreshOutbox();
          setNotice(
            "Server unreachable after retries; sale saved to this device. It will sync when the network and shift are available.",
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not queue sale.");
        }
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    lines,
    grandTotal,
    payMethod,
    mpesaRef,
    splitPay,
    cashSplitStr,
    mpesaSplitStr,
    splitMpesaRef,
    business,
    refreshOutbox,
  ]);

  const onVoidLastSale = useCallback(async () => {
    if (!lastSale || isSaleVoided(lastSale) || !canVoid) {
      return;
    }
    setError("");
    setVoidLoading(true);
    try {
      const updated = await postVoidSale(lastSale.id, { notes: voidNotes || null });
      setLastSale(updated);
      setVoidNotes("");
      setNotice(`Sale ${updated.id} voided. Same-shift reversal applied to stock, ledger, and drawer (cash).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Void failed.");
    } finally {
      setVoidLoading(false);
    }
  }, [lastSale, canVoid, voidNotes]);

  const onDownloadReceiptPdf = useCallback(async () => {
    if (!lastSale) {
      return;
    }
    setError("");
    setReceiptLoading(true);
    try {
      const blob = await fetchSaleReceiptPdf(lastSale.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${lastSale.id}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download receipt.");
    } finally {
      setReceiptLoading(false);
    }
  }, [lastSale]);

  if (!canSell) {
    return (
      <section className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold">Quick sale</h2>
        <p className="text-sm text-muted-foreground">
          You need <code className="text-xs">{Permission.SalesSell}</code> to record POS sales.
        </p>
      </section>
    );
  }

  const currency = business?.currency?.trim() || "KES";

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">Quick sale</h2>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${online ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Installable PWA: this page can be added to the home screen from the browser menu. When offline, sales can be
          queued on-device (IndexedDB) and replayed with the same <code className="text-xs">Idempotency-Key</code> once
          you are online with an open shift. Catalog search uses a short TTL read-through cache for stale/offline hints.
          Cash increases expected drawer closing; M-Pesa (manual) posts to clearing without moving the drawer. Voiding
          reverses the last completed sale only while the same shift is still open (
          <code className="text-xs">{Permission.SalesVoidOwn}</code> /{" "}
          <code className="text-xs">{Permission.SalesVoidAny}</code>).
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
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Add item</h3>
        <div className="flex flex-col gap-2">
          <input
            className="max-w-md rounded border bg-background px-2 py-1.5 text-sm"
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              if (!v.trim()) {
                setHits([]);
                setSearchBanner(null);
              }
            }}
          />
          {searchBanner ? <p className="max-w-md text-xs text-amber-800">{searchBanner}</p> : null}
          {hits.length > 0 ? (
            <ul className="max-h-48 max-w-md overflow-auto rounded border bg-background text-sm">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left hover:bg-accent"
                    onClick={() => addLine(h)}
                  >
                    {h.name} <span className="text-muted-foreground">{h.sku}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Cart</h3>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-end gap-3 border-b border-dashed pb-3 last:border-0"
              >
                <div className="min-w-[12rem] flex-1 text-sm">
                  <p className="font-medium">{line.label}</p>
                  <p className="text-xs text-muted-foreground">{line.itemId}</p>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Qty</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-24 rounded border bg-background px-2 py-1.5 tabular-nums"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Unit ({currency})</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.key, "unitPrice", e.target.value)}
                  />
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.key)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm tabular-nums">
          Total: <span className="font-medium">{grandTotal.toFixed(2)}</span> {currency}
        </p>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Payment</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splitPay}
            onChange={(e) => setSplitPay(e.target.checked)}
          />
          Split cash + M-Pesa (amounts must equal total)
        </label>

        {splitPay ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Cash ({currency})</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={cashSplitStr}
                onChange={(e) => setCashSplitStr(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">M-Pesa ({currency})</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={mpesaSplitStr}
                onChange={(e) => setMpesaSplitStr(e.target.value)}
              />
            </label>
            <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">M-Pesa ref</span>
              <input
                className="rounded border bg-background px-2 py-1.5"
                value={splitMpesaRef}
                onChange={(e) => setSplitMpesaRef(e.target.value)}
                placeholder="Confirmation code"
              />
            </label>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={payMethod === "cash"}
                  onChange={() => setPayMethod("cash")}
                />
                Cash
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={payMethod === "mpesa_manual"}
                  onChange={() => setPayMethod("mpesa_manual")}
                />
                M-Pesa (manual ref)
              </label>
            </div>
            {payMethod === "mpesa_manual" ? (
              <label className="flex max-w-md flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Reference</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={mpesaRef}
                  onChange={(e) => setMpesaRef(e.target.value)}
                  placeholder="e.g. QPH12ABC"
                />
              </label>
            ) : null}
          </>
        )}
        {outboxCount > 0 ? (
          <p className="text-sm text-amber-900">
            {outboxCount} sale(s) waiting to sync on this device.{" "}
            <button
              type="button"
              className="underline-offset-2 hover:underline disabled:opacity-50"
              disabled={outboxBusy || !online}
              onClick={() => onRetryOutbox().catch(() => undefined)}
            >
              {outboxBusy ? "Syncing…" : "Retry sync"}
            </button>
          </p>
        ) : null}
        <Button type="button" disabled={loading} onClick={() => onComplete().catch(() => undefined)}>
          {loading ? "Recording…" : "Complete sale"}
        </Button>
      </div>

      {lastSale ? (
        <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-4">
          <h3 className="text-sm font-medium">Last sale (this session)</h3>
          <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-normal">Sale</dt>{" "}
              <dd className="inline font-mono text-foreground">{lastSale.id}</dd>
            </div>
            <div>
              <dt className="inline font-normal">Total</dt>{" "}
              <dd className="inline tabular-nums text-foreground">
                {Number(lastSale.grandTotal).toFixed(2)} {currency}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-normal">Sale journal</dt>{" "}
              <dd className="inline font-mono text-foreground">{lastSale.journalEntryId}</dd>
            </div>
            {isSaleVoided(lastSale) ? (
              <>
                <div className="sm:col-span-2">
                  <dt className="inline font-normal">Voided</dt>{" "}
                  <dd className="inline text-foreground">
                    {String(lastSale.voidedAt)}
                    {lastSale.voidJournalEntryId ? (
                      <>
                        {" "}
                        · void JE{" "}
                        <span className="font-mono">{lastSale.voidJournalEntryId}</span>
                      </>
                    ) : null}
                  </dd>
                </div>
                {lastSale.voidNotes ? (
                  <div className="sm:col-span-2">
                    <dt className="inline font-normal">Notes</dt>{" "}
                    <dd className="inline text-foreground">{lastSale.voidNotes}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={receiptLoading}
              onClick={() => onDownloadReceiptPdf().catch(() => undefined)}
            >
              {receiptLoading ? "Downloading…" : "Receipt PDF"}
            </Button>
          </div>
          {canVoid && !isSaleVoided(lastSale) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Void notes (optional)</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={voidNotes}
                  onChange={(e) => setVoidNotes(e.target.value)}
                  placeholder="Reason / reference"
                  disabled={voidLoading}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={voidLoading}
                onClick={() => onVoidLastSale().catch(() => undefined)}
              >
                {voidLoading ? "Voiding…" : "Void this sale"}
              </Button>
            </div>
          ) : null}
          {!canVoid && !isSaleVoided(lastSale) ? (
            <p className="text-xs text-muted-foreground">
              You do not have void permission on this account. Ask an admin to grant{" "}
              <code className="text-xs">{Permission.SalesVoidOwn}</code> or{" "}
              <code className="text-xs">{Permission.SalesVoidAny}</code>.
            </p>
          ) : null}
        </div>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

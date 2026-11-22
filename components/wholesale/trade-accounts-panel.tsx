"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  decideTradeAccount,
  fetchItems,
  fetchTradeAccountPrices,
  fetchTradeAccounts,
  saveTradeAccountPrices,
  type TradeAccount,
  type TradeAccountPrice,
} from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  applied: "Asked for an account",
  approved: "Approved",
  declined: "Declined",
  suspended: "Suspended",
};

/** The prices one shop's account has for particular products. Saved as a whole list. */
function AccountPrices({ accountId }: { accountId: string }) {
  const [prices, setPrices] = useState<TradeAccountPrice[] | null>(null);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTradeAccountPrices(accountId)
      .then((rows) => {
        if (alive) setPrices(rows);
      })
      .catch(() => {
        if (alive) setPrices(null);
      });
    return () => {
      alive = false;
    };
  }, [accountId]);

  if (!prices) return null;

  const search = async () => {
    if (term.trim().length < 2) return;
    try {
      const rows = await fetchItems(term, { size: 6 });
      setFound(rows.map((r) => ({ id: r.id, name: r.name })));
    } catch {
      toast.error("Could not search your products");
    }
  };

  const save = async () => {
    if (prices.some((p) => !(p.unitPrice > 0))) {
      toast.error("Every product on the list needs a price");
      return;
    }
    setBusy(true);
    try {
      setPrices(await saveTradeAccountPrices(accountId, prices.map((p) => ({ itemId: p.itemId, unitPrice: p.unitPrice }))));
      toast.success("Prices saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the prices");
    } finally {
      setBusy(false);
    }
  };

  const field = "h-11 border border-foreground/15 bg-background px-2 text-[14px] sm:h-9";
  return (
    <div className="mt-3 max-w-md border-t border-border pt-3 text-[13px]">
      <p className="font-medium">This shop&apos;s own prices</p>
      <p className="text-[12px] text-muted-foreground">A price here replaces your shelf price and any discount for this shop.</p>
      <ul className="mt-2 space-y-2">
        {prices.map((p) => (
          <li key={p.itemId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{p.itemName ?? "Product"}</span>
            <input
              className={`${field} w-28 text-right tabular-nums`}
              inputMode="decimal"
              aria-label={`Price of ${p.itemName ?? "product"} for this shop`}
              value={p.unitPrice || ""}
              onChange={(e) =>
                setPrices((rows) =>
                  (rows ?? []).map((r) => (r.itemId === p.itemId ? { ...r, unitPrice: Number(e.target.value) || 0 } : r)),
                )
              }
            />
            <button
              type="button"
              className="min-h-11 text-[12px] font-medium underline underline-offset-4 sm:min-h-9"
              onClick={() => setPrices((rows) => (rows ?? []).filter((r) => r.itemId !== p.itemId))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className={`${field} min-w-0 flex-1`}
          placeholder="Search a product to add"
          aria-label="Search a product to add"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => void search()}>
          Search
        </Button>
      </div>
      {found.length > 0 ? (
        <ul className="mt-1 divide-y divide-border border border-border">
          {found
            .filter((f) => !prices.some((p) => p.itemId === f.id))
            .map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center px-2 text-left hover:bg-foreground/[0.04] sm:min-h-9"
                  onClick={() => setPrices((rows) => [...(rows ?? []), { itemId: f.id, unitPrice: 0, itemName: f.name }])}
                >
                  {f.name}
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      <Button type="button" size="sm" className="mt-2" disabled={busy} onClick={() => void save()}>
        Save prices
      </Button>
    </div>
  );
}

/**
 * Buyers who asked this supplier for an account. Approving one marks that buyer's later orders as
 * "on account". The phone number is not verified, so this is the supplier's own note about a buyer.
 */
export function TradeAccountsPanel({ canDecide }: { canDecide: boolean }) {
  const [accounts, setAccounts] = useState<TradeAccount[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [limit, setLimit] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    setFailed(false);
    fetchTradeAccounts()
      .then((rows) => {
        if (alive) setAccounts(rows);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const decide = async (account: TradeAccount, status: "approved" | "declined" | "suspended") => {
    const creditLimit = limit.trim() === "" ? null : Number(limit);
    const termsDays = days.trim() === "" ? null : Number(days);
    if (status === "approved") {
      if (creditLimit != null && !(creditLimit >= 0)) {
        toast.error("Enter the credit limit as a number, or leave it empty");
        return;
      }
      if (termsDays != null && !(Number.isInteger(termsDays) && termsDays >= 0 && termsDays <= 365)) {
        toast.error("Days to pay must be a whole number from 0 to 365");
        return;
      }
    }
    setBusy(true);
    try {
      await decideTradeAccount(account.id, { status, creditLimit, termsDays });
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "h-11 w-full border border-foreground/15 bg-background px-2 text-[14px] tabular-nums sm:h-9";

  if (failed) {
    return (
      <p className="mt-6 text-[14px] text-foreground">
        Could not load the accounts.{" "}
        <button type="button" className="font-medium underline underline-offset-4" onClick={() => load()}>
          Try again
        </button>
      </p>
    );
  }
  if (accounts == null) return <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>;
  if (accounts.length === 0) {
    return <p className="mt-6 text-[14px] text-muted-foreground">No buyer has asked for an account yet.</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-border border-y border-border">
      {accounts.map((a) => (
        <li key={a.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="text-[14px] font-medium">{a.businessName || a.buyerName}</p>
              <p className="text-[12px] text-muted-foreground">
                {a.businessName ? `${a.buyerName} · ` : ""}
                {a.buyerPhone} · {STATUS_LABEL[a.status] ?? a.status}
                {a.status === "approved" && a.creditLimit != null ? ` · limit ${a.creditLimit.toLocaleString()}` : ""}
                {a.status === "approved" && a.termsDays != null ? ` · ${a.termsDays} days to pay` : ""}
                {a.status === "approved" && a.discountPercent ? ` · ${a.discountPercent}% discount` : ""}
                {a.buyerVerified ? " · shop verified by staff sign-in" : " · phone number only"}
              </p>
              {a.note ? <p className="mt-1 text-[13px] text-foreground">{a.note}</p> : null}
              {a.buyerVerified && a.status === "approved" && canDecide ? <AccountPrices accountId={a.id} /> : null}
            </div>
            {canDecide && editing !== a.id ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(a.id);
                  setLimit(a.creditLimit != null ? String(a.creditLimit) : "");
                  setDays(a.termsDays != null ? String(a.termsDays) : "");
                }}
              >
                Decide
              </Button>
            ) : null}
          </div>
          {editing === a.id ? (
            <div className="mt-3 grid max-w-md gap-2">
              <label className="text-[13px]">
                Credit limit (optional)
                <input className={`${inputClass} mt-1`} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
              </label>
              <label className="text-[13px]">
                Days to pay (optional)
                <input className={`${inputClass} mt-1`} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void decide(a, "approved")}>
                  Approve
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void decide(a, "declined")}>
                  Decline
                </Button>
                {a.status === "approved" ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void decide(a, "suspended")}>
                    Suspend
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
              <p className="text-[12px] leading-snug text-muted-foreground">
                The phone number is not verified. Check who you are delivering to before you give goods on credit.
              </p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

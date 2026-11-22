"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCounterTerms, type CounterTerms } from "@/lib/counter-terms";

/**
 * At a supplier's counter: the clerk enters the buyer's phone number, and the buyer's account prices and
 * discount are applied to the order. Clearing it puts the shelf prices back.
 */
export function TradeTermsBar({
  terms,
  currency,
  onChange,
}: {
  terms: CounterTerms | null;
  currency: string;
  onChange: (terms: CounterTerms | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  if (terms?.found) {
    const discount = Number(terms.discountPercent ?? 0);
    const ownPrices = Object.keys(terms.prices ?? {}).length;
    return (
      <div className="shrink-0 border-b border-foreground/10 px-3 py-2 text-[13px]">
        <p className="font-medium text-foreground">
          Account: {terms.businessName || terms.buyerName || "Trade customer"}
        </p>
        <p className="text-muted-foreground">
          {discount > 0 ? `${discount}% discount` : "No discount"}
          {ownPrices > 0 ? ` · ${ownPrices} agreed prices` : ""}
          {terms.creditAvailable != null
            ? ` · ${currency} ${Number(terms.creditAvailable).toLocaleString()} credit left`
            : ""}
        </p>
        <button
          type="button"
          className="mt-1 font-medium underline underline-offset-4"
          onClick={() => {
            onChange(null);
            setPhone("");
          }}
        >
          Remove account
        </button>
      </div>
    );
  }

  const apply = async () => {
    setBusy(true);
    try {
      const next = await fetchCounterTerms(phone);
      if (!next.found) {
        toast.error("This phone number has no approved account");
        return;
      }
      onChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex shrink-0 items-center gap-2 border-b border-foreground/10 px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        void apply();
      }}
    >
      <Input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        inputMode="tel"
        placeholder="Account phone number"
        aria-label="Account phone number"
        className="h-9"
      />
      <Button type="submit" size="sm" variant="outline" disabled={busy || phone.trim() === ""}>
        Use account
      </Button>
    </form>
  );
}

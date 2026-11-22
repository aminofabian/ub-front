"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchCounterInvoiceAccount,
  putCounterInvoiceOnAccount,
  type CounterInvoiceAccount,
} from "@/lib/counter-terms";

/**
 * Owner or admin only: put a pending counter invoice on the account the clerk priced it for, so no payment is
 * taken now. The server checks the prices and the credit limit again.
 */
export function CounterOnAccountButton({ invoiceId, onDone }: { invoiceId: string; onDone: () => void }) {
  const [account, setAccount] = useState<CounterInvoiceAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const look = async () => {
    setBusy(true);
    try {
      setAccount(await fetchCounterInvoiceAccount(invoiceId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the account");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      await putCounterInvoiceOnAccount(invoiceId);
      toast.success("Put on the account. No payment is due at the till.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <button
        type="button"
        disabled={busy}
        className="mt-1 shrink-0 text-[12px] font-medium underline underline-offset-4 disabled:opacity-50"
        onClick={(event) => {
          event.stopPropagation();
          void look();
        }}
      >
        On account
      </button>
    );
  }

  return (
    <div
      className="mt-1 flex w-full basis-full flex-wrap items-center gap-2 text-[12px]"
      onClick={(event) => event.stopPropagation()}
    >
      {account.found ? (
        <>
          <span>
            Put on the account of {account.businessName || account.buyerName || "this buyer"}
            {account.buyerPhone ? ` (${account.buyerPhone})` : ""}?
          </span>
          <Button type="button" size="sm" disabled={busy} onClick={() => void send()}>
            Put on account
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground">The clerk did not pick an account for this invoice.</span>
      )}
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setAccount(null)}>
        {account.found ? "Cancel" : "Close"}
      </Button>
    </div>
  );
}

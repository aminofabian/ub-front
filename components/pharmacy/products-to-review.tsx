"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RX_INK, RX_MUTED, RX_RULE, errorText, formatDate } from "@/components/pharmacy/pharmacy-ui";
import { Panel } from "@/components/sms-hub/sms-hub-ui";
import { Button } from "@/components/ui/button";
import {
  confirmProductsReviewed,
  fetchProductsToReview,
  markMedicines,
  type ProductsToReview,
} from "@/lib/pharmacy-api";
import { cn } from "@/lib/utils";

/**
 * Products added since the pharmacist last looked, none of them marked as a medicine. The
 * question asked when a product is added at the till can be answered wrongly; this is where
 * someone who manages the pharmacy catches it. Shown only when there is something to check.
 */
export function ProductsToReviewPanel({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<ProductsToReview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProductsToReview()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {
        // The Medicines list itself reports a connection problem; this panel simply stays away.
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.total === 0) return null;

  const mark = async (itemId: string, name: string) => {
    setBusy(itemId);
    try {
      await markMedicines({ itemIds: [itemId] });
      setData(await fetchProductsToReview());
      onChanged();
      toast.success(`${name} is now a medicine. Set its class before it is sold.`);
    } catch (err) {
      toast.error(errorText(err, "Could not mark it. Check the connection and try again."));
    } finally {
      setBusy(null);
    }
  };

  const done = async () => {
    setBusy("done");
    try {
      setData(await confirmProductsReviewed());
      toast.success("Noted. You will be shown products added from now on.");
    } catch (err) {
      toast.error(errorText(err, "Could not save. Check the connection and try again."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel
      title={`${data.total} ${data.total === 1 ? "product" : "products"} added since ${formatDate(data.since)}`}
      description="None is marked as a medicine. Mark any that are, so the class, lot and expiry rules apply. Then confirm the rest."
      aside={
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void done()}>
          {busy === "done" ? "Saving…" : "None of the rest are medicines"}
        </Button>
      }
      flush
    >
      <ul className="max-h-72 overflow-y-auto">
        {data.products.map((p) => (
          <li key={p.itemId} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 last:border-0", RX_RULE)}>
            <span className="min-w-[12rem] flex-1">
              <span className={cn("font-medium", RX_INK)}>{p.name}</span>
              {p.variantName ? <span className={RX_MUTED}> {p.variantName}</span> : null}
            </span>
            <span className={cn("text-[13px] tabular-nums", RX_MUTED)}>Added {formatDate(p.addedAt)}</span>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void mark(p.itemId, p.name)}>
              {busy === p.itemId ? "Marking…" : "This is a medicine"}
            </Button>
          </li>
        ))}
      </ul>
      {data.total > data.products.length ? (
        <p className={cn("border-t px-4 py-2 text-[13px]", RX_RULE, RX_MUTED)}>
          Showing the newest {data.products.length}. Confirm these to see the rest.
        </p>
      ) : null}
    </Panel>
  );
}

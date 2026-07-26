"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  approveMarketplaceProductEdit,
  fetchMarketplaceProductEditRequests,
  rejectMarketplaceProductEdit,
  type MarketplaceProductEditRequest,
} from "@/lib/marketplace-api";

function fmtProposed(proposed: Record<string, unknown>): string {
  return Object.entries(proposed)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default function MarketplaceProductEditsPage() {
  const [rows, setRows] = useState<MarketplaceProductEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchMarketplaceProductEditRequests());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load edit requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approveMarketplaceProductEdit(id);
      toast.success("Product edit approved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: string) => {
    const note = window.prompt("Optional rejection note") ?? undefined;
    setBusyId(id);
    try {
      await rejectMarketplaceProductEdit(id, note || undefined);
      toast.success("Product edit rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Supplier product edits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject catalogue changes from connected marketplace suppliers when
          platform approval is required.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending product edits.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((row) => (
            <li key={row.id} className="space-y-2 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.productName}</p>
                  <p className="text-sm text-muted-foreground">{row.supplierName}</p>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Proposed: </span>
                    {fmtProposed(row.proposed) || "—"}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Live: </span>
                    {fmtProposed(row.liveSnapshot) || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => void onApprove(row.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => void onReject(row.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

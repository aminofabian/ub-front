"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { fetchSaSupplierEngagement, setSaSupplierEngagement } from "@/lib/super-admin-api";

/**
 * Platform staff switch the portal overview and readiness checklist on or off for one supplier. It is a switch on
 * the supplier's page because a supplier with no shop has no business to carry a flag (decision D2). Off by default.
 */
export function SupplierEngagementSwitch({ supplierId }: { supplierId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setEnabled(null);
    fetchSaSupplierEngagement(supplierId)
      .then((state) => {
        if (active) setEnabled(state.enabled);
      })
      .catch(() => {
        if (active) setEnabled(null);
      });
    return () => {
      active = false;
    };
  }, [supplierId]);

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      const state = await setSaSupplierEngagement(supplierId, next);
      setEnabled(state.enabled);
      toast.success(state.enabled ? "Portal overview switched on" : "Portal overview switched off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex items-start justify-between gap-4 border border-foreground/15 px-3 py-3">
      <div className="text-[13px]">
        <p className="font-medium text-foreground">Portal overview and checklist</p>
        <p className="mt-0.5 text-muted-foreground">
          Shows this supplier, in the portal, what is waiting for an answer, how quickly it answers, and the steps
          to get ready. Works with or without a shop.
          {enabled === null ? " Could not read the current setting." : ""}
        </p>
      </div>
      <Switch
        checked={enabled === true}
        disabled={busy || enabled === null}
        onCheckedChange={(next) => void change(next)}
        aria-label="Portal overview and checklist"
      />
    </div>
  );
}

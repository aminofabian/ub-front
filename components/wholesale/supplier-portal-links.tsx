"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { openSupplierPortalSession } from "@/lib/api";
import { isSupplierBusiness } from "@/lib/business-store-type";
import { APP_ROUTES } from "@/lib/config";
import { shopPathForPortalPath } from "@/lib/supplier-portal-paths";
import { setSupplierPortalAccessToken, setSupplierPortalSessionId } from "@/lib/supplier-portal-session";

/** The portal pages that have no equivalent in the shop yet, in the words a supplier would use for them. */
const LINKS: { label: string; hint: string; href: string }[] = [
  { label: "Shops you supply", hint: "How your products are selling in each shop, and what to restock", href: APP_ROUTES.supplierPortalShops },
  { label: "Purchase orders from shops", hint: "Orders shops sent you from their own purchasing", href: APP_ROUTES.supplierPortalOrders },
  { label: "Deliveries", hint: "What is on its way and what has arrived", href: APP_ROUTES.supplierPortalDeliveries },
  { label: "Messages", hint: "Messages between you and the shops you supply", href: APP_ROUTES.supplierPortalMessages },
  { label: "What shops have paid", hint: "Payments and invoices as each shop recorded them", href: APP_ROUTES.supplierPortalPayments },
  { label: "Statements", hint: "A statement for each shop, to download", href: APP_ROUTES.supplierPortalStatements },
  { label: "Reports", hint: "Reports to download", href: APP_ROUTES.supplierPortalReports },
];

/**
 * In a supplier's shop: opens the supplier portal already signed in. The portal keeps its own pages for now; this
 * is the way into them from the shop, with no second sign-in. The trade desk above shows orders placed in this
 * shop; "Purchase orders from shops" is the other stream, sent from a shop's own purchasing.
 */
export function SupplierPortalLinks() {
  const { business } = useDashboard();
  const [busy, setBusy] = useState<string | null>(null);

  if (!isSupplierBusiness(business)) {
    return null;
  }

  const open = async (href: string) => {
    setBusy(href);
    try {
      const session = await openSupplierPortalSession();
      setSupplierPortalAccessToken(session.accessToken);
      if (session.sessionId) {
        setSupplierPortalSessionId(session.sessionId);
      }
      // On the shop's own address the page lives at its short address, with no `/supplier-portal` in it.
      window.location.assign(shopPathForPortalPath(href));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the supplier portal");
      setBusy(null);
    }
  };

  return (
    <section aria-label="Shops you supply" className="mt-4">
      <p className="text-[13px] text-muted-foreground">
        These are about orders shops sent from their own purchasing. Orders placed in your shop are under Orders.
      </p>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <button
              type="button"
              disabled={busy !== null}
              className="min-h-11 w-full border border-foreground/15 px-3 py-2 text-left disabled:opacity-60"
              onClick={() => void open(link.href)}
            >
              <span className="block text-[14px] font-medium text-foreground">
                {busy === link.href ? "Opening…" : link.label}
              </span>
              <span className="block text-[12px] text-muted-foreground">{link.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

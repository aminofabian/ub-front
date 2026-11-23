"use client";

import { useDashboard } from "@/components/dashboard-provider";
import { SupplierHeading } from "@/components/wholesale/supplier-nav";
import { isClerkCounterBusiness, isWholesaleOnlyBusiness } from "@/lib/business-store-type";

/**
 * A supplier's Trade page on the desktop till. Trade orders, buyer accounts and the marketplace page are kept
 * online and are not copied onto a till, so working on them here would leave the buyer and the online shop
 * not knowing. The page says where each part of a supplier's work is done: on this till, or online.
 */
export function TradeOnDesktop() {
  const { business } = useDashboard();
  const slug = business?.slug?.trim() ?? "";
  const domain = business?.primaryDomain?.trim() ?? "";
  const host = domain || (slug ? `${slug}.kiosk.ke` : "");
  const address = host ? `${host}/trade` : "";
  const counter = isClerkCounterBusiness(business);
  const hasTill = !isWholesaleOnlyBusiness(business);

  const here: { title: string; detail: string }[] = [
    ...(counter
      ? [{ title: "Counter orders", detail: "A clerk writes up the order and prints the slip. The cashier takes the payment." }]
      : hasTill
        ? [{ title: "Selling at the till", detail: "Ring a sale and take payment. Sales reach your online shop when the till syncs." }]
        : []),
    { title: "Products and prices", detail: "The products and prices from your online shop, copied onto this till." },
    { title: "Stock", detail: "Receive deliveries and count what you have." },
  ];
  const online: { title: string; detail: string }[] = [
    { title: "Trade orders", detail: "Answer what a buyer asked for, then mark it dispatched." },
    { title: "Buyer accounts and invoices", detail: "Who buys on account, credit limits, and what is still owed. Selling on account is done online, not at this till." },
    { title: "Shops you supply", detail: "What to restock in each shop, and your messages with them." },
    { title: "Your page", detail: "What buyers read about you on the marketplace, how you are paid, and listing the page." },
  ];

  const column = (heading: string, lead: string, rows: { title: string; detail: string }[]) => (
    <section className="min-w-0">
      <h2 className="text-[15px] font-semibold text-foreground">{heading}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{lead}</p>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <li key={row.title} className="py-3">
            <span className="block text-[14px] font-medium text-foreground">{row.title}</span>
            <span className="block text-[13px] text-muted-foreground">{row.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <SupplierHeading
        title="Trade"
        purpose="Orders from buyers are answered in your online shop. This till does not hold them, so nothing here can go missing between the two."
      />

      <div className="mt-6 border-y border-border py-4">
        <p className="text-[14px] text-foreground">Open your trade desk on any phone or computer with internet:</p>
        {address ? (
          <p className="mt-1 select-all font-mono text-[1.15rem] text-foreground">{address}</p>
        ) : (
          <p className="mt-1 text-[14px] text-foreground">
            Sign in to your shop on kiosk.ke and choose Trade. This till is not linked to an online shop yet; link it under
            Settings, Desktop.
          </p>
        )}
        <p className="mt-1 text-[13px] text-muted-foreground">Sign in there as you do on kiosk.ke.</p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {column("On this till", "Works with or without internet.", here)}
        <div className="min-w-0 lg:border-l lg:border-border lg:pl-10">
          {column("Online", address ? `At ${address}.` : "In your shop on kiosk.ke.", online)}
        </div>
      </div>
    </div>
  );
}

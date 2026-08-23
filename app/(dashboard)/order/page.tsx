import type { Metadata } from "next";

import { TenantOrderWorkspace } from "./_components/tenant-order-workspace";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

type PageProps = {
  searchParams: Promise<{
    ticket?: string | string[];
    o?: string | string[];
    sid?: string | string[];
    msid?: string | string[];
    r?: string | string[];
  }>;
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function TenantOrderPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const ticket = first(query.ticket) ?? first(query.o);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-0 sm:px-4 sm:py-3 lg:px-5">
      <TenantOrderWorkspace
        initialTicket={ticket}
        initialSupplierId={first(query.sid)}
        initialMarketplaceSupplierId={first(query.msid)}
        initialRoundTo10={first(query.r) === "10"}
      />
    </div>
  );
}

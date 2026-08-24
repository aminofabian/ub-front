"use client";

import { useSearchParams } from "next/navigation";

import { TenantOrderWorkspace } from "./tenant-order-workspace";

/**
 * Client-side search-params reader for the order page.
 *
 * The page used to be an async server component that awaited `searchParams`,
 * which cannot be statically exported (`output: 'export'`, desktop SKU).
 * Reading the query client-side via `useSearchParams()` inside a Suspense
 * boundary is the documented pattern for static exports and behaves the same:
 * the workspace mounts with the URL's `ticket` / `o` / `sid` / `msid` / `r`
 * values when present.
 */
export function OrderPageShell() {
  const sp = useSearchParams();
  const ticket = sp.get("ticket") ?? sp.get("o");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-0 sm:px-4 sm:py-3 lg:px-5">
      <TenantOrderWorkspace
        initialTicket={ticket}
        initialSupplierId={sp.get("sid")}
        initialMarketplaceSupplierId={sp.get("msid")}
        initialRoundTo10={sp.get("r") === "10"}
      />
    </div>
  );
}

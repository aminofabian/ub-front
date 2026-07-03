import { Suspense } from "react";

import { ButcherCashierWorkspace } from "@/components/butcher/butcher-cashier-workspace";

export default function ButcherCashierPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <ButcherCashierWorkspace />
    </Suspense>
  );
}

import { Suspense } from "react";

import { ButcherCashierWorkspace } from "@/components/butcher/butcher-cashier-workspace";

export default function ButcherCashierPage() {
  return (
    <Suspense fallback={null}>
      <ButcherCashierWorkspace />
    </Suspense>
  );
}

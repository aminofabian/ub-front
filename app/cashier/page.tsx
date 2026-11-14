import { Suspense } from "react";

import { CashierScreen } from "@/components/cashier/cashier-screen";

export default function CashierHomePage() {
  return (
    <Suspense fallback={null}>
      <CashierScreen />
    </Suspense>
  );
}

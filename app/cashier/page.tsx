import { Suspense } from "react";
import { QuickSaleWorkspace } from "@/components/cashier/quick-sale-workspace";

export default function CashierHomePage() {
  return (
    <Suspense fallback={null}>
      <QuickSaleWorkspace variant="cashier" />
    </Suspense>
  );
}

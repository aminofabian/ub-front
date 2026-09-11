import { Suspense } from "react";
import { CustomerSegmentsWorkspace } from "@/components/credits/customer-segments-workspace";

export default function CustomerSegmentsPage() {
  return (
    <Suspense>
      <CustomerSegmentsWorkspace />
    </Suspense>
  );
}

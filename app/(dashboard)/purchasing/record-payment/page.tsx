import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";

/** Money lives on Records — open unpaid + advance deposit. */
export default function RecordSupplierPaymentPage() {
  redirect(`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid&deposit=1`);
}

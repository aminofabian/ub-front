import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";

/** Supplier payments are recorded per supply receipt on the Supplies page (Pay drawer). */
export default function RecordSupplierPaymentPage() {
  redirect(`${APP_ROUTES.purchasingAddSupplies}?filter=unpaid`);
}

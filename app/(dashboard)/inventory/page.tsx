import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";

/** `/inventory` has no board of its own — land on Stock Home. */
export default function InventoryIndexPage() {
  redirect(APP_ROUTES.inventoryStock);
}

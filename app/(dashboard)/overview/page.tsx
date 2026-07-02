import { redirect } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";

export default function OverviewPage() {
  redirect(APP_ROUTES.business);
}

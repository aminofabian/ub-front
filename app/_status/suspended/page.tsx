import { TenantStatusPage } from "@/components/storefront/tenant-status-page";

export const metadata = {
  title: "Workspace suspended",
  robots: { index: false, follow: false },
};

export default function SuspendedPage() {
  return <TenantStatusPage status="SUSPENDED" />;
}

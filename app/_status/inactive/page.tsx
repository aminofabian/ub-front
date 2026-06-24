import { TenantStatusPage } from "@/components/storefront/tenant-status-page";

export const metadata = {
  title: "Workspace inactive",
  robots: { index: false, follow: false },
};

export default function InactivePage() {
  return <TenantStatusPage status="INACTIVE" />;
}

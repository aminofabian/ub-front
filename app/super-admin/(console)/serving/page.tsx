"use client";

import { ServingDesk } from "@/components/super-admin/serving-desk";
import { fetchSuperAdminMe, type SuperAdminMe } from "@/lib/super-admin-api";
import * as React from "react";

export default function SuperAdminServingPage() {
  const [me, setMe] = React.useState<SuperAdminMe | null>(null);

  React.useEffect(() => {
    void fetchSuperAdminMe().then(setMe).catch(() => setMe(null));
  }, []);

  return <ServingDesk deskRole={me?.deskRole} />;
}

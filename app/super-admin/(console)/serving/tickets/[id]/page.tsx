"use client";

import { ServingTicketWorkspace } from "@/components/super-admin/serving-ticket-workspace";
import { fetchSuperAdminMe, type SuperAdminMe } from "@/lib/super-admin-api";
import { useParams } from "next/navigation";
import * as React from "react";

export default function SuperAdminServingTicketPage() {
  const params = useParams<{ id: string }>();
  const [me, setMe] = React.useState<SuperAdminMe | null>(null);

  React.useEffect(() => {
    void fetchSuperAdminMe().then(setMe).catch(() => setMe(null));
  }, []);

  return <ServingTicketWorkspace ticketId={params.id} deskRole={me?.deskRole} />;
}

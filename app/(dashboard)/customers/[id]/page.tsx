"use client";

import { useParams } from "next/navigation";

import { CustomersWorkspace } from "@/components/credits/customers-workspace";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  return <CustomersWorkspace initialCustomerId={id} />;
}

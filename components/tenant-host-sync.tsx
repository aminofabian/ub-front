"use client";

import { useEffect } from "react";

import { syncTenantHostFromBrowserHostname } from "@/lib/auth";

export function TenantHostSync() {
  useEffect(() => {
    syncTenantHostFromBrowserHostname();
  }, []);
  return null;
}

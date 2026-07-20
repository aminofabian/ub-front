"use client";

import { getSessionTenantId, hasAccessSession } from "@/lib/auth";

const STORE_SESSION_PATH = "/api/auth/store-session";

/**
 * Native form POST so the server prefetches dashboard data before redirect.
 * Gap G3: access JWT is not posted — store-session reads httpOnly `ub.access`.
 */
export function submitStoreSessionNavigate(nextPath: string): void {
  const tenantId = getSessionTenantId()?.trim();
  if (!hasAccessSession() || !tenantId) {
    window.location.assign(nextPath);
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = STORE_SESSION_PATH;

  const fields: Record<string, string> = {
    tenantId,
    next: nextPath,
  };

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

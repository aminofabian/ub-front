"use client";

import { getSessionTenantId, getSessionTokens } from "@/lib/auth";

const STORE_SESSION_PATH = "/api/auth/store-session";

/** Native form POST so the server prefetches dashboard data before redirect (iPad-safe). */
export function submitStoreSessionNavigate(nextPath: string): void {
  const tokens = getSessionTokens();
  const tenantId = getSessionTenantId()?.trim();
  if (!tokens?.accessToken || !tenantId) {
    window.location.assign(nextPath);
    return;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = STORE_SESSION_PATH;

  const fields: Record<string, string> = {
    accessToken: tokens.accessToken,
    tenantId,
    next: nextPath,
  };
  if (tokens.refreshToken?.trim()) {
    fields.refreshToken = tokens.refreshToken.trim();
  }

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

"use client";

import { getSessionTenantId, hasAccessSession } from "@/lib/auth";

const STORE_SESSION_PATH = "/api/auth/store-session";

export type StoreSessionNavigateOptions = {
  /** Required for cross-origin handoff (e.g. SA impersonation) before ub.access exists. */
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
};

/**
 * Native form POST so the server prefetches dashboard data before redirect.
 * Gap G3: prefers httpOnly `ub.access` when the form omits accessToken.
 * Impersonation / legacy handoff must pass accessToken (+ refresh) so the
 * tenant host can mint cookies — refresh alone cannot, because ub.refresh
 * does not exist on that host yet.
 */
export function submitStoreSessionNavigate(
  nextPath: string,
  opts?: StoreSessionNavigateOptions,
): void {
  const tenantId =
    opts?.tenantId?.trim() || getSessionTenantId()?.trim() || "";
  const accessToken = opts?.accessToken?.trim() || "";
  const refreshToken = opts?.refreshToken?.trim() || "";

  if (!tenantId || (!accessToken && !hasAccessSession())) {
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
  if (accessToken) {
    fields.accessToken = accessToken;
  }
  if (refreshToken) {
    fields.refreshToken = refreshToken;
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

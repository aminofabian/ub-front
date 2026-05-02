import { API_BASE_URL, API_ROUTES } from "@/lib/config";
import { extractPageContent } from "@/lib/page-content";
import { getProblemTitle } from "@/lib/problem";
import {
  clearSuperAdminSession,
  getSuperAdminAccessToken,
  setSuperAdminAccessToken,
} from "@/lib/super-admin-session";

export type SuperAdminLoginResult = {
  accessToken: string;
  superAdminId: string;
  email: string;
  name: string;
};

export type SaBusinessRow = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  countryCode: string;
  timezone: string;
  active: boolean;
  subscriptionTier: string;
  createdAt: string;
  updatedAt: string;
};

export type SaDomainRow = {
  id: string;
  businessId: string;
  domain: string;
  primary: boolean;
  active: boolean;
};

function getNetworkErrorMessage(): string {
  return `Cannot reach API at ${API_BASE_URL}. Start backend or set NEXT_PUBLIC_API_BASE_URL.`;
}

export async function loginSuperAdmin(email: string, password: string): Promise<SuperAdminLoginResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_ROUTES.superAdminAuthLogin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getProblemTitle(payload));
  }
  const data = payload as SuperAdminLoginResult;
  if (!data.accessToken) {
    throw new Error("Invalid login response");
  }
  setSuperAdminAccessToken(data.accessToken);
  return data;
}

export function logoutSuperAdmin(): void {
  clearSuperAdminSession();
}

async function saRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(getNetworkErrorMessage());
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export async function fetchSaBusinesses(page = 0, size = 50): Promise<SaBusinessRow[]> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const payload = await saRequest<unknown>(
    `${API_ROUTES.superAdminBusinesses}?${params.toString()}`,
    { method: "GET" },
  );
  return extractPageContent<SaBusinessRow>(payload);
}

export type CreateSaBusinessPayload = {
  name: string;
  slug: string;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  subscriptionTier?: string;
  primaryDomain?: string;
};

export async function createSaBusiness(body: CreateSaBusinessPayload): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(API_ROUTES.superAdminBusinesses, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PatchSaBusinessPayload = {
  name?: string;
  subscriptionTier?: string;
  active?: boolean;
};

export async function patchSaBusiness(
  businessId: string,
  body: PatchSaBusinessPayload,
): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(`${API_ROUTES.superAdminBusinesses}/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteSaBusiness(businessId: string): Promise<void> {
  await saRequest<unknown>(`${API_ROUTES.superAdminBusinesses}/${businessId}`, {
    method: "DELETE",
  });
}

export async function fetchSaDomains(businessId: string): Promise<SaDomainRow[]> {
  return saRequest<SaDomainRow[]>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains`,
    { method: "GET" },
  );
}

export async function addSaDomain(businessId: string, domain: string): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(`${API_ROUTES.superAdminBusinesses}/${businessId}/domains`, {
    method: "POST",
    body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
  });
}

export async function setSaPrimaryDomain(businessId: string, domainId: string): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains/${domainId}/primary`,
    { method: "POST" },
  );
}

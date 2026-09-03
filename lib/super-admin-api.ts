import { API_ROUTES, APP_ROUTES, apiUrl, getApiBaseUrl } from "@/lib/config";
import { recordOpsClientError } from "@/lib/ops-client-log";
import { extractPageContent, extractSpringPageMeta } from "@/lib/page-content";
import { getProblemTitle } from "@/lib/problem";
import {
  clearSuperAdminSession,
  getSuperAdminAccessToken,
  setSuperAdminAccessToken,
} from "@/lib/super-admin-session";

export type SaDeskRole = "owner" | "lead" | "agent";

export function saDeskHome(role?: string | null): string {
  return role === "agent" ? APP_ROUTES.superAdminServing : APP_ROUTES.superAdminDashboard;
}

export function saCanSeeFullConsole(role?: string | null): boolean {
  return role !== "agent";
}

export function saCanSeeDeskInbox(role?: string | null): boolean {
  return role === "owner" || role === "lead" || role === "agent";
}

export function saCanManageStaff(role?: string | null): boolean {
  return role === "owner" || role === "lead";
}

export type SuperAdminLoginResult = {
  accessToken: string;
  superAdminId: string;
  email: string;
  name: string;
  deskRole?: SaDeskRole;
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
  globalCatalogCode?: string | null;
};

export type SaDomainRow = {
  id: string;
  businessId: string;
  domain: string;
  primary: boolean;
  active: boolean;
};

export type SaBusinessUserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  roleKey: string;
  roleName: string;
  branchName: string;
  lastLoginAt: string;
  createdAt: string;
};

export type SaBusinessStats = {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  webPublishedProducts: number;
  totalBranches: number;
  openShifts: number;
  sales: {
    salesToday: number;
    revenueToday: number;
    unitsToday: number;
    salesLast7Days: number;
    revenueLast7Days: number;
    salesLast30Days: number;
    revenueLast30Days: number;
    unitsLast30Days: number;
    salesAllTime: number;
    revenueAllTime: number;
    unitsAllTime: number;
  };
  storefront: {
    paidOrdersLast30Days: number;
    paidGmvLast30Days: number;
    paidOrdersAllTime: number;
    paidGmvAllTime: number;
  };
  paymentMethods: Array<{
    gatewayType: string;
    label: string;
    status: string;
    isDefault: boolean;
  }>;
  kioskPayActive: boolean;
  kioskPayStatus: string;
  onboardingStatus: string;
  lastUserLoginAt: string | null;
  lastSaleAt: string | null;
};

function getNetworkErrorMessage(): string {
  const via =
    getApiBaseUrl().length > 0
      ? getApiBaseUrl()
      : "this app’s origin (configure BACKEND_ORIGIN for the Next.js proxy)";
  return `Cannot reach API at ${via}. Start the backend, set BACKEND_ORIGIN on Next.js, or set NEXT_PUBLIC_API_BROWSER_DIRECT=true with NEXT_PUBLIC_API_BASE_URL for direct (CORS) API calls.`;
}

function throwNetworkError(path?: string): never {
  const message = getNetworkErrorMessage();
  recordOpsClientError({
    message,
    kind: "api_unreachable",
    path,
  });
  throw new Error(message);
}

export async function loginSuperAdmin(
  email: string,
  password: string,
): Promise<SuperAdminLoginResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(API_ROUTES.superAdminAuthLogin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throwNetworkError();
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

/** Refresh when less than this remains, so long jobs (promotes) never hit expiry. */
const SA_TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000;
const SA_KEEPALIVE_MS = 4 * 60 * 1000;

function saTokenExpiresAtMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let saRefreshInFlight: Promise<string | null> | null = null;

async function postSaTokenRefresh(token: string): Promise<string | null> {
  try {
    const response = await fetch(apiUrl(API_ROUTES.superAdminAuthRefresh), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { accessToken?: string };
    if (!payload.accessToken) {
      return null;
    }
    setSuperAdminAccessToken(payload.accessToken);
    return payload.accessToken;
  } catch {
    return null;
  }
}

/**
 * Sliding session: while the portal keeps making requests (e.g. polling a
 * promote job), swap the token for a fresh one before it expires.
 */
export async function refreshSaTokenIfNeeded(token: string): Promise<string> {
  const expiresAt = saTokenExpiresAtMs(token);
  if (expiresAt === null || expiresAt - Date.now() > SA_TOKEN_REFRESH_WINDOW_MS) {
    return token;
  }
  saRefreshInFlight ??= postSaTokenRefresh(token).finally(() => {
    saRefreshInFlight = null;
  });
  const refreshed = await saRefreshInFlight;
  // On refresh failure keep the current token; the request may still land
  // before expiry, and a real 401 is handled by the caller.
  return refreshed ?? token;
}

/** Refresh regardless of remaining TTL — used after a 401 before giving up. */
async function forceRefreshSaToken(token: string): Promise<string | null> {
  saRefreshInFlight ??= postSaTokenRefresh(token).finally(() => {
    saRefreshInFlight = null;
  });
  return saRefreshInFlight;
}

/**
 * While the console tab is visible, slide the SA token so sitting on a page
 * without API traffic does not expire the session.
 */
export function startSaSessionKeepAlive(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const tick = () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    const token = getSuperAdminAccessToken();
    if (!token) {
      return;
    }
    void refreshSaTokenIfNeeded(token);
  };

  tick();
  const id = window.setInterval(tick, SA_KEEPALIVE_MS);
  document.addEventListener("visibilitychange", tick);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", tick);
  };
}

/** Current token, refreshed if it is close to expiry. Throws when signed out. */
async function saAuthToken(): Promise<string> {
  const token = getSuperAdminAccessToken();
  if (!token) {
    throw new Error("Super-admin session expired. Sign in again.");
  }
  return refreshSaTokenIfNeeded(token);
}

async function saRequest<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = await saAuthToken();
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (
    init.headers &&
    typeof init.headers === "object" &&
    !Array.isArray(init.headers)
  ) {
    Object.assign(headers, init.headers as Record<string, string>);
  }
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throwNetworkError(path);
  }
  if (response.status === 401) {
    if (!retried) {
      const current = getSuperAdminAccessToken();
      const refreshed = current ? await forceRefreshSaToken(current) : null;
      if (refreshed) {
        return saRequest<T>(path, init, true);
      }
    }
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
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

export async function fetchSaBusinesses(
  page = 0,
  size = 50,
): Promise<SaBusinessRow[]> {
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

export async function createSaBusiness(
  body: CreateSaBusinessPayload,
): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(API_ROUTES.superAdminBusinesses, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PatchSaBusinessPayload = {
  name?: string;
  subscriptionTier?: string;
  active?: boolean;
  globalCatalogCode?: string | null;
  currency?: string;
  countryCode?: string;
  timezone?: string;
  /** Required when changing country/currency on a shop with products or sales. */
  acknowledgeRegionRisk?: boolean;
};

export async function fetchSaBusiness(businessId: string): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(`${API_ROUTES.superAdminBusinesses}/${businessId}`);
}

export async function patchSaBusiness(
  businessId: string,
  body: PatchSaBusinessPayload,
): Promise<SaBusinessRow> {
  return saRequest<SaBusinessRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteSaBusiness(businessId: string): Promise<void> {
  await saRequest<unknown>(`${API_ROUTES.superAdminBusinesses}/${businessId}`, {
    method: "DELETE",
  });
}

/** Push welcome + teaching tips into support chat, in-app, and email. */
export async function sendSaOnboardingSequence(businessId: string): Promise<{
  welcomePosted: boolean;
  chatTipsPosted: string[];
  inAppSent: string[];
  emailsSent: string[];
  skipped: string[];
}> {
  return saRequest(
    `${API_ROUTES.superAdminBusinesses}/${encodeURIComponent(businessId.trim())}/onboarding-sequence/send-all`,
    { method: "POST" },
  );
}

// ─── Platform Payment Gateways ──────────────────────────────────────

export type PlatformGatewayRecord = {
  gatewayType: string;
  isEnabled: boolean;
  supplierPayoutSupported: boolean;
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PatchPlatformGatewayPayload = {
  isEnabled: boolean;
  supplierPayoutSupported?: boolean;
  displayName: string;
  description?: string;
  logoUrl?: string;
  sortOrder: number;
};

export async function fetchPlatformGateways(): Promise<
  PlatformGatewayRecord[]
> {
  return saRequest<PlatformGatewayRecord[]>(
    API_ROUTES.superAdminPlatformPaymentGateways,
  );
}

export async function patchPlatformGateway(
  gatewayType: string,
  body: PatchPlatformGatewayPayload,
): Promise<PlatformGatewayRecord> {
  return saRequest<PlatformGatewayRecord>(
    `${API_ROUTES.superAdminPlatformPaymentGateways}/${encodeURIComponent(gatewayType)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export type PlatformKioskPaySettingsRecord = {
  enabled: boolean;
  feePercent: number;
  minWithdrawAmount: number;
  dailyWithdrawLimit: number;
  currency: string;
  paystackEnvironment: string;
  hasPaystackCredentials: boolean;
  paystackPublicKeyHint: string | null;
  kopokopoEnvironment: string;
  hasKopokopoCredentials: boolean;
  sendMoneyFloatConstrainedUntil: string | null;
  updatedAt: string | null;
};

export type PatchPlatformKioskPaySettingsPayload = {
  enabled?: boolean;
  feePercent?: number;
  minWithdrawAmount?: number;
  dailyWithdrawLimit?: number;
  currency?: string;
  paystackEnvironment?: string;
  paystackPublicKey?: string;
  paystackSecretKey?: string;
  clearPaystackCredentials?: boolean;
  kopokopoEnvironment?: string;
  kopokopoClientId?: string;
  kopokopoClientSecret?: string;
  kopokopoApiKey?: string;
  kopokopoTillNumber?: string;
  clearKopokopoCredentials?: boolean;
  clearSendMoneyFloatConstraint?: boolean;
};

export async function fetchPlatformKioskPaySettings(): Promise<PlatformKioskPaySettingsRecord> {
  return saRequest<PlatformKioskPaySettingsRecord>(API_ROUTES.superAdminKioskPay);
}

export async function patchPlatformKioskPaySettings(
  body: PatchPlatformKioskPaySettingsPayload,
): Promise<PlatformKioskPaySettingsRecord> {
  return saRequest<PlatformKioskPaySettingsRecord>(API_ROUTES.superAdminKioskPay, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type SaKioskPayAccountRow = {
  id: string | null;
  businessId: string;
  status: string;
  payoutPhone: string | null;
  availableBalance: number;
  pendingBalance: number;
  lifetimeIn: number;
  lifetimeOut: number;
  feePercent: number;
  platformFeePercent: number;
  storefrontEnabled: boolean;
  platformEnabled: boolean;
  minWithdrawAmount: number;
  dailyWithdrawLimit: number;
  updatedAt: string | null;
};

export type SaKioskPayAccountSummary = {
  accountCount: number;
  totalAvailable: number;
  totalPending: number;
  totalLifetimeIn: number;
  totalLifetimeOut: number;
};

export async function fetchSaKioskPayAccounts(
  limit = 50,
): Promise<SaKioskPayAccountRow[]> {
  return saRequest<SaKioskPayAccountRow[]>(
    `${API_ROUTES.superAdminKioskPay}/accounts?limit=${limit}`,
  );
}

export async function fetchSaKioskPayAccountSummary(): Promise<SaKioskPayAccountSummary> {
  return saRequest<SaKioskPayAccountSummary>(
    `${API_ROUTES.superAdminKioskPay}/accounts/summary`,
  );
}

export async function adjustSaKioskPayAccount(
  businessId: string,
  delta: number,
  note: string,
): Promise<SaKioskPayAccountRow> {
  return saRequest<SaKioskPayAccountRow>(
    `${API_ROUTES.superAdminKioskPay}/accounts/${encodeURIComponent(businessId)}/adjust`,
    { method: "POST", body: JSON.stringify({ delta, note }) },
  );
}

export type SaKioskPayWithdrawalRow = {
  businessId: string;
  id: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: string;
  failureReason: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export async function fetchSaKioskPayWithdrawals(
  limit = 20,
): Promise<SaKioskPayWithdrawalRow[]> {
  return saRequest<SaKioskPayWithdrawalRow[]>(
    `${API_ROUTES.superAdminKioskPay}/withdrawals?limit=${limit}`,
  );
}

export async function resumeSaKioskPayWithdrawals(): Promise<PlatformKioskPaySettingsRecord> {
  return saRequest<PlatformKioskPaySettingsRecord>(API_ROUTES.superAdminKioskPay, {
    method: "PATCH",
    body: JSON.stringify({ clearSendMoneyFloatConstraint: true }),
  });
}

// ── Airtime (platform Instalipa) ────────────────────────────────────

export type PlatformAirtimeSettingsRecord = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  environment: string;
  hasCredentials: boolean;
  consumerKeyHint: string | null;
  tenantCommissionPercent: number;
  minAmount: number;
  maxAmount: number;
  dailyTenantLimit: number;
  currency: string;
  posEnabled: boolean;
  storefrontEnabled: boolean;
  floatBalance: number | null;
  floatLowThreshold: number;
  floatLow: boolean;
  floatCheckedAt: string | null;
  floatConstrainedUntil: string | null;
  updatedAt: string;
};

export type PatchPlatformAirtimeSettingsPayload = {
  enabled?: boolean;
  baseUrl?: string;
  environment?: string;
  consumerKey?: string;
  consumerSecret?: string;
  clearCredentials?: boolean;
  tenantCommissionPercent?: number;
  minAmount?: number;
  maxAmount?: number;
  dailyTenantLimit?: number;
  currency?: string;
  posEnabled?: boolean;
  storefrontEnabled?: boolean;
  floatLowThreshold?: number;
  clearFloatConstraint?: boolean;
};

export type SaAirtimeOrderRow = {
  id: string;
  businessId: string;
  channel: string;
  phoneNumber: string;
  network: string | null;
  amount: number;
  cost: number;
  commission: number;
  currency: string;
  status: string;
  reference: string;
  providerTransactionId: string | null;
  providerStatus: string | null;
  receipt: string | null;
  failureReason: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export async function fetchPlatformAirtimeSettings(): Promise<PlatformAirtimeSettingsRecord> {
  return saRequest<PlatformAirtimeSettingsRecord>(API_ROUTES.superAdminAirtime);
}

export async function patchPlatformAirtimeSettings(
  body: PatchPlatformAirtimeSettingsPayload,
): Promise<PlatformAirtimeSettingsRecord> {
  return saRequest<PlatformAirtimeSettingsRecord>(API_ROUTES.superAdminAirtime, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Round-trip the stored Instalipa credentials without sending any airtime. */
export async function testPlatformAirtime(): Promise<PlatformAirtimeSettingsRecord> {
  return saRequest<PlatformAirtimeSettingsRecord>(
    `${API_ROUTES.superAdminAirtime}/test`,
    { method: "POST" },
  );
}

export async function fetchSaAirtimeOrders(limit = 50): Promise<SaAirtimeOrderRow[]> {
  return saRequest<SaAirtimeOrderRow[]>(
    `${API_ROUTES.superAdminAirtime}/orders?limit=${limit}`,
  );
}

/* ── Desktop install logs (Super Admin → Platform → Logs) ────────────── */

export type DesktopLogUploadRow = {
  id: string;
  installId: string;
  businessId: string | null;
  appVersion: string | null;
  filename: string;
  sizeBytes: number;
  uploadedAt: string;
};

/** Log bundles shipped from Kiosk Desktop installs, newest first. */
export async function fetchDesktopLogUploads(
  opts: { installId?: string; limit?: number } = {},
): Promise<DesktopLogUploadRow[]> {
  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(opts.limit ?? 50, 200))),
  });
  if (opts.installId?.trim()) {
    params.set("installId", opts.installId.trim());
  }
  return saRequest<DesktopLogUploadRow[]>(
    `${API_ROUTES.superAdminPlatformDesktopLogs}?${params.toString()}`,
  );
}

/** The raw gzip bundle for one upload, authenticated like any SA request. */
export async function fetchDesktopLogContent(id: string): Promise<Blob> {
  const token = await saAuthToken();
  const response = await fetch(
    apiUrl(`${API_ROUTES.superAdminPlatformDesktopLogs}/${encodeURIComponent(id)}/content`),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch log bundle (HTTP ${response.status})`);
  }
  return response.blob();
}

/* ── Desktop licenses (Super Admin → Platform → Desktop licenses) ──── */

export type DesktopLicenseIssuerStatus = {
  /** Whether the cloud can sign tokens (env var or console-managed key set). */
  configured: boolean;
  /** Where the signing key comes from: deployment env var, this console, or nothing. */
  source: "env" | "console" | "none";
  /** Base64 public key recorded with the console-managed key (null when unknown). */
  publicKey: string | null;
  /** When the console-managed key was last saved (null when never). */
  updatedAt: string | null;
  /** True when the server has no persistent encryption key — console keys are lost on restart. */
  encryptionEphemeral: boolean;
};

export type IssueDesktopLicensePayload = {
  businessName: string;
  /** counter | shop | lan (defaults to shop when blank). */
  plan?: string;
  /** Exactly one of days / expiresAt / perpetual is required. */
  days?: number;
  /** ISO-8601 instant, e.g. 2027-08-20T00:00:00Z. */
  expiresAt?: string;
  perpetual?: boolean;
  /** The till's Machine ID (Settings → License). Required — the key only works on that machine. */
  fingerprint: string;
  /** Only used by issueAndEmailDesktopLicense. */
  email?: string;
};

export type DesktopLicenseIssueResult = {
  id: string;
  token: string;
  businessName: string;
  plan: string;
  issuedAt: string;
  expiresAt: string | null;
  machineFingerprint: string | null;
  emailedTo: string | null;
  emailSent: boolean;
  createdAt: string;
};

/** History row from the console list (token intentionally omitted). */
export type DesktopLicenseIssueRecord = {
  id: string;
  businessName: string;
  plan: string;
  issuedAt: string;
  expiresAt: string | null;
  machineFingerprint: string | null;
  recipientEmail: string | null;
  emailSent: boolean;
  createdAt: string;
};

export async function fetchDesktopLicenseIssuerStatus(): Promise<DesktopLicenseIssuerStatus> {
  return saRequest<DesktopLicenseIssuerStatus>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/status`,
  );
}

/** Store a signing key pasted from `backend/scripts/generate-license.sh keys`. */
export async function setDesktopLicenseIssuerKey(
  privateKey: string,
  publicKey?: string,
): Promise<DesktopLicenseIssuerStatus> {
  return saRequest<DesktopLicenseIssuerStatus>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/issuer/key`,
    {
      method: "POST",
      body: JSON.stringify({
        privateKey,
        ...(publicKey?.trim() ? { publicKey: publicKey.trim() } : {}),
      }),
    },
  );
}

/** Generate a fresh signing key pair in the console (returns the public key). */
export async function generateDesktopLicenseIssuerKey(): Promise<{ publicKey: string }> {
  return saRequest<{ publicKey: string }>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/issuer/generate`,
    { method: "POST" },
  );
}

/** Remove the console-managed signing key (env var still wins if set). */
export async function clearDesktopLicenseIssuerKey(): Promise<DesktopLicenseIssuerStatus> {
  return saRequest<DesktopLicenseIssuerStatus>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/issuer/key`,
    { method: "DELETE" },
  );
}

/** Recent issued licenses, newest first. */
export async function fetchDesktopLicenseIssues(
  limit = 50,
): Promise<DesktopLicenseIssueRecord[]> {
  return saRequest<DesktopLicenseIssueRecord[]>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}?limit=${limit}`,
  );
}

/** Re-email the stored token of a previously issued license. */
export async function resendDesktopLicense(
  id: string,
): Promise<DesktopLicenseIssueRecord> {
  return saRequest<DesktopLicenseIssueRecord>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/${encodeURIComponent(id)}/resend`,
    { method: "POST" },
  );
}

/** Sign a token (console shows it with a copy button). */
export async function issueDesktopLicense(
  body: IssueDesktopLicensePayload,
): Promise<DesktopLicenseIssueResult> {
  return saRequest<DesktopLicenseIssueResult>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/issue`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/** Sign a token and email it to the shop owner. */
export async function issueAndEmailDesktopLicense(
  body: IssueDesktopLicensePayload,
): Promise<DesktopLicenseIssueResult> {
  return saRequest<DesktopLicenseIssueResult>(
    `${API_ROUTES.superAdminPlatformDesktopLicenses}/issue-and-email`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/* ── Platform request log (Super Admin → Platform → Logs) ───────────── */

export type PlatformRequestLogCategory =
  | "CASHIER"
  | "MPESA"
  | "AIRTIME"
  | "KPLC"
  | "OTHER";

export type PlatformRequestLogRow = {
  id: string;
  loggedAt: string;
  method: string;
  path: string;
  category: PlatformRequestLogCategory;
  businessId: string | null;
  businessName: string | null;
  userId: string | null;
  branchId: string | null;
  correlationId: string | null;
  status: number;
  success: boolean;
  durationMs: number;
  ip: string | null;
  /** Set when the request came from a load-test run (Platform → Load test). */
  loadTestRunId: string | null;
  errorTitle?: string | null;
  errorDetail?: string | null;
  errorType?: string | null;
  exceptionClass?: string | null;
  exceptionChain?: string | null;
  stackSummary?: string | null;
  userAgent?: string | null;
  requestMeta?: string | null;
};

export type PlatformRequestLogCategorySummary = {
  category: PlatformRequestLogCategory;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgDurationMs: number;
  lastAt: string | null;
};

export type PlatformRequestLogSummary = {
  windowMinutes: number;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  /** 404s on tenant host lookups — the platform probing its own host, not real failures. */
  expectedMisses: number;
  categories: PlatformRequestLogCategorySummary[];
};

/** Newest API/webhook requests first, optional category / outcome / window / source filters. */
export async function fetchPlatformRequestLogs(
  opts: {
    limit?: number;
    category?: PlatformRequestLogCategory;
    success?: boolean;
    sinceMinutes?: number;
    ip?: string;
    /** "*" = load-test traffic only; a run id = one specific run. */
    loadTestRunId?: string;
  } = {},
): Promise<PlatformRequestLogRow[]> {
  const params = new URLSearchParams({
    limit: String(Math.max(1, Math.min(opts.limit ?? 100, 500))),
  });
  if (opts.category) {
    params.set("category", opts.category);
  }
  if (opts.success !== undefined) {
    params.set("success", String(opts.success));
  }
  if (opts.sinceMinutes !== undefined && opts.sinceMinutes > 0) {
    params.set("sinceMinutes", String(opts.sinceMinutes));
  }
  if (opts.ip?.trim()) {
    params.set("ip", opts.ip.trim());
  }
  if (opts.loadTestRunId) {
    params.set("loadTestRunId", opts.loadTestRunId);
  }
  return saRequest<PlatformRequestLogRow[]>(
    `${API_ROUTES.superAdminPlatformRequestLogs}?${params.toString()}`,
  );
}

/** Success/failure counts per category for a rolling window (default 24 h). */
export async function fetchPlatformRequestLogSummary(
  windowMinutes = 1440,
): Promise<PlatformRequestLogSummary> {
  return saRequest<PlatformRequestLogSummary>(
    `${API_ROUTES.superAdminPlatformRequestLogs}/summary?windowMinutes=${windowMinutes}`,
  );
}

export async function requerySaAirtimeOrder(orderId: string): Promise<SaAirtimeOrderRow> {
  return saRequest<SaAirtimeOrderRow>(
    `${API_ROUTES.superAdminAirtime}/orders/${encodeURIComponent(orderId)}/requery`,
    { method: "POST" },
  );
}

export async function resumeSaAirtime(): Promise<PlatformAirtimeSettingsRecord> {
  return saRequest<PlatformAirtimeSettingsRecord>(API_ROUTES.superAdminAirtime, {
    method: "PATCH",
    body: JSON.stringify({ clearFloatConstraint: true }),
  });
}

export async function fetchSaDomains(
  businessId: string,
): Promise<SaDomainRow[]> {
  return saRequest<SaDomainRow[]>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains`,
    { method: "GET" },
  );
}

export async function addSaDomain(
  businessId: string,
  domain: string,
): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains`,
    {
      method: "POST",
      body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
    },
  );
}

export async function setSaPrimaryDomain(
  businessId: string,
  domainId: string,
): Promise<SaDomainRow> {
  return saRequest<SaDomainRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains/${domainId}/primary`,
    { method: "POST" },
  );
}

export async function deleteSaDomain(
  businessId: string,
  domainId: string,
): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/domains/${domainId}`,
    { method: "DELETE" },
  );
}

export type SuperAdminMe = {
  superAdminId: string;
  email: string;
  name: string;
  /** Ops SMS alert recipient (tenant adoptions). Null until set in Profile. */
  phone: string | null;
  deskRole?: SaDeskRole;
};

export async function fetchSuperAdminMe(): Promise<SuperAdminMe> {
  return saRequest<SuperAdminMe>(API_ROUTES.superAdminMe, { method: "GET" });
}

/** Update profile fields; null leaves a field unchanged, blank phone clears it. */
export async function updateSuperAdminProfile(payload: {
  name?: string;
  phone?: string;
}): Promise<SuperAdminMe> {
  return saRequest<SuperAdminMe>(API_ROUTES.superAdminMe, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type SuperAdminTestSmsResult = {
  channel: string;
  outcome: string;
  detail: string;
  phoneMasked: string;
};

/** Send a test SMS to the signed-in super admin's alert phone (verifies platform SMS). */
export async function sendSuperAdminTestSms(): Promise<SuperAdminTestSmsResult> {
  return saRequest<SuperAdminTestSmsResult>(`${API_ROUTES.superAdminMe}/test-sms`, {
    method: "POST",
  });
}

export async function changeSuperAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await saRequest<unknown>("/api/v1/super-admin/me/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchSaContactMessages(opts?: {
  status?: "UNREAD" | "READ";
  page?: number;
  size?: number;
}): Promise<{
  content: import("@/lib/contact-messages").ContactMessageListItem[];
  totalElements: number;
}> {
  const params = new URLSearchParams({
    page: String(opts?.page ?? 0),
    size: String(opts?.size ?? 50),
  });
  if (opts?.status) params.set("status", opts.status);
  const payload = await saRequest<unknown>(
    `/api/v1/super-admin/contact-messages?${params}`,
  );
  const { extractPageContent, extractSpringPageMeta } = await import(
    "@/lib/page-content"
  );
  const content =
    extractPageContent<import("@/lib/contact-messages").ContactMessageListItem>(
      payload,
    );
  const meta = extractSpringPageMeta(payload);
  return {
    content,
    totalElements: meta?.totalElements ?? content.length,
  };
}

export async function fetchSaContactMessage(
  id: string,
): Promise<import("@/lib/contact-messages").ContactMessageDetail> {
  return saRequest(
    `/api/v1/super-admin/contact-messages/${encodeURIComponent(id)}`,
  );
}

export async function replySaContactMessage(
  id: string,
  body: {
    channel: import("@/lib/contact-messages").ContactReplyChannel;
    body: string;
  },
): Promise<import("@/lib/contact-messages").ContactMessageReply> {
  return saRequest(
    `/api/v1/super-admin/contact-messages/${encodeURIComponent(id)}/replies`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export type PlatformIntegrationsRecord = {
  hasDeepseekApiKey: boolean;
  deepseekHost: string;
  deepseekUrl: string;
  deepseekModel: string;
  hasRapidapiWhatsappKey: boolean;
  rapidApiWhatsappHost: string;
  rapidApiWhatsappLookupUrl: string;
  rapidApiWhatsappPhoneField: string;
  rapidApiWhatsappPhoneDigitsOnly: boolean;
  smsProvider: string;
  sozuriProject: string;
  sozuriFrom: string;
  sozuriType: string;
  sozuriApiUrl: string;
  hasSozuriApiKey: boolean;
  textsmsPartnerId: string;
  textsmsShortcode: string;
  textsmsApiUrl: string;
  hasTextsmsApiKey: boolean;
  hasWhatsappMetaAccessToken: boolean;
  whatsappMetaPhoneNumberId: string;
  whatsappMetaGraphVersion: string;
  hasWhatsappMetaWebhookVerifyToken: boolean;
  hasWhatsappMetaAppSecret: boolean;
  envDeepseekConfigured: boolean;
  envRapidapiWhatsappConfigured: boolean;
  envSozuriConfigured: boolean;
  envTextsmsConfigured: boolean;
  envWhatsappMetaConfigured: boolean;
  secretsReadable: boolean;
  secretsError: string | null;
  encryptionEphemeral: boolean;
};

export type UpdatePlatformIntegrationsPayload = {
  deepseekApiKey?: string | null;
  deepseekHost?: string | null;
  deepseekUrl?: string | null;
  deepseekModel?: string | null;
  rapidApiWhatsappKey?: string | null;
  rapidApiWhatsappHost?: string | null;
  rapidApiWhatsappLookupUrl?: string | null;
  rapidApiWhatsappPhoneField?: string | null;
  rapidApiWhatsappPhoneDigitsOnly?: boolean | null;
  smsProvider?: string | null;
  sozuriProject?: string | null;
  sozuriApiKey?: string | null;
  sozuriFrom?: string | null;
  sozuriType?: string | null;
  sozuriApiUrl?: string | null;
  textsmsPartnerId?: string | null;
  textsmsApiKey?: string | null;
  textsmsShortcode?: string | null;
  textsmsApiUrl?: string | null;
  whatsappMetaAccessToken?: string | null;
  whatsappMetaPhoneNumberId?: string | null;
  whatsappMetaGraphVersion?: string | null;
  whatsappMetaWebhookVerifyToken?: string | null;
  whatsappMetaAppSecret?: string | null;
};

export async function fetchPlatformIntegrations(): Promise<PlatformIntegrationsRecord> {
  return saRequest<PlatformIntegrationsRecord>(API_ROUTES.superAdminPlatformIntegrations);
}

export async function updatePlatformIntegrations(
  body: UpdatePlatformIntegrationsPayload,
): Promise<PlatformIntegrationsRecord> {
  return saRequest<PlatformIntegrationsRecord>(API_ROUTES.superAdminPlatformIntegrations, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type SokoMindSettingsRecord = {
  sokomindEnabled: boolean;
  guideEnabled: boolean;
  brainEnabled: boolean;
  eyeEnabled: boolean;
  primaryProvider: string;
  defaultLocale: string;
  hasOpenaiApiKey: boolean;
  openaiBaseUrl: string;
  openaiMiniModel: string;
  openaiSmartModel: string;
  openaiVisionModel: string;
  hasAnthropicApiKey: boolean;
  anthropicBaseUrl: string;
  anthropicMiniModel: string;
  anthropicSmartModel: string;
  hasDeepseekApiKey: boolean;
  hasRapidapiDeepseekApiKey: boolean;
  deepseekBaseUrl: string;
  deepseekHost: string;
  deepseekModel: string;
  industryCompareEnabled: boolean;
  industryCompareMinTwins: number;
  dailyTokenBudgetPerTenant: number | null;
  maxToolCallsPerRequest: number;
  systemPromptExtra: string | null;
  envOpenaiConfigured: boolean;
  envAnthropicConfigured: boolean;
  envDeepseekConfigured: boolean;
  secretsReadable: boolean;
  secretsError: string | null;
  encryptionEphemeral: boolean;
  updatedAt: string | null;
};

export type UpdateSokoMindSettingsPayload = Partial<{
  sokomindEnabled: boolean;
  guideEnabled: boolean;
  brainEnabled: boolean;
  eyeEnabled: boolean;
  primaryProvider: string;
  defaultLocale: string;
  openaiApiKey: string | null;
  openaiBaseUrl: string | null;
  openaiMiniModel: string | null;
  openaiSmartModel: string | null;
  openaiVisionModel: string | null;
  anthropicApiKey: string | null;
  anthropicBaseUrl: string | null;
  anthropicMiniModel: string | null;
  anthropicSmartModel: string | null;
  deepseekApiKey: string | null;
  deepseekBaseUrl: string | null;
  deepseekHost: string | null;
  deepseekModel: string | null;
  rapidapiDeepseekApiKey: string | null;
  industryCompareEnabled: boolean;
  industryCompareMinTwins: number;
  dailyTokenBudgetPerTenant: number | null;
  clearDailyTokenBudget: boolean;
  maxToolCallsPerRequest: number;
  systemPromptExtra: string | null;
}>;

export async function fetchSokoMindSettings(): Promise<SokoMindSettingsRecord> {
  return saRequest<SokoMindSettingsRecord>(API_ROUTES.superAdminPlatformSokoMind);
}

export async function updateSokoMindSettings(
  body: UpdateSokoMindSettingsPayload,
): Promise<SokoMindSettingsRecord> {
  return saRequest<SokoMindSettingsRecord>(API_ROUTES.superAdminPlatformSokoMind, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type PlatformDomainSettingsRecord = {
  hasHostafricaApiKey: boolean;
  hostafricaApiBaseUrl: string;
  hostafricaCurrency: string;
  hostafricaKenyanTlds: string;
  hostafricaBillingStubEnabled: boolean;
  hostafricaRegistrantDefaults?: Record<string, string> | null;
  hasHostafricaResellerApiKey: boolean;
  hostafricaResellerEmail: string;
  hostafricaResellerApiBaseUrl: string;
  hostafricaResellerConfigured: boolean;
  hostafricaResellerWhois?: Record<string, string> | null;
  hasPalmartStkCredentials: boolean;
  palmartStkTillNumber: string;
  hasVercelToken: boolean;
  vercelTeamId: string;
  vercelProjectId: string;
  vercelApiBaseUrl: string;
  domainOrderSyncEnabled: boolean;
  domainOrderSyncFixedDelayMs: number;
  domainOrderSyncInitialDelayMs: number;
  envHostafricaConfigured: boolean;
  envVercelConfigured: boolean;
  secretsReadable: boolean;
  secretsError: string | null;
  encryptionEphemeral: boolean;
  updatedAt: string | null;
};

export type UpdatePlatformDomainSettingsPayload = Partial<{
  hostafricaApiKey: string;
  hostafricaApiBaseUrl: string;
  hostafricaCurrency: string;
  hostafricaKenyanTlds: string;
  hostafricaBillingStubEnabled: boolean;
  hostafricaRegistrantDefaults: Record<string, string>;
  hostafricaResellerEmail: string;
  hostafricaResellerApiKey: string;
  hostafricaResellerApiBaseUrl: string;
  hostafricaResellerWhois: Record<string, string>;
  clearHostafricaResellerApiKey: boolean;
  palmartStkClientId: string;
  palmartStkClientSecret: string;
  palmartStkApiKey: string;
  palmartStkTillNumber: string;
  palmartStkEnvironment: string;
  clearPalmartStkCredentials: boolean;
  vercelToken: string;
  vercelTeamId: string;
  vercelProjectId: string;
  vercelApiBaseUrl: string;
  domainOrderSyncEnabled: boolean;
  domainOrderSyncFixedDelayMs: number;
  domainOrderSyncInitialDelayMs: number;
}>;

export async function fetchPlatformDomainSettings(): Promise<PlatformDomainSettingsRecord> {
  return saRequest<PlatformDomainSettingsRecord>(API_ROUTES.superAdminPlatformDomains);
}

export async function updatePlatformDomainSettings(
  body: UpdatePlatformDomainSettingsPayload,
): Promise<PlatformDomainSettingsRecord> {
  return saRequest<PlatformDomainSettingsRecord>(API_ROUTES.superAdminPlatformDomains, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type SaDomainOrderRecord = {
  id: string;
  businessId: string;
  businessName?: string | null;
  businessSlug?: string | null;
  fqdn: string;
  status: string;
  nsStatus?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  registerUrl?: string | null;
  hostafricaDomainId?: string | null;
  vercelZoneReady: boolean;
  domainMappingId?: string | null;
  intendedNameservers?: string[];
  dnsInstructions?: Record<string, unknown> | null;
  lastError?: string | null;
  merchantMessage?: string | null;
  paidAt?: string | null;
  lastStkStatus?: string | null;
  paymentAvailable?: boolean;
  paymentSkippedByStub?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export async function fetchSaDomainOrders(status?: string): Promise<SaDomainOrderRecord[]> {
  const q = status?.trim() ? `?status=${encodeURIComponent(status.trim())}` : "";
  return saRequest<SaDomainOrderRecord[]>(`${API_ROUTES.superAdminPlatformDomainOrders}${q}`);
}

export async function syncSaDomainOrder(orderId: string): Promise<SaDomainOrderRecord> {
  return saRequest<SaDomainOrderRecord>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/${encodeURIComponent(orderId)}/sync`,
    { method: "POST" },
  );
}

export async function markSaDomainOrderPaid(orderId: string): Promise<SaDomainOrderRecord> {
  return saRequest<SaDomainOrderRecord>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/${encodeURIComponent(orderId)}/mark-paid`,
    { method: "POST" },
  );
}

export async function markSaDomainOrderNsActive(orderId: string): Promise<SaDomainOrderRecord> {
  return saRequest<SaDomainOrderRecord>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/${encodeURIComponent(orderId)}/mark-ns-active`,
    { method: "POST" },
  );
}

export async function refreshSaDomainOrderRegisterUrl(orderId: string): Promise<SaDomainOrderRecord> {
  return saRequest<SaDomainOrderRecord>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/${encodeURIComponent(orderId)}/refresh-register-url`,
    { method: "POST" },
  );
}

export async function attachSaDomainOrderHostafrica(
  orderId: string,
  hostafricaDomainId: string,
): Promise<SaDomainOrderRecord> {
  return saRequest<SaDomainOrderRecord>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/${encodeURIComponent(orderId)}/attach-hostafrica`,
    {
      method: "POST",
      body: JSON.stringify({ hostafricaDomainId }),
    },
  );
}

export async function syncSaOpenDomainOrders(): Promise<{ advanced: number }> {
  return saRequest<{ advanced: number }>(`${API_ROUTES.superAdminPlatformDomainOrders}/sync-open`, {
    method: "POST",
  });
}

export type SaResellerStatus = {
  configured: boolean;
  ok: boolean;
  credit?: string | null;
  error?: string | null;
  hasEmail?: boolean;
  hasApiKeyStored?: boolean;
  missing?: string[];
  missingWhoisFields?: string[];
};

export async function fetchSaResellerStatus(): Promise<SaResellerStatus> {
  return saRequest<SaResellerStatus>(
    `${API_ROUTES.superAdminPlatformDomainOrders}/reseller-status`,
  );
}

export type SupplierPortalSettingsRecord = {
  portalEnabled: boolean;
  allowSelfClaim: boolean;
  allowProfileEdits: boolean;
  allowPaymentDetailEdits: boolean;
  allowProductEdits: boolean;
  requireStoreApprovalProductEdits: boolean;
  allowInvoiceDownloads: boolean;
  allowStatementDownloads: boolean;
  allowFindUnclaimedDrafts: boolean;
  autoPromoteOnCreate: boolean;
  portalPublicUrl: string;
  claimEnabled: boolean;
  claimMethod: string;
  codeLength: number;
  codeExpiryMinutes: number;
  maxAttempts: number;
  lockDurationMinutes: number;
  resendCooldownSeconds: number;
  autoLoginAfterSetup: boolean;
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
  passwordRequireSpecial: boolean;
  invitationMessageTemplate: string | null;
  smsTemplate: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  updatedAt: string | null;
};

export type UpdateSupplierPortalSettingsPayload = Partial<{
  portalEnabled: boolean;
  allowSelfClaim: boolean;
  allowProfileEdits: boolean;
  allowPaymentDetailEdits: boolean;
  allowProductEdits: boolean;
  requireStoreApprovalProductEdits: boolean;
  allowInvoiceDownloads: boolean;
  allowStatementDownloads: boolean;
  allowFindUnclaimedDrafts: boolean;
  autoPromoteOnCreate: boolean;
  portalPublicUrl: string;
  claimEnabled: boolean;
  claimMethod: string;
  codeLength: number;
  codeExpiryMinutes: number;
  maxAttempts: number;
  lockDurationMinutes: number;
  resendCooldownSeconds: number;
  autoLoginAfterSetup: boolean;
  passwordMinLength: number;
  passwordRequireNumber: boolean;
  passwordRequireUppercase: boolean;
  passwordRequireSpecial: boolean;
  invitationMessageTemplate: string | null;
  smsTemplate: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
}>;

export async function fetchSupplierPortalSettings(): Promise<SupplierPortalSettingsRecord> {
  return saRequest<SupplierPortalSettingsRecord>(API_ROUTES.superAdminPlatformSupplierPortal);
}

export async function updateSupplierPortalSettings(
  body: UpdateSupplierPortalSettingsPayload,
): Promise<SupplierPortalSettingsRecord> {
  return saRequest<SupplierPortalSettingsRecord>(API_ROUTES.superAdminPlatformSupplierPortal, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ─── Marketplace suppliers (portal ops) ─────────────────────────────

export type SaMarketplaceSupplierRow = {
  id: string;
  name: string;
  supplierNumber?: string | null;
  description: string | null;
  contactEmail: string | null;
  status: string;
  contactPhone: string | null;
  username: string | null;
  portalUserCount: number;
  linkedShopCount?: number;
  linkedShopNames?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  lastPortalLoginAt?: string | null;
};

export type SaMarketplaceSupplierStats = {
  total: number;
  active: number;
  draft: number;
  suspended: number;
  withPortalUsers: number;
  withLinkedShops: number;
  needingInvite: number;
};

export type SaMarketplaceSupplierShopLink = {
  connectionId: string;
  businessId: string;
  businessName: string;
  businessSlug: string | null;
  localSupplierId: string;
  localSupplierName: string;
  localSupplierStatus: string | null;
  connectionStatus: string;
  linkedAt: string;
};

export type SaMarketplaceSupplierUserRow = {
  id: string;
  marketplaceSupplierId: string;
  email: string | null;
  phone: string | null;
  name: string;
  roleKey: string;
  active: boolean;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
};

export type SaMarketplaceInviteResult = {
  inviteId: string;
  marketplaceSupplierId: string;
  claimCode: string;
  phone: string | null;
  expiresAt: string;
  smsSent: boolean;
  claimUrl: string;
};

export type SaMarketplaceSupplierPage = {
  content: SaMarketplaceSupplierRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export async function fetchSaMarketplaceSuppliers(params?: {
  q?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<SaMarketplaceSupplierPage> {
  const query = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? 50),
    sort: params?.sort?.trim() || "updatedAt,desc",
  });
  if (params?.q?.trim()) query.set("q", params.q.trim());
  if (params?.status?.trim()) query.set("status", params.status.trim());
  const payload = await saRequest<unknown>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}?${query.toString()}`,
    { method: "GET" },
  );
  const { extractSpringPageMeta } = await import("@/lib/page-content");
  const content = extractPageContent<SaMarketplaceSupplierRow>(payload);
  const meta = extractSpringPageMeta(payload);
  return {
    content,
    totalElements: meta?.totalElements ?? content.length,
    totalPages: meta?.totalPages ?? 1,
    number: meta?.number ?? 0,
    size: meta?.size ?? content.length,
  };
}

export async function fetchSaMarketplaceSupplierStats(): Promise<SaMarketplaceSupplierStats> {
  return saRequest<SaMarketplaceSupplierStats>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/stats`,
    { method: "GET" },
  );
}

export async function fetchSaMarketplaceSupplierShops(
  supplierId: string,
): Promise<SaMarketplaceSupplierShopLink[]> {
  return saRequest<SaMarketplaceSupplierShopLink[]>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/shops`,
    { method: "GET" },
  );
}

export async function createSaMarketplaceSupplier(body: {
  name: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<SaMarketplaceSupplierRow> {
  return saRequest<SaMarketplaceSupplierRow>(API_ROUTES.superAdminMarketplaceSuppliers, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function activateSaMarketplaceSupplier(
  supplierId: string,
): Promise<SaMarketplaceSupplierRow> {
  return saRequest<SaMarketplaceSupplierRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/activate`,
    { method: "POST" },
  );
}

export async function suspendSaMarketplaceSupplier(
  supplierId: string,
): Promise<SaMarketplaceSupplierRow> {
  return saRequest<SaMarketplaceSupplierRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/suspend`,
    { method: "POST" },
  );
}

export async function fetchSaMarketplaceSupplierUsers(
  supplierId: string,
): Promise<SaMarketplaceSupplierUserRow[]> {
  return saRequest<SaMarketplaceSupplierUserRow[]>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users`,
    { method: "GET" },
  );
}

export async function createSaMarketplaceSupplierUser(
  supplierId: string,
  body: { email: string; name: string; password: string },
): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function inviteSaMarketplaceSupplier(
  supplierId: string,
  body?: { phone?: string; sendSms?: boolean },
): Promise<SaMarketplaceInviteResult> {
  return saRequest<SaMarketplaceInviteResult>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/invites`,
    { method: "POST", body: JSON.stringify(body ?? {}) },
  );
}

export async function suspendSaMarketplaceSupplierUser(
  supplierId: string,
  userId: string,
): Promise<SaMarketplaceSupplierUserRow> {
  return saRequest<SaMarketplaceSupplierUserRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users/${userId}/suspend`,
    { method: "POST" },
  );
}

export async function unsuspendSaMarketplaceSupplierUser(
  supplierId: string,
  userId: string,
): Promise<SaMarketplaceSupplierUserRow> {
  return saRequest<SaMarketplaceSupplierUserRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users/${userId}/unsuspend`,
    { method: "POST" },
  );
}

export async function resetSaMarketplaceSupplierUserPassword(
  supplierId: string,
  userId: string,
  password: string,
): Promise<SaMarketplaceSupplierUserRow> {
  return saRequest<SaMarketplaceSupplierUserRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users/${userId}/reset-password`,
    { method: "POST", body: JSON.stringify({ password }) },
  );
}

export async function forceLogoutSaMarketplaceSupplierUser(
  supplierId: string,
  userId: string,
): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users/${userId}/force-logout`,
    { method: "POST" },
  );
}

export async function unlockSaMarketplaceSupplierUser(
  supplierId: string,
  userId: string,
): Promise<SaMarketplaceSupplierUserRow> {
  return saRequest<SaMarketplaceSupplierUserRow>(
    `${API_ROUTES.superAdminMarketplaceSuppliers}/${supplierId}/users/${userId}/unlock`,
    { method: "POST" },
  );
}

export async function fetchSaBusinessUsers(
  businessId: string,
): Promise<SaBusinessUserRow[]> {
  return saRequest<SaBusinessUserRow[]>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/users`,
    { method: "GET" },
  );
}

/**
 * Super-admin override of a tenant user's lifecycle status
 * (active | invited | suspended | locked).
 */
export async function patchSaBusinessUserStatus(
  businessId: string,
  userId: string,
  status: string,
): Promise<SaBusinessUserRow> {
  return saRequest<SaBusinessUserRow>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/users/${userId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
}

/** Re-sends the email-verification inbox link. Does not mark the user verified. */
export async function resendSaBusinessUserVerification(
  businessId: string,
  userId: string,
): Promise<void> {
  await saRequest<void>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/users/${userId}/resend-verification`,
    { method: "POST" },
  );
}

export type SaEmailRecipientRow = {
  userId: string;
  email: string;
  name: string;
  roleKey: string;
  userStatus: string;
  lastLoginAt: string | null;
  businessId: string;
  businessName: string;
  slug: string;
  onboardingStatus: string;
  continueKind: "verify" | "hub" | string;
  skipReason: string | null;
};

export type SaEmailCampaignSummary = {
  id: string;
  name: string;
  segmentKey: string;
  subject: string;
  status: string;
  recipientsTargeted: number;
  recipientsSent: number;
  recipientsFailed: number;
  recipientsSkipped: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type SaEmailCampaignRecipientRow = {
  id: string;
  businessId: string;
  userId: string;
  email: string;
  continueKind: string;
  status: string;
  error: string | null;
  sentAt: string | null;
};

export type SaEmailCampaignDetail = SaEmailCampaignSummary & {
  bodyMarkdown: string;
  ctaLabel: string;
  recipients: SaEmailCampaignRecipientRow[];
};

export type SaEmailPreview = {
  userId: string;
  email: string;
  subject: string;
  html: string;
  text: string;
  continueUrl: string;
  unknownTags: string[];
};

export type SaEmailAudienceQuery = {
  segment: string;
  businessIds?: string[];
  userIds?: string[];
  q?: string;
};

export type CreateSaEmailCampaignPayload = {
  name: string;
  segmentKey: string;
  businessIds?: string[];
  userIds?: string[];
  subject: string;
  bodyMarkdown: string;
  ctaLabel?: string;
};

export async function fetchSaEmailRecipients(
  query: SaEmailAudienceQuery,
  page = 0,
  size = 500,
): Promise<{ rows: SaEmailRecipientRow[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    segment: query.segment,
  });
  if (query.q?.trim()) params.set("q", query.q.trim());
  for (const id of query.businessIds ?? []) params.append("businessIds", id);
  for (const id of query.userIds ?? []) params.append("userIds", id);
  const payload = await saRequest<unknown>(
    `${API_ROUTES.superAdminEmailRecipients}?${params.toString()}`,
    { method: "GET" },
  );
  const rows = extractPageContent<SaEmailRecipientRow>(payload);
  const meta = extractSpringPageMeta(payload);
  return {
    rows,
    total: meta?.totalElements ?? rows.length,
  };
}

export async function fetchSaEmailCampaigns(
  page = 0,
  size = 50,
): Promise<{ rows: SaEmailCampaignSummary[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const payload = await saRequest<unknown>(
    `${API_ROUTES.superAdminEmailCampaigns}?${params.toString()}`,
    { method: "GET" },
  );
  const rows = extractPageContent<SaEmailCampaignSummary>(payload);
  const meta = extractSpringPageMeta(payload);
  return {
    rows,
    total: meta?.totalElements ?? rows.length,
  };
}

export async function createSaEmailCampaign(
  body: CreateSaEmailCampaignPayload,
): Promise<SaEmailCampaignDetail> {
  return saRequest<SaEmailCampaignDetail>(API_ROUTES.superAdminEmailCampaigns, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function previewSaEmailCampaign(
  body: CreateSaEmailCampaignPayload & { userId?: string },
): Promise<SaEmailPreview> {
  return saRequest<SaEmailPreview>(`${API_ROUTES.superAdminEmailCampaigns}/preview`, {
    method: "POST",
    body: JSON.stringify({
      segmentKey: body.segmentKey,
      businessIds: body.businessIds,
      userIds: body.userIds,
      subject: body.subject,
      bodyMarkdown: body.bodyMarkdown,
      ctaLabel: body.ctaLabel,
      userId: body.userId,
    }),
  });
}

export async function fetchSaEmailCampaign(
  id: string,
): Promise<SaEmailCampaignDetail> {
  return saRequest<SaEmailCampaignDetail>(
    `${API_ROUTES.superAdminEmailCampaigns}/${id}`,
    { method: "GET" },
  );
}

export async function sendSaEmailCampaign(
  id: string,
): Promise<SaEmailCampaignDetail> {
  return saRequest<SaEmailCampaignDetail>(
    `${API_ROUTES.superAdminEmailCampaigns}/${id}/send`,
    { method: "POST" },
  );
}

export async function previewSavedSaEmailCampaign(
  id: string,
  userId?: string,
): Promise<SaEmailPreview> {
  return saRequest<SaEmailPreview>(
    `${API_ROUTES.superAdminEmailCampaigns}/${id}/preview`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    },
  );
}

export async function fetchSaBusinessStats(
  businessId: string,
): Promise<SaBusinessStats> {
  return saRequest<SaBusinessStats>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/stats`,
    { method: "GET" },
  );
}

export type SaPlatformOverview = {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    createdLast7Days: number;
    kioskPayActive: number;
  };
  stuckSignups: {
    total: number;
    sample: Array<{
      businessId: string;
      businessName: string;
      slug: string;
      email: string;
      name: string;
      onboardingStatus: string;
      continueKind: string;
      lastLoginAt: string | null;
    }>;
  };
  commerce: {
    salesToday: number;
    revenueToday: number;
    unitsSoldToday: number;
    salesLast30Days: number;
    revenueLast30Days: number;
    unitsSoldLast30Days: number;
    unitsSoldAllTime: number;
    salesAllTime: number;
    revenueAllTime: number;
  };
  storefront: {
    paidOrdersLast30Days: number;
    paidGmvLast30Days: number;
    unitsSoldLast30Days: number;
    paidOrdersAllTime: number;
    paidGmvAllTime: number;
  };
  support: {
    openTenantThreads: number;
    openVisitorThreads: number;
    waitingOnAdmin: number;
  };
  bestSellers: Array<{
    itemId: string;
    itemName: string;
    businessId: string;
    businessName: string;
    unitsSold: number;
    revenue: number;
    saleCount: number;
  }>;
  hotTenants: Array<{
    businessId: string;
    businessName: string;
    slug: string;
    salesLast7Days: number;
    revenueLast7Days: number;
    unitsLast7Days: number;
  }>;
  last14Days: Array<{
    day: string;
    sales: number;
    revenue: number;
    units: number;
  }>;
  recentTenants: Array<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
    subscriptionTier: string;
    createdAt: string | null;
  }>;
};

/** Fleet health + commerce pulse for the super-admin home. */
export async function fetchSaPlatformOverview(): Promise<SaPlatformOverview> {
  return saRequest<SaPlatformOverview>(API_ROUTES.superAdminPlatformOverview, {
    method: "GET",
  });
}

export type SaImpersonateResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    businessId: string;
    branchId: string | null;
    roleId: string;
    status: string;
  };
  businessId: string;
  slug: string;
  primaryDomain: string | null;
  impersonatedBy: string;
  expiresInSeconds: number;
};

/** Mint a short-lived tenant session as owner (or a chosen user). */
export async function impersonateSaBusiness(
  businessId: string,
  userId?: string,
): Promise<SaImpersonateResult> {
  return saRequest<SaImpersonateResult>(
    `${API_ROUTES.superAdminBusinesses}/${businessId}/impersonate`,
    {
      method: "POST",
      body: JSON.stringify(userId ? { userId } : {}),
    },
  );
}

export type SaCatalogSummary = {
  id: string;
  code: string;
  name: string;
  regionCode: string | null;
  currency: string;
  status: string;
  version: number;
};

export async function fetchSaCatalogs(): Promise<SaCatalogSummary[]> {
  return saRequest<SaCatalogSummary[]>(`${API_ROUTES.superAdminGlobalCatalog}/catalogs`);
}

function withCatalogId(query: URLSearchParams, catalogId?: string | null): void {
  if (catalogId?.trim()) query.set("catalogId", catalogId.trim());
}

function catalogQuerySuffix(catalogId?: string | null): string {
  if (!catalogId?.trim()) return "";
  return `?catalogId=${encodeURIComponent(catalogId.trim())}`;
}

export type SaGlobalCatalogMeta = {
  catalogId: string;
  catalogCode: string;
  catalogName: string;
  regionCode: string | null;
  currency: string;
  productCount: number;
  missingImageCount: number;
  draftCount: number;
  publishedCount: number;
  archivedCount: number;
  categories: SaGlobalCategory[];
  packs: SaGlobalPackSummary[];
};

export type SaGlobalCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  tenantCategorySlugHint: string | null;
  position: number;
  active: boolean;
};

export type SaGlobalPackSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storeKitId: string | null;
  status: string;
  sortOrder: number;
  productCount: number;
  imagedProductCount: number;
};

export type SaGlobalPackDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  storeKitId: string | null;
  status: string;
  sortOrder: number;
  productIds: string[];
};

export type SaGlobalProductImage = {
  id: string;
  imageUrl: string;
  imagePublicId: string | null;
  sortOrder: number;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type SaGlobalProduct = {
  id: string;
  catalogId: string;
  globalCategoryId: string | null;
  skuTemplate: string | null;
  name: string;
  brand: string | null;
  size: string | null;
  variantName?: string | null;
  description: string | null;
  barcode: string | null;
  unitType: string;
  weighed: boolean;
  sellable: boolean;
  stocked: boolean;
  packageVariant?: boolean;
  variantOfGlobalProductId?: string | null;
  packagingUnitName?: string | null;
  packagingUnitQty?: number | null;
  recommendedBuyingPrice: number | null;
  recommendedSellingPrice: number | null;
  suggestedMarginPct: number | null;
  defaultReorderLevel: number | null;
  defaultReorderQty: number | null;
  defaultMinStockLevel: number | null;
  hasExpiry: boolean;
  expiresAfterDays: number | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  images?: SaGlobalProductImage[];
  itemTypeKeyHint: string | null;
  status: string;
  sortOrder: number;
  version: number;
  barcodeDuplicateWarning: boolean;
};

export type SaPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export async function fetchSaGlobalCatalogMeta(
  catalogId?: string | null,
): Promise<SaGlobalCatalogMeta> {
  return saRequest<SaGlobalCatalogMeta>(
    `${API_ROUTES.superAdminGlobalCatalog}/meta${catalogQuerySuffix(catalogId)}`,
  );
}

export async function fetchSaGlobalProducts(params: {
  catalogId?: string | null;
  q?: string;
  status?: string;
  categoryId?: string;
  missingImage?: boolean;
  page?: number;
  size?: number;
}): Promise<SaPage<SaGlobalProduct>> {
  const query = new URLSearchParams();
  withCatalogId(query, params.catalogId);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.categoryId?.trim()) query.set("categoryId", params.categoryId.trim());
  if (params.missingImage) query.set("missingImage", "true");
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 50));
  return saRequest<SaPage<SaGlobalProduct>>(
    `${API_ROUTES.superAdminGlobalCatalog}/products?${query.toString()}`,
  );
}

export async function fetchSaGlobalProduct(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}${catalogQuerySuffix(catalogId)}`,
  );
}

export async function patchSaGlobalProduct(
  id: string,
  body: Partial<SaGlobalProduct> & { version: number },
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function createSaGlobalProduct(
  body: {
    name: string;
    status?: string;
    unitType?: string;
    barcode?: string | null;
    brand?: string | null;
    size?: string | null;
    globalCategoryId?: string | null;
  },
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function publishSaGlobalProducts(
  ids: string[],
): Promise<{ publishedCount: number; publishedIds: string[]; skippedIds: string[] }> {
  return saRequest(`${API_ROUTES.superAdminGlobalCatalog}/products/publish`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export type SaApplyMarginResult = {
  updatedCount: number;
  skippedCount: number;
  updatedIds: string[];
  skippedIds: string[];
};

export async function applySaGlobalProductMargins(
  body: {
    ids: string[];
    marginPct: number;
    mode?: "fromBuying" | "fromSelling";
  },
  catalogId?: string | null,
): Promise<SaApplyMarginResult> {
  return saRequest(
    `${API_ROUTES.superAdminGlobalCatalog}/products/apply-margin${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function uploadSaGlobalProductImage(
  id: string,
  file: File,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  const token = await saAuthToken();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(
    apiUrl(
      `${API_ROUTES.superAdminGlobalCatalog}/products/${id}/image${catalogQuerySuffix(catalogId)}`,
    ),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (response.status === 401) {
    clearSuperAdminSession();
    window.location.assign(APP_ROUTES.superAdminLogin);
    throw new Error("Super-admin session expired. Sign in again.");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed (${response.status})`);
  }
  return (await response.json()) as SaGlobalProduct;
}

export async function clearSaGlobalProductImage(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalProduct> {
  return saRequest<SaGlobalProduct>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${id}/image${catalogQuerySuffix(catalogId)}`,
    { method: "DELETE" },
  );
}

export async function backfillSaGlobalProductImages(
  productId: string,
  opts?: { limit?: number; catalogId?: string | null },
): Promise<{
  productsProcessed: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  warnings: string[];
}> {
  return saRequest(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/backfill-images${catalogQuerySuffix(opts?.catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify({ limit: opts?.limit ?? 100 }),
    },
  );
}

export async function fetchSaGlobalCategories(
  catalogId?: string | null,
): Promise<SaGlobalCategory[]> {
  return saRequest<SaGlobalCategory[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories${catalogQuerySuffix(catalogId)}`,
  );
}

export async function createSaGlobalCategory(
  body: {
    name: string;
    slug?: string;
    tenantCategorySlugHint?: string;
    parentId?: string;
    position?: number;
    active?: boolean;
  },
  catalogId?: string | null,
): Promise<SaGlobalCategory> {
  return saRequest<SaGlobalCategory>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function patchSaGlobalCategory(
  id: string,
  body: {
    name: string;
    slug?: string;
    tenantCategorySlugHint?: string;
    parentId?: string;
    position?: number;
    active?: boolean;
  },
  catalogId?: string | null,
): Promise<SaGlobalCategory> {
  return saRequest<SaGlobalCategory>(
    `${API_ROUTES.superAdminGlobalCatalog}/categories/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchSaGlobalPack(
  id: string,
  catalogId?: string | null,
): Promise<SaGlobalPackDetail> {
  return saRequest<SaGlobalPackDetail>(
    `${API_ROUTES.superAdminGlobalCatalog}/packs/${id}${catalogQuerySuffix(catalogId)}`,
  );
}

export async function patchSaGlobalPack(
  id: string,
  body: {
    name?: string;
    description?: string | null;
    storeKitId?: string | null;
    status?: string;
    sortOrder?: number;
    productIds?: string[];
  },
  catalogId?: string | null,
): Promise<SaGlobalPackDetail> {
  return saRequest<SaGlobalPackDetail>(
    `${API_ROUTES.superAdminGlobalCatalog}/packs/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export type SaCsvImportResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  warnings: string[];
};

export async function exportSaGlobalProductsCsv(params?: {
  catalogId?: string | null;
  status?: string;
  missingImage?: boolean;
}): Promise<Blob> {
  const token = await saAuthToken();
  const query = new URLSearchParams();
  withCatalogId(query, params?.catalogId);
  if (params?.status) query.set("status", params.status);
  if (params?.missingImage) query.set("missingImage", "true");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  let response: Response;
  try {
    response = await fetch(
      apiUrl(`${API_ROUTES.superAdminGlobalCatalog}/products/export.csv${suffix}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } catch {
    throwNetworkError();
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }
  return response.blob();
}

export async function importSaGlobalProductsCsv(
  file: File,
  catalogId?: string | null,
): Promise<SaCsvImportResult> {
  const token = await saAuthToken();
  const form = new FormData();
  form.append("file", file);
  let response: Response;
  try {
    response = await fetch(
      apiUrl(`${API_ROUTES.superAdminGlobalCatalog}/products/import${catalogQuerySuffix(catalogId)}`),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
  } catch {
    throwNetworkError();
  }
  if (response.status === 401) {
    clearSuperAdminSession();
    if (typeof window !== "undefined") {
      window.location.assign(APP_ROUTES.superAdminLogin);
    }
    throw new Error("Session expired. Sign in again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getProblemTitle(payload));
  }
  return (await response.json()) as SaCsvImportResult;
}

export type SaSourceBusiness = {
  id: string;
  name: string;
  slug: string;
  preferred: boolean;
};

export type SaSourceItem = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  size: string | null;
  barcode: string | null;
  imageUrl: string | null;
  alreadyInGlobal: boolean;
  matchedGlobalProductId: string | null;
};

export type SaPromoteLine = {
  sourceItemId: string;
  globalProductId: string | null;
  action: string;
  reason: string | null;
  imageRehosted: boolean;
};

export type SaPromoteResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  imageRehostCount: number;
  lines: SaPromoteLine[];
};

export async function fetchSaSourceBusinesses(): Promise<SaSourceBusiness[]> {
  return saRequest<SaSourceBusiness[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/source-businesses`,
  );
}

export async function fetchSaSourceItems(params: {
  businessId: string;
  catalogId?: string | null;
  q?: string;
  page?: number;
  size?: number;
}): Promise<SaPage<SaSourceItem>> {
  const query = new URLSearchParams();
  query.set("businessId", params.businessId);
  withCatalogId(query, params.catalogId);
  if (params.q?.trim()) query.set("q", params.q.trim());
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 50));
  return saRequest<SaPage<SaSourceItem>>(
    `${API_ROUTES.superAdminGlobalCatalog}/source-items?${query.toString()}`,
  );
}

const SOURCE_ID_FETCH_PAGE_SIZE = 100;
const SOURCE_ID_FETCH_MAX = 10_000;

/** Collects matching source item ids across pages (for promote-all). */
export async function fetchAllSaSourceItemIds(params: {
  businessId: string;
  catalogId?: string | null;
  q?: string;
  /** When true (default), skip items already matched in the global catalog. */
  excludeAlreadyInGlobal?: boolean;
  /** When true, only include items with a portable HTTPS image URL. */
  requireImage?: boolean;
  /** When true, only include items that have a barcode. */
  requireBarcode?: boolean;
}): Promise<string[]> {
  const excludeAlready = params.excludeAlreadyInGlobal !== false;
  const requireImage = params.requireImage === true;
  const requireBarcode = params.requireBarcode === true;
  const ids: string[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages && ids.length < SOURCE_ID_FETCH_MAX) {
    const result = await fetchSaSourceItems({
      businessId: params.businessId,
      catalogId: params.catalogId,
      q: params.q,
      page,
      size: SOURCE_ID_FETCH_PAGE_SIZE,
    });
    totalPages = Math.max(1, result.totalPages ?? 1);
    for (const row of result.content ?? []) {
      if (!row.id) continue;
      if (excludeAlready && row.alreadyInGlobal) continue;
      if (requireImage && !row.imageUrl?.trim()) continue;
      if (requireBarcode && !row.barcode?.trim()) continue;
      ids.push(row.id);
      if (ids.length >= SOURCE_ID_FETCH_MAX) break;
    }
    page += 1;
  }
  return ids;
}

export type SaArchiveCatalogResult = {
  archivedProductCount: number;
  deactivatedCategoryCount: number;
};

/** Archives every product + deactivates every category in the catalog (replace-before-promote). */
export async function saArchiveCatalogProducts(
  catalogId?: string | null,
): Promise<SaArchiveCatalogResult> {
  const query = new URLSearchParams();
  withCatalogId(query, catalogId);
  const qs = query.toString();
  return saRequest<SaArchiveCatalogResult>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/archive-all${qs ? `?${qs}` : ""}`,
    { method: "POST" },
  );
}

export type SaPurgeCatalogResult = {
  catalogId: string;
  catalogCode: string;
  deletedProductCount: number;
  deletedCategoryCount: number;
  deletedPackCount: number;
  deletedPackItemCount: number;
  deletedImageCount: number;
  deletedSupplierLinkCount: number;
  deletedSupplierTemplateCount: number;
};

/**
 * Hard-deletes all content in the catalog (keeps the catalog shell).
 * `confirmCode` must equal the catalog code (e.g. ug-retail). Refuses if shops adopted.
 */
export async function saPurgeCatalog(
  catalogId: string,
  confirmCode: string,
): Promise<SaPurgeCatalogResult> {
  return saRequest<SaPurgeCatalogResult>(
    `${API_ROUTES.superAdminGlobalCatalog}/catalogs/${encodeURIComponent(catalogId)}/purge`,
    {
      method: "POST",
      body: JSON.stringify({ confirmCode }),
    },
  );
}

export async function previewSaPromote(body: {
  sourceBusinessId: string;
  itemIds: string[];
  onConflict?: "update" | "skip";
  publish?: boolean;
  catalogId?: string | null;
}): Promise<SaPromoteResult> {
  return saRequest<SaPromoteResult>(`${API_ROUTES.superAdminGlobalCatalog}/promote/preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const SYNC_PROMOTE_MAX_ITEMS = 25;
const JOB_PROMOTE_MAX_ITEMS = 500;
const PROMOTE_JOB_POLL_MS = 1200;
/** Fail only when the job stops making progress, not on a fixed wall clock. */
const PROMOTE_JOB_STALL_TIMEOUT_MS = 3 * 60 * 1000;

export type SaPromoteProgress = {
  phase: "queued" | "processing" | "finalizing";
  /** Items processed within the whole promote (across chunks). */
  processed: number;
  total: number;
  /** Live status line from the worker, e.g. "Promoting 137 of 500 — Coca Cola 500ml". */
  message: string | null;
  chunkIndex: number;
  chunkCount: number;
};

export type SaGlobalCatalogJobStatus = {
  id: string;
  kind: string;
  status: "pending" | "processing" | "completed" | "failed" | string;
  businessId: string | null;
  rowsTotal: number | null;
  rowsProcessed: number;
  rowsCommitted: number | null;
  statusMessage: string | null;
  result: SaPromoteResult | null;
  createdAt: string;
  completedAt: string | null;
};

async function enqueueSaPromoteJob(body: {
  sourceBusinessId: string;
  itemIds: string[];
  onConflict?: "update" | "skip";
  publish?: boolean;
  catalogId?: string | null;
}): Promise<string> {
  const created = await saRequest<{ jobId: string }>(
    `${API_ROUTES.superAdminGlobalCatalog}/promote/jobs`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return created.jobId;
}

async function fetchSaPromoteJob(jobId: string): Promise<SaGlobalCatalogJobStatus> {
  return saRequest<SaGlobalCatalogJobStatus>(
    `${API_ROUTES.superAdminGlobalCatalog}/promote/jobs/${encodeURIComponent(jobId)}`,
  );
}

async function waitForSaPromoteJob(
  jobId: string,
  onJobUpdate?: (job: SaGlobalCatalogJobStatus) => void,
): Promise<SaPromoteResult> {
  let lastMovementAt = Date.now();
  let lastSignature = "";
  for (;;) {
    const job = await fetchSaPromoteJob(jobId);
    onJobUpdate?.(job);
    if (job.status === "completed") {
      if (!job.result) {
        throw new Error(job.statusMessage || "Promote job completed without a result.");
      }
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.statusMessage || "Promote job failed.");
    }
    const signature = `${job.status}:${job.rowsProcessed}:${job.statusMessage ?? ""}`;
    if (signature !== lastSignature) {
      lastSignature = signature;
      lastMovementAt = Date.now();
    } else if (Date.now() - lastMovementAt > PROMOTE_JOB_STALL_TIMEOUT_MS) {
      throw new Error(
        "Promote job stalled (no progress for 3 minutes). It may still finish in the background — refresh to check.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, PROMOTE_JOB_POLL_MS));
  }
}

export async function commitSaPromote(
  body: {
    sourceBusinessId: string;
    itemIds: string[];
    onConflict?: "update" | "skip";
    publish?: boolean;
    catalogId?: string | null;
  },
  onProgress?: (progress: SaPromoteProgress) => void,
): Promise<SaPromoteResult> {
  const total = body.itemIds.length;
  if (total <= SYNC_PROMOTE_MAX_ITEMS) {
    onProgress?.({
      phase: "processing",
      processed: 0,
      total,
      message: null,
      chunkIndex: 0,
      chunkCount: 1,
    });
    return saRequest<SaPromoteResult>(`${API_ROUTES.superAdminGlobalCatalog}/promote`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  const chunks: string[][] = [];
  for (let i = 0; i < body.itemIds.length; i += JOB_PROMOTE_MAX_ITEMS) {
    chunks.push(body.itemIds.slice(i, i + JOB_PROMOTE_MAX_ITEMS));
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let imageRehostCount = 0;
  const lines: SaPromoteLine[] = [];
  let completedBefore = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const itemIds = chunks[chunkIndex];
    const baseProcessed = completedBefore;
    onProgress?.({
      phase: "queued",
      processed: baseProcessed,
      total,
      message: "Waiting for background worker…",
      chunkIndex,
      chunkCount: chunks.length,
    });
    const chunkResult = await waitForSaPromoteJob(
      await enqueueSaPromoteJob({ ...body, itemIds }),
      (job) => {
        onProgress?.({
          phase: job.status === "pending" ? "queued" : "processing",
          processed: baseProcessed + (job.rowsProcessed ?? 0),
          total,
          message: job.statusMessage,
          chunkIndex,
          chunkCount: chunks.length,
        });
      },
    );
    completedBefore += itemIds.length;
    createdCount += chunkResult.createdCount;
    updatedCount += chunkResult.updatedCount;
    skippedCount += chunkResult.skippedCount;
    imageRehostCount += chunkResult.imageRehostCount;
    lines.push(...(chunkResult.lines ?? []));
  }

  onProgress?.({
    phase: "finalizing",
    processed: total,
    total,
    message: "Wrapping up…",
    chunkIndex: chunks.length - 1,
    chunkCount: chunks.length,
  });
  return { createdCount, updatedCount, skippedCount, imageRehostCount, lines };
}

export type SaSupplierTemplate = {
  id: string;
  catalogId: string;
  code: string;
  name: string;
  supplierType: string;
  vatPin: string | null;
  notes: string | null;
  tenantSupplierCodeHint: string;
};

export type SaProductSupplierLink = {
  globalProductId: string;
  globalSupplierTemplateId: string;
  templateCode: string | null;
  templateName: string | null;
  primary: boolean;
  defaultCostPrice: number | null;
  supplierSku: string | null;
};

export async function fetchSaSupplierTemplates(
  catalogId?: string | null,
): Promise<SaSupplierTemplate[]> {
  return saRequest<SaSupplierTemplate[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers${catalogQuerySuffix(catalogId)}`,
  );
}

export async function createSaSupplierTemplate(
  body: {
    code: string;
    name: string;
    supplierType?: string;
    vatPin?: string;
    notes?: string;
  },
  catalogId?: string | null,
): Promise<SaSupplierTemplate> {
  return saRequest<SaSupplierTemplate>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers${catalogQuerySuffix(catalogId)}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function patchSaSupplierTemplate(
  id: string,
  body: {
    name?: string;
    supplierType?: string;
    vatPin?: string | null;
    notes?: string | null;
  },
  catalogId?: string | null,
): Promise<SaSupplierTemplate> {
  return saRequest<SaSupplierTemplate>(
    `${API_ROUTES.superAdminGlobalCatalog}/suppliers/${id}${catalogQuerySuffix(catalogId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function fetchSaProductSupplierLinks(
  productId: string,
): Promise<SaProductSupplierLink[]> {
  return saRequest<SaProductSupplierLink[]>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers`,
  );
}

export async function upsertSaProductSupplierLink(
  productId: string,
  body: {
    globalSupplierTemplateId: string;
    primary?: boolean;
    defaultCostPrice?: number | null;
    supplierSku?: string | null;
  },
): Promise<SaProductSupplierLink> {
  return saRequest<SaProductSupplierLink>(
    `${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteSaProductSupplierLink(
  productId: string,
  templateId: string,
): Promise<void> {
  await saRequest(`${API_ROUTES.superAdminGlobalCatalog}/products/${productId}/suppliers/${templateId}`, {
    method: "DELETE",
  });
}

// ── Load test console (Platform → Load test) ─────────────────────────────────
// Backend: zelisline.ub.platform.loadtest.LoadTestController. Records serialize
// to plain JSON, so these types mirror the Java record fields verbatim.

export type LoadTestStepResult = {
  step: number;
  concurrency: number;
  requests: number;
  rps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errors: number;
  errorRatePct: number;
  statusCodes: Record<string, number>;
};

export type LoadTestRunSummary = {
  runId: string;
  path: string;
  startedAt: string;
  durationSec: number;
  maxConcurrency: number;
  recommendedConcurrentUsers: number;
  peakRps: number;
  recommendedP95Ms: number;
  targetP95Ms: number;
  steps: LoadTestStepResult[];
  notes: string[];
};

export type LoadTestLiveProgress = {
  runId: string;
  path: string;
  step: number;
  steps: number;
  concurrency: number;
  maxConcurrency: number;
  elapsedSec: number;
  remainingSec: number;
  liveRps: number;
  liveP95Ms: number;
  errors: number;
};

export type LoadTestCapacity = {
  ticketStore: string;
  redisConfigured: boolean;
  activeWsConnections: number;
  wsMaxPerUser: number;
  wsMaxPerBusiness: number;
  tomcatMaxThreads: number;
  tomcatActiveThreads: number;
  tomcatQueued: number;
  tomcatOpenConnections: number;
  dbPoolMax: number;
  dbPoolActive: number;
  dbPoolIdle: number;
  dbPoolAwaiting: number;
  dbRoundTripMs: number;
  jvmHeapUsedMb: number;
  jvmHeapMaxMb: number;
  processCpuLoad: number;
  selfTestBaseUrl: string;
  hint: string;
};

export type LoadTestStatus = {
  running: boolean;
  run: LoadTestLiveProgress | null;
  capacity: LoadTestCapacity;
  history: LoadTestRunSummary[];
};

export type RunLoadTestPayload = {
  path: string;
  maxConcurrency?: number;
  steps?: number;
  secondsPerStep?: number;
  targetP95Ms?: number;
};

export async function fetchLoadTestStatus(): Promise<LoadTestStatus> {
  return saRequest<LoadTestStatus>(`${API_ROUTES.superAdminLoadTest}/status`);
}

export async function runLoadTest(body: RunLoadTestPayload): Promise<{ runId: string }> {
  return saRequest<{ runId: string }>(`${API_ROUTES.superAdminLoadTest}/run`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function cancelLoadTest(): Promise<{ cancelled: boolean }> {
  return saRequest<{ cancelled: boolean }>(`${API_ROUTES.superAdminLoadTest}/cancel`, {
    method: "POST",
  });
}

// ── Support chat inbox (Super Admin → Support) ───────────────────────
// Backend: zelisline.ub.support.api.SuperAdminSupportController.

export type SaSupportConversation = {
  id: string;
  businessId: string;
  businessName: string | null;
  businessSlug: string | null;
  conversationType: "TENANT" | "VISITOR" | "STOREFRONT" | string;
  guestId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  status: "OPEN" | "RESOLVED" | string;
  subject: string | null;
  createdByName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  tenantLastReadAt: string | null;
  adminLastReadAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SaSupportMessage = {
  id: string;
  conversationId: string;
  senderType: "TENANT" | "SUPER_ADMIN" | "GUEST";
  senderUserId: string;
  senderName: string | null;
  body: string;
  messageKind?: "TEXT" | "ORDER_CARD" | "WELCOME_CARD" | string | null;
  orderCard?: {
    orderId: string;
    orderCode: string;
    status: string;
    currency: string | null;
    grandTotal: number | string | null;
    customerName: string | null;
    customerPhone: string | null;
    branchName: string | null;
    channel: string | null;
    lines: Array<{
      itemName: string;
      variantName?: string | null;
      quantity: number | string;
      lineTotal: number | string;
    }>;
    lineCount: number;
  } | null;
  welcomeCard?: {
    recipientName: string | null;
    businessName: string | null;
    supportPhone: string | null;
    supportEmail: string | null;
    helpItems: string[];
  } | null;
  attachment?: {
    url: string;
    publicId?: string | null;
    fileName?: string | null;
    contentType?: string | null;
    bytes?: number | null;
  } | null;
  replyTo?: {
    messageId: string;
    senderType: "TENANT" | "SUPER_ADMIN" | "GUEST";
    senderName: string | null;
    body: string;
    messageKind?: string | null;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export type SaSupportConversationDetail = {
  conversation: SaSupportConversation | null;
  messages: SaSupportMessage[];
};

/** Live tenant/visitor presence as seen by the super-admin inbox. */
export type SaSupportPresence = {
  online: boolean;
  lastSeenAt: string | null;
};

export type SaSupportPresencePayload = {
  /** Tenant threads keyed by businessId. */
  presence: Record<string, SaSupportPresence>;
  /** Visitor threads keyed by guestId. */
  guestPresence: Record<string, SaSupportPresence>;
  /** Distinct tenants with any open realtime socket (logged into the app). */
  tenantsOnline: number;
  /** Distinct guests with an open visitor socket. */
  visitorsOnline: number;
  /** Tenants currently on the support channel (inbox presence). */
  tenantsOnSupport: number;
  /** Visitors currently on their guest support channel. */
  visitorsOnSupport: number;
};

export async function fetchSaSupportPresence(): Promise<SaSupportPresencePayload> {
  const payload = await saRequest<Partial<SaSupportPresencePayload>>(
    `${API_ROUTES.superAdminSupport}/presence`,
  );
  return {
    presence: payload.presence ?? {},
    guestPresence: payload.guestPresence ?? {},
    tenantsOnline: Number(payload.tenantsOnline ?? 0),
    visitorsOnline: Number(payload.visitorsOnline ?? 0),
    tenantsOnSupport: Number(payload.tenantsOnSupport ?? 0),
    visitorsOnSupport: Number(payload.visitorsOnSupport ?? 0),
  };
}

export async function fetchSaSupportConversations(opts?: {
  status?: "OPEN" | "RESOLVED" | "ALL";
  type?: "TENANT" | "VISITOR";
}): Promise<{
  conversations: SaSupportConversation[];
  total: number;
  unread: number;
}> {
  const params = new URLSearchParams();
  if (opts?.status && opts.status !== "ALL") {
    params.set("status", opts.status);
  }
  if (opts?.type && opts.type !== "TENANT") {
    params.set("type", opts.type);
  }
  const suffix = params.toString();
  return saRequest<{
    conversations: SaSupportConversation[];
    total: number;
    unread: number;
  }>(`${API_ROUTES.superAdminSupport}/conversations${suffix ? `?${suffix}` : ""}`);
}

export async function fetchSaSupportConversation(
  id: string,
): Promise<SaSupportConversationDetail> {
  return saRequest<SaSupportConversationDetail>(
    `${API_ROUTES.superAdminSupport}/conversations/${encodeURIComponent(id)}`,
  );
}

/** Create or reopen the TENANT support thread for a business (SA starts the chat). */
export async function ensureSaTenantSupportThread(
  businessId: string,
): Promise<SaSupportConversationDetail> {
  return saRequest<SaSupportConversationDetail>(
    `${API_ROUTES.superAdminSupport}/tenants/${encodeURIComponent(businessId.trim())}/thread`,
    { method: "POST" },
  );
}

/** Backfill the signup welcome card into a tenant support thread when missing. */
export async function ensureSaTenantWelcomeCard(
  businessId: string,
): Promise<{ posted: boolean; businessId: string }> {
  return saRequest<{ posted: boolean; businessId: string }>(
    `${API_ROUTES.superAdminSupport}/tenants/${encodeURIComponent(businessId.trim())}/welcome`,
    { method: "POST" },
  );
}

export async function sendSaSupportMessage(
  conversationId: string,
  body: string,
  attachment?: {
    url: string;
    publicId?: string | null;
    fileName?: string | null;
    contentType?: string | null;
    bytes?: number | null;
  } | null,
  replyToMessageId?: string | null,
): Promise<SaSupportMessage> {
  return saRequest<SaSupportMessage>(
    `${API_ROUTES.superAdminSupport}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        body: body || "",
        replyToMessageId: replyToMessageId ?? undefined,
        attachment: attachment
          ? {
              url: attachment.url,
              publicId: attachment.publicId ?? undefined,
              fileName: attachment.fileName ?? undefined,
              contentType: attachment.contentType ?? undefined,
              bytes: attachment.bytes ?? undefined,
            }
          : undefined,
      }),
    },
  );
}

export async function getSaCloudinarySignature(
  folder: string,
  resourceType: "image" | "auto" | "raw" = "auto",
): Promise<{
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType?: string;
}> {
  return saRequest("/api/v1/media/cloudinary-signature", {
    method: "POST",
    body: JSON.stringify({ folder, resourceType }),
  });
}

export async function markSaSupportConversationRead(id: string): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminSupport}/conversations/${encodeURIComponent(id)}/read`,
    { method: "POST" },
  );
}

export async function resolveSaSupportConversation(id: string): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminSupport}/conversations/${encodeURIComponent(id)}/resolve`,
    { method: "POST" },
  );
}

export async function reopenSaSupportConversation(id: string): Promise<void> {
  await saRequest<unknown>(
    `${API_ROUTES.superAdminSupport}/conversations/${encodeURIComponent(id)}/reopen`,
    { method: "POST" },
  );
}

export async function fetchSaSupportUnreadCount(): Promise<number> {
  const payload = await saRequest<{ count?: number }>(
    `${API_ROUTES.superAdminSupport}/unread-count`,
  );
  return typeof payload?.count === "number" ? payload.count : 0;
}


// ── SMS credits & quotas (Super Admin) ───────────────────────────────────────

export type PlatformSmsCreditSettingsRecord = {
  enabled: boolean;
  unitPriceKes: number;
  minPurchaseCredits: number;
  maxPurchaseCredits: number;
  lowBalanceThreshold: number;
  cycleTimezone: string;
  updatedAt: string | null;
};

export type SmsTierAllowanceRecord = {
  tierCode: string;
  includedSmsPerMonth: number;
  active: boolean;
};

export type SaSmsCreditLedgerRow = {
  id: string;
  delta: number;
  balanceAfter: number;
  kind: string;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
  createdByUserId: string | null;
};

export type SaSmsCreditPurchaseRow = {
  id: string;
  credits: number;
  amountKes: number;
  status: string;
  phoneNumber: string | null;
  message: string | null;
};

export type SaSmsCreditAccountRecord = {
  businessId: string;
  includedUsed: number;
  includedOverride: number | null;
  includedAllowance: number;
  includedRemaining: number;
  purchasedBalance: number;
  available: number;
  cycleStartedAt: string | null;
  recentLedger: SaSmsCreditLedgerRow[];
  recentPurchases: SaSmsCreditPurchaseRow[];
};

export async function fetchPlatformSmsCreditSettings(): Promise<PlatformSmsCreditSettingsRecord> {
  return saRequest<PlatformSmsCreditSettingsRecord>(
    API_ROUTES.superAdminSmsCreditsSettings,
  );
}

export async function updatePlatformSmsCreditSettings(body: {
  enabled?: boolean;
  unitPriceKes?: number;
  minPurchaseCredits?: number;
  maxPurchaseCredits?: number;
  lowBalanceThreshold?: number;
  cycleTimezone?: string;
}): Promise<PlatformSmsCreditSettingsRecord> {
  return saRequest<PlatformSmsCreditSettingsRecord>(
    API_ROUTES.superAdminSmsCreditsSettings,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function fetchSmsTierAllowances(): Promise<SmsTierAllowanceRecord[]> {
  const payload = await saRequest<{ tiers: SmsTierAllowanceRecord[] }>(
    API_ROUTES.superAdminSmsCreditsTiers,
  );
  return payload.tiers ?? [];
}

export async function upsertSmsTierAllowance(
  tierCode: string,
  body: { includedSmsPerMonth?: number; active?: boolean },
): Promise<SmsTierAllowanceRecord[]> {
  const payload = await saRequest<{ tiers: SmsTierAllowanceRecord[] }>(
    `${API_ROUTES.superAdminSmsCreditsTiers}/${encodeURIComponent(tierCode)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return payload.tiers ?? [];
}

export async function fetchSaSmsCreditAccount(
  businessId: string,
): Promise<SaSmsCreditAccountRecord> {
  return saRequest<SaSmsCreditAccountRecord>(
    API_ROUTES.superAdminSmsCreditsBusiness(businessId),
  );
}

export async function grantSaSmsCredits(
  businessId: string,
  body: { credits: number; note?: string | null },
): Promise<SaSmsCreditAccountRecord> {
  return saRequest<SaSmsCreditAccountRecord>(
    `${API_ROUTES.superAdminSmsCreditsBusiness(businessId)}/grant`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function updateSaSmsCreditAccount(
  businessId: string,
  body: { includedOverride?: number | null },
): Promise<SaSmsCreditAccountRecord> {
  return saRequest<SaSmsCreditAccountRecord>(
    API_ROUTES.superAdminSmsCreditsBusiness(businessId),
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export type SaSubscriptionSettingsRecord = {
  billingEnabled: boolean;
  defaultGraceDays: number;
  renewalBaseUrl: string;
  notificationCadenceDays: string;
  preExpiryReminderDays: number;
  updatedAt: string;
};

export type SaSubscriptionPlanRecord = {
  tierCode: string;
  displayName: string;
  monthlyPriceKes: number;
  annualPriceKes: number | null;
  graceDays: number;
  productLimit: number | null;
  cashierLimit: number | null;
  active: boolean;
  sortOrder: number;
};

export type SaSubscriptionDunningRecord = {
  billingEnabled: boolean;
  tenantsInGrace: number;
  tenantsSuspended: number;
  monthlyRevenueAtRiskKes: number;
  graceRecoveryRatePercent: number;
  graceEpisodesLast90d: number;
  renewalsLast30d: number;
  renewalRevenueLast30dKes: number;
  preExpiryRemindersLast30d: number;
  generatedAt: string;
};

export async function fetchSaSubscriptionSettings(): Promise<SaSubscriptionSettingsRecord> {
  return saRequest<SaSubscriptionSettingsRecord>(API_ROUTES.superAdminSubscriptionSettings);
}

export async function updateSaSubscriptionSettings(
  body: Partial<{
    billingEnabled: boolean;
    defaultGraceDays: number;
    renewalBaseUrl: string;
    notificationCadenceDays: string;
    preExpiryReminderDays: number;
  }>,
): Promise<SaSubscriptionSettingsRecord> {
  return saRequest<SaSubscriptionSettingsRecord>(API_ROUTES.superAdminSubscriptionSettings, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchSaSubscriptionPlans(): Promise<SaSubscriptionPlanRecord[]> {
  const payload = await saRequest<{ plans: SaSubscriptionPlanRecord[] }>(
    API_ROUTES.superAdminSubscriptionPlans,
  );
  return payload.plans ?? [];
}

export async function upsertSaSubscriptionPlan(
  tierCode: string,
  body: Partial<{
    displayName: string;
    monthlyPriceKes: number;
    annualPriceKes: number | null;
    graceDays: number;
    active: boolean;
  }>,
): Promise<SaSubscriptionPlanRecord[]> {
  const payload = await saRequest<{ plans: SaSubscriptionPlanRecord[] }>(
    `${API_ROUTES.superAdminSubscriptionPlans}/${encodeURIComponent(tierCode)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return payload.plans ?? [];
}

export async function fetchSaSubscriptionDunning(): Promise<SaSubscriptionDunningRecord> {
  return saRequest<SaSubscriptionDunningRecord>(API_ROUTES.superAdminSubscriptionDunning);
}

export type SaBusinessSubscriptionRecord = {
  businessId: string;
  tier: string;
  tierDisplayName: string;
  billingStatus: "ACTIVE" | "GRACE" | "SUSPENDED";
  currentPeriodEnd: string | null;
  graceStartedAt: string | null;
  graceEndsAt: string | null;
  billingSuspendedAt: string | null;
  suspensionReason: string | null;
  amountDueKes: number;
};

export async function fetchSaBusinessSubscription(
  businessId: string,
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    API_ROUTES.superAdminBusinessSubscription(businessId),
  );
}

export async function extendSaBusinessSubscription(
  businessId: string,
  body: { months: number; note?: string | null },
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    `${API_ROUTES.superAdminBusinessSubscription(businessId)}/extend`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function extendSaBusinessGrace(
  businessId: string,
  body: { days: number; note?: string | null },
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    `${API_ROUTES.superAdminBusinessSubscription(businessId)}/extend-grace`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function assignSaBusinessPlan(
  businessId: string,
  body: { tierCode: string; note?: string | null },
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    `${API_ROUTES.superAdminBusinessSubscription(businessId)}/plan`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function overrideSaBusinessSubscription(
  businessId: string,
  body: {
    tierCode?: string | null;
    billingStatus?: "ACTIVE" | "GRACE" | "SUSPENDED" | null;
    currentPeriodEnd?: string | null;
    graceEndsAt?: string | null;
    note?: string | null;
  },
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    API_ROUTES.superAdminBusinessSubscription(businessId),
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function reactivateSaBusinessSubscription(
  businessId: string,
): Promise<SaBusinessSubscriptionRecord> {
  return saRequest<SaBusinessSubscriptionRecord>(
    `${API_ROUTES.superAdminBusinessSubscription(businessId)}/reactivate`,
    { method: "POST" },
  );
}

export type SaSmsCreditUsageRecord = {
  cycleStartedAt: string;
  totalSentThisCycle: number;
  includedSentThisCycle: number;
  purchasedSentThisCycle: number;
  depletedCount: number;
  topTenants: {
    businessId: string;
    name: string;
    tier: string;
    sentThisCycle: number;
    available: number;
  }[];
};

export async function fetchSmsCreditUsage(): Promise<SaSmsCreditUsageRecord> {
  return saRequest<SaSmsCreditUsageRecord>(API_ROUTES.superAdminSmsCreditsUsage);
}

export type ServingTicketStatus = "NEW" | "OPEN" | "WAITING" | "RESOLVED" | "CLOSED";
export type ServingTicketType = "TENANT" | "SHOPPER";
export type ServingTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ServingTicketCategory =
  | "BILLING"
  | "ONBOARDING"
  | "BUG"
  | "DOMAIN"
  | "MARKETPLACE"
  | "OTHER";

export type ServingTicketSummary = {
  id: string;
  ticketNumber: number;
  displayNumber: string;
  type: ServingTicketType | string;
  status: ServingTicketStatus | string;
  priority: ServingTicketPriority | string;
  category: ServingTicketCategory | string;
  subject: string;
  businessId: string | null;
  businessName: string | null;
  requesterName: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  shopperName: string | null;
  shopperPhone?: string | null;
  orderId?: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  conversationId: string | null;
  contactMessageId: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  shopSeq?: number | null;
  pointCount?: number;
  doneCount?: number;
};

export type ServingTicketPoint = {
  id: string;
  seq: number;
  title: string;
  detail: string | null;
  status: "OPEN" | "DONE" | string;
  source?: string | null;
  completedAt: string | null;
  completedByName: string | null;
  completedByKind: "STAFF" | "TENANT" | string | null;
};

export type ServingTicketNote = {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type ServingTicketEvent = {
  id: string;
  kind: string;
  actorId: string | null;
  actorName: string | null;
  payload: string | null;
  createdAt: string;
};

export type ServingTicketDetail = {
  ticket: ServingTicketSummary;
  messages: import("@/lib/support-api").SupportMessage[];
  notes: ServingTicketNote[];
  events: ServingTicketEvent[];
  points: ServingTicketPoint[];
};

export type ServingOrganizeResult = {
  ticket: ServingTicketDetail;
  source: "AI" | "HEURISTIC" | string;
};

export type ServingStaffRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  deskRole: SaDeskRole | string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  openCount: number;
  waitingCount: number;
  currentUser: boolean;
};

export type ServingBoardAgent = {
  id: string;
  name: string;
  email: string;
  deskRole: string;
  openCount: number;
  waitingCount: number;
  tickets: ServingTicketSummary[];
};

export type ServingBoard = {
  unassigned: ServingTicketSummary[];
  agents: ServingBoardAgent[];
  waiting: ServingTicketSummary[];
  resolved: ServingTicketSummary[];
};

export async function fetchSaServingTickets(opts?: {
  status?: string;
  type?: string;
  assignee?: string;
  businessId?: string;
  conversationId?: string;
  contactMessageId?: string;
  q?: string;
}): Promise<{ tickets: ServingTicketSummary[]; total: number }> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.assignee) params.set("assignee", opts.assignee);
  if (opts?.businessId) params.set("businessId", opts.businessId);
  if (opts?.conversationId) params.set("conversationId", opts.conversationId);
  if (opts?.contactMessageId) params.set("contactMessageId", opts.contactMessageId);
  if (opts?.q) params.set("q", opts.q);
  const qs = params.toString();
  return saRequest(`${API_ROUTES.superAdminServing}/tickets${qs ? `?${qs}` : ""}`);
}

export async function fetchSaServingTicket(id: string): Promise<ServingTicketDetail> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}`);
}

export async function createSaServingTicket(body: {
  type: ServingTicketType;
  subject: string;
  category?: string;
  priority?: string;
  businessId?: string;
  shopperName?: string;
  shopperPhone?: string;
  orderId?: string;
  body?: string;
}): Promise<ServingTicketSummary> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function assignSaServingTicket(
  id: string,
  assigneeId: string | null,
): Promise<ServingTicketSummary> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigneeId }),
  });
}

export async function claimSaServingTicket(id: string): Promise<ServingTicketSummary> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/claim`, {
    method: "POST",
  });
}

export async function setSaServingTicketStatus(
  id: string,
  status: ServingTicketStatus,
): Promise<ServingTicketSummary> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function patchSaServingTicket(
  id: string,
  body: { category?: string; priority?: string },
): Promise<ServingTicketSummary> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function replySaServingTicket(
  id: string,
  body: string,
): Promise<import("@/lib/support-api").SupportMessage> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function noteSaServingTicket(id: string, body: string): Promise<ServingTicketNote> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function promoteSaConversationToTicket(
  conversationId: string,
): Promise<ServingTicketSummary> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/from-conversation/${encodeURIComponent(conversationId)}`,
    { method: "POST" },
  );
}

export async function openSaTicketFromContact(
  contactMessageId: string,
): Promise<ServingTicketSummary> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/from-contact/${encodeURIComponent(contactMessageId)}`,
    { method: "POST" },
  );
}

export async function organizeSaServingTicket(id: string): Promise<ServingOrganizeResult> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(id)}/organize`, {
    method: "POST",
  });
}

export async function organizeSaConversationToTicket(
  conversationId: string,
): Promise<ServingOrganizeResult> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/organize-from-conversation/${encodeURIComponent(conversationId)}`,
    { method: "POST" },
  );
}

export async function organizeSaContactToTicket(
  contactMessageId: string,
): Promise<ServingOrganizeResult> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/organize-from-contact/${encodeURIComponent(contactMessageId)}`,
    { method: "POST" },
  );
}

export async function addSaServingPoint(
  ticketId: string,
  body: { title: string; detail?: string },
): Promise<ServingTicketPoint> {
  return saRequest(`${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(ticketId)}/points`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function completeSaServingPoint(
  ticketId: string,
  pointId: string,
): Promise<ServingTicketPoint> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(ticketId)}/points/${encodeURIComponent(pointId)}/complete`,
    { method: "POST" },
  );
}

export async function reopenSaServingPoint(
  ticketId: string,
  pointId: string,
): Promise<ServingTicketPoint> {
  return saRequest(
    `${API_ROUTES.superAdminServing}/tickets/${encodeURIComponent(ticketId)}/points/${encodeURIComponent(pointId)}/reopen`,
    { method: "POST" },
  );
}

export async function fetchSaServingShops(): Promise<{ shops: Array<{ id: string; name: string; slug: string }> }> {
  return saRequest(`${API_ROUTES.superAdminServing}/shops`);
}

export async function fetchSaServingBoard(): Promise<ServingBoard> {
  return saRequest(`${API_ROUTES.superAdminServing}/board`);
}

export async function fetchSaServingAssignees(): Promise<{ assignees: Array<{ id: string; name: string }> }> {
  return saRequest(`${API_ROUTES.superAdminServing}/assignees`);
}

export async function fetchSaServingStaff(): Promise<{ staff: ServingStaffRow[]; total: number }> {
  return saRequest(`${API_ROUTES.superAdminServing}/staff`);
}

export async function inviteSaServingStaff(body: {
  name: string;
  email: string;
  phone?: string;
  deskRole: SaDeskRole;
  password: string;
}): Promise<{ staff: ServingStaffRow; temporaryPassword: string }> {
  return saRequest(`${API_ROUTES.superAdminServing}/staff`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchSaServingStaff(
  id: string,
  body: { deskRole?: SaDeskRole; active?: boolean; name?: string; phone?: string },
): Promise<ServingStaffRow> {
  return saRequest(`${API_ROUTES.superAdminServing}/staff/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

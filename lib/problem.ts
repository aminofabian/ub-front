import { ERROR_CODES, PROBLEM_TITLES } from "@/lib/config";

export type ProblemResponse = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
};

const UNAUTHORIZED_PROBLEM_TYPE = "urn:problem:unauthorized";

/** JWT filter / refresh / session revocation titles — sign out instead of surfacing a toast. */
const SESSION_AUTH_TITLES = new Set([
  "User not found",
  "Account is not active",
  "Account is temporarily locked",
  "Invalid token claims",
  "Invalid or expired token",
  PROBLEM_TITLES.invalidOrExpiredAccessToken,
]);

const TENANT_TOKEN_MISMATCH_TITLE =
  "Token tenant does not match resolved host tenant";

export type ProblemValidationFieldError = {
  field: string;
  message: string;
};

/**
 * Shown only when the server gave us nothing usable. Prefer connection-aware
 * copy — see {@link isBareRequestFailureMessage} and
 * {@link isTransientBackendStatus}.
 */
export const DEFAULT_PROBLEM_TITLE = "Something went wrong. Please try again.";

const TENANT_NOT_FOUND_PROBLEM_TYPE = "urn:problem:tenant-not-found";
const UNMAPPED_TENANT_HOST_DETAIL_PREFIX =
  "No active tenant mapping found for host:";

const TENANT_CONTEXT_MISSING_PREFIX = "Tenant context missing";

const GENERIC_PROBLEM_TITLES = new Set([
  "",
  "Bad Request",
  "Unauthorized",
  "Forbidden",
  "Not Found",
  "Conflict",
  "Internal Server Error",
]);

export function parseProblemValidationErrors(
  payload: unknown,
): ProblemValidationFieldError[] | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const errors = (payload as Record<string, unknown>).errors;
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }
  const out: ProblemValidationFieldError[] = [];
  for (const entry of errors) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rec = entry as Record<string, unknown>;
    const field = typeof rec.field === "string" ? rec.field : "";
    const message = typeof rec.message === "string" ? rec.message : "";
    if (field.length > 0 || message.length > 0) {
      out.push({ field, message });
    }
  }
  return out.length > 0 ? out : null;
}

/**
 * User-visible message from an RFC 7807 / problem+json body, including `errors` for validation.
 */
export function formatApiProblemMessage(payload: unknown): string {
  return formatApiProblemMessageInternal(payload, { maskOtpSetup: true });
}

/**
 * Same as {@link formatApiProblemMessage} but keeps SMS/WhatsApp setup detail for
 * authenticated operators (settings / setup-progress), instead of the shopper-facing mask.
 */
export function formatOperatorApiProblemMessage(payload: unknown): string {
  return formatApiProblemMessageInternal(payload, { maskOtpSetup: false });
}

function formatApiProblemMessageInternal(
  payload: unknown,
  options: { maskOtpSetup: boolean },
): string {
  const problem = parseProblem(payload);
  const validation = parseProblemValidationErrors(payload);
  const title =
    problem != null && problem.title.trim().length > 0
      ? problem.title.trim()
      : DEFAULT_PROBLEM_TITLE;

  if (validation) {
    const lines = validation.map((e) =>
      e.field.length > 0 ? `${e.field}: ${e.message}`.trim() : e.message,
    );
    return [title, ...lines].join("\n");
  }

  const detail = problem?.detail?.trim();
  if (detail && detail.length > 0) {
    const combined =
      GENERIC_PROBLEM_TITLES.has(title) || detail === title
        ? detail
        : `${title}\n${detail}`;
    if (options.maskOtpSetup) {
      return friendlyOtpDeliveryMessage(combined) ?? combined;
    }
    return combined;
  }

  if (title.length > 0) {
    if (options.maskOtpSetup) {
      return friendlyOtpDeliveryMessage(title) ?? title;
    }
    return title;
  }
  return DEFAULT_PROBLEM_TITLE;
}

export function parseProblem(payload: unknown): ProblemResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  let title = typeof record.title === "string" ? record.title.trim() : "";
  const springMessage =
    typeof record.message === "string" ? record.message.trim() : "";
  if (!title && springMessage) {
    title = springMessage;
  }
  if (!title && typeof record.error === "string") {
    title = record.error.trim();
  }
  const type = typeof record.type === "string" ? record.type : "about:blank";
  const status =
    typeof record.status === "number" && Number.isFinite(record.status)
      ? record.status
      : 500;
  const detail = typeof record.detail === "string" ? record.detail : undefined;
  const code = typeof record.code === "string" ? record.code : undefined;

  return { type, title, status, detail, code };
}

/** Unknown tenant host from {@code DomainBusinessResolverFilter} (404 problem+json). */
/** Catalog/pricing row missing (deleted item, wrong tenant, etc.). */
export function isItemNotFoundProblem(payload: unknown): boolean {
  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }
  const detail = problem.detail?.trim().toLowerCase() ?? "";
  return detail === "item not found";
}

/**
 * Whether an API failure means the stored session is unusable and the client should
 * clear auth data and redirect to login. Skips public/unauthenticated calls (e.g. login).
 *
 * <p>401 from an authenticated call is treated as a session failure. 403 only
 * signs out when the problem body carries an auth signal (tenant token mismatch,
 * expired token, etc.) — generic permission-denied keeps the session and
 * surfaces a toast. Other 4xx/5xx responses (404 tenant-not-found, tenant
 * context missing, etc.) are treated as normal request failures — the user
 * keeps their session and sees a toast.
 *
 * <p>Note: {@link TENANT_TOKEN_MISMATCH_TITLE}, {@link UNAUTHORIZED_PROBLEM_TYPE},
 * {@link SESSION_AUTH_TITLES}, {@link PROBLEM_TITLES.invalidOrExpiredAccessToken},
 * and {@link ERROR_CODES.tokenExpired} are kept as fall-throughs so that any
 * future status code carrying those signals (e.g. a 400 with token_expired)
 * still triggers sign-out.
 */
export function isSessionRelatedProblem(
  status: number,
  payload: unknown,
  options?: { requiresAuth?: boolean },
): boolean {
  if (options?.requiresAuth === false) {
    return false;
  }

  if (status === 401) {
    const problem401 = parseProblem(payload);
    if (
      problem401?.title === PROBLEM_TITLES.refreshAlreadyRotated ||
      problem401?.detail === PROBLEM_TITLES.refreshAlreadyRotated ||
      problem401?.code === ERROR_CODES.refreshAlreadyRotated
    ) {
      return false;
    }
    return true;
  }

  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }

  if (problem.title === PROBLEM_TITLES.invalidOrExpiredAccessToken) {
    return true;
  }
  if (problem.code === ERROR_CODES.tokenExpired) {
    return true;
  }
  if (problem.code === ERROR_CODES.sessionIdleExpired) {
    return true;
  }
  if (problem.title === PROBLEM_TITLES.sessionIdleExpired) {
    return true;
  }
  if (problem.detail === PROBLEM_TITLES.sessionIdleExpired) {
    return true;
  }
  if (problem.title === PROBLEM_TITLES.refreshAlreadyRotated) {
    return false;
  }
  if (problem.detail === PROBLEM_TITLES.refreshAlreadyRotated) {
    return false;
  }
  if (problem.type === UNAUTHORIZED_PROBLEM_TYPE) {
    return true;
  }
  if (SESSION_AUTH_TITLES.has(problem.title)) {
    return true;
  }
  if (problem.title === TENANT_TOKEN_MISMATCH_TITLE) {
    return true;
  }
  // Tenant-context-missing is a routing header problem, not a dead session.
  // Treating it as logout bounced owners to login whenever X-Tenant-Id dropped.

  return false;
}

/** {@code TenantRequestIds} when neither domain resolver nor {@code X-Tenant-Id} is present (400). */
export function isTenantContextMissingProblem(payload: unknown): boolean {
  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }
  const detail = problem.detail?.trim() ?? "";
  if (detail.startsWith(TENANT_CONTEXT_MISSING_PREFIX)) {
    return true;
  }
  return problem.title.startsWith(TENANT_CONTEXT_MISSING_PREFIX);
}

export function isUnmappedTenantHostProblem(payload: unknown): boolean {
  const problem = parseProblem(payload);
  if (!problem) {
    return false;
  }
  if (problem.type === TENANT_NOT_FOUND_PROBLEM_TYPE) {
    return true;
  }
  if (problem.title !== "Tenant not found") {
    return false;
  }
  const detail = problem.detail?.trim() ?? "";
  return detail.startsWith(UNMAPPED_TENANT_HOST_DETAIL_PREFIX);
}

/** Prefer machine-readable detail for types where the title alone is easy to confuse with auth failures. */
const PROBLEM_TYPES_WHERE_DETAIL_IS_PRIMARY = new Set([
  "urn:problem:tenant-not-found",
  "urn:problem:tenant-not-active",
]);

export function getProblemTitle(payload: unknown): string {
  const validation = parseProblemValidationErrors(payload);
  if (validation) {
    return formatApiProblemMessage(payload);
  }
  const problem = parseProblem(payload);
  if (!problem) {
    return DEFAULT_PROBLEM_TITLE;
  }

  const detail = problem.detail?.trim();
  if (detail && PROBLEM_TYPES_WHERE_DETAIL_IS_PRIMARY.has(problem.type)) {
    return detail;
  }
  if (detail) {
    const friendlyOtp = friendlyOtpDeliveryMessage(detail);
    if (friendlyOtp) {
      return friendlyOtp;
    }
    const friendlyBranch = friendlyBranchRequiredMessage(detail);
    if (friendlyBranch) {
      return friendlyBranch;
    }
  }
  if (detail && GENERIC_PROBLEM_TITLES.has(problem.title)) {
    return detail;
  }

  if (problem.title.length > 0) {
    const friendlyOtp = friendlyOtpDeliveryMessage(problem.title);
    if (friendlyOtp) {
      return friendlyOtp;
    }
    const friendlyBranch = friendlyBranchRequiredMessage(problem.title);
    if (friendlyBranch) {
      return friendlyBranch;
    }
    return problem.title;
  }

  return DEFAULT_PROBLEM_TITLE;
}

/** Hide operator SMS/WhatsApp setup copy from shoppers and suppliers. */
function friendlyOtpDeliveryMessage(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  if (
    normalized.includes("sozuri") ||
    normalized.includes("textsms") ||
    normalized.includes("super admin") ||
    normalized.includes("platform integrations") ||
    normalized.includes("sms is required") ||
    normalized.includes("messaging is not configured") ||
    normalized.includes("configure sms") ||
    normalized.includes("24h window") ||
    normalized.includes("free-form whatsapp")
  ) {
    return "We couldn't send the code. Check the number and try again in a moment.";
  }
  return null;
}

/**
 * Branch-resolution coaching — missing location, not a hard failure.
 * Shown as a shell banner instead of an error toast.
 */
export type BranchGuidanceKind = "pick" | "assign";

export function getBranchGuidanceKind(
  text: string,
): BranchGuidanceKind | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized.includes("assign you a branch") ||
    normalized.includes("not assigned to a branch") ||
    normalized.includes("needs a shop location")
  ) {
    return "assign";
  }
  if (
    normalized.includes("choose a shop location first") ||
    normalized.includes("pick a branch in the top bar") ||
    normalized.includes("pick a branch in the filter") ||
    normalized.includes("select a branch before adding") ||
    (normalized.includes("branch is required") &&
      (normalized.includes("select a branch") ||
        normalized.includes("contact your administrator") ||
        normalized.includes("try again")))
  ) {
    return "pick";
  }
  return null;
}

export function isBranchGuidanceMessage(text: string): boolean {
  return getBranchGuidanceKind(text) != null;
}

/**
 * POS readiness coaching — unregistered till or missing shift.
 * Shown as a till chrome banner instead of an error toast.
 */
export type PosGuidanceKind = "register-till" | "open-shift";

export function getPosGuidanceKind(text: string): PosGuidanceKind | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized.includes("till is not registered") ||
    normalized.includes("till device not registered") ||
    normalized.includes("trusted tills")
  ) {
    return "register-till";
  }
  if (
    normalized.includes("no open shift") ||
    normalized.includes("open a shift") ||
    normalized.includes("open the register")
  ) {
    return "open-shift";
  }
  return null;
}

export function isPosGuidanceMessage(text: string): boolean {
  return getPosGuidanceKind(text) != null;
}

/**
 * Copy that means "the session needs recovery", not "the user did something
 * wrong". Never toast these — reconnect / PIN / sign-in own the UX.
 */
export function isAuthRecoveryUserMessage(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("session expired") ||
    normalized.includes("session ended") ||
    normalized.includes("session is no longer active") ||
    normalized.includes("session idle timeout") ||
    normalized.includes("invalid or expired access token") ||
    normalized.includes("invalid or expired token") ||
    normalized.includes("sign in again")
  );
}

/**
 * Copy that carries no information the user can act on — what's left when a
 * gateway, a restarted backend, or a dropped keep-alive answers with an empty
 * or non-problem body. Never toast these: they describe our plumbing, not
 * anything the user did, and the connection banner owns that state instead.
 */
const BARE_FAILURE_TITLES =
  /^(request failed|something went wrong(\. please try again)?|unknown error|error|http error|internal server error|bad gateway|gateway time-?out|service (temporarily )?unavailable|no response|failed to fetch|load failed|network(\s?error)?)$/i;

export function isBareRequestFailureMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.includes("\n")) {
    // A detail line means the server told us something specific.
    return false;
  }
  const withoutStatus = trimmed
    .replace(/\s*\(\s*\d{3}\s*\)\s*$/, "")
    .replace(/[.!]+$/, "")
    .trim();
  return BARE_FAILURE_TITLES.test(withoutStatus);
}

/**
 * Statuses that mean "try again shortly", not "you did something wrong":
 * client-side network failure (0), timeouts, rate limits, and the gateway 5xx
 * family a proxy emits when the upstream is asleep, restarting, or slow.
 */
const TRANSIENT_BACKEND_STATUSES = new Set([
  0, 408, 425, 429, 502, 503, 504, 521, 522, 523, 524, 598, 599,
]);

export function isTransientBackendStatus(status: number): boolean {
  return TRANSIENT_BACKEND_STATUSES.has(status);
}

/**
 * HTTP failures that should stay silent: auth recovery, not a user-facing error.
 * "Request failed" alone is still a real error; skip it only when paired with
 * a session signal (status, problem body, or recovery copy).
 */
export function shouldOmitHttpErrorToast(
  message: string,
  status?: number,
  payload?: unknown,
): boolean {
  if (
    status != null &&
    isSessionRelatedProblem(status, payload, { requiresAuth: true })
  ) {
    return true;
  }
  return isAuthRecoveryUserMessage(message);
}

/** Soften harsh branch-resolution copy into actionable guidance. */
function friendlyBranchRequiredMessage(detail: string): string | null {
  const kind = getBranchGuidanceKind(detail);
  if (kind === "assign") {
    return "Your account needs a shop location. Ask an owner to assign you a branch, then try again.";
  }
  if (kind === "pick") {
    return "Choose a shop location first — pick a branch in the top bar, then try again.";
  }
  return null;
}

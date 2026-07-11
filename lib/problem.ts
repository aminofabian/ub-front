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

const DEFAULT_PROBLEM_TITLE = "Request failed.";

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
  const problem = parseProblem(payload);
  const validation = parseProblemValidationErrors(payload);
  const title =
    problem != null && problem.title.trim().length > 0
      ? problem.title.trim()
      : DEFAULT_PROBLEM_TITLE.replace(/\.$/, "");

  if (validation) {
    const lines = validation.map((e) =>
      e.field.length > 0 ? `${e.field}: ${e.message}`.trim() : e.message,
    );
    return [title, ...lines].join("\n");
  }

  const detail = problem?.detail?.trim();
  if (detail && detail.length > 0) {
    if (GENERIC_PROBLEM_TITLES.has(title) || detail === title) {
      return detail;
    }
    return `${title}\n${detail}`;
  }

  return title.length > 0 ? title : DEFAULT_PROBLEM_TITLE.replace(/\.$/, "");
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
 * surfaces a toast. Other 4xx/5xx responses (404 tenant-not-found, etc.) are
 * (404 tenant-not-found, etc.) are treated as normal request failures - the
 * user keeps their session and sees a toast. Authenticated calls that return
 * 400 tenant-context-missing also sign out: the JWT filter rejects the request
 * before session-revocation checks when {@code X-Tenant-Id} / host mapping is
 * absent, which commonly happens once stored tenant context is lost while
 * tokens remain in {@code localStorage}.
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
  if (isTenantContextMissingProblem(payload)) {
    return true;
  }

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
  if (detail && GENERIC_PROBLEM_TITLES.has(problem.title)) {
    return detail;
  }

  return problem.title.length > 0 ? problem.title : DEFAULT_PROBLEM_TITLE;
}

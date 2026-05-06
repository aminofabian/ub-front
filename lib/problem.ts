export type ProblemResponse = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
};

export type ProblemValidationFieldError = {
  field: string;
  message: string;
};

const DEFAULT_PROBLEM_TITLE = "Request failed.";

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
    return `${title}\n${detail}`;
  }

  return title.length > 0 ? title : DEFAULT_PROBLEM_TITLE.replace(/\.$/, "");
}

export function parseProblem(payload: unknown): ProblemResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title : "";
  const type = typeof record.type === "string" ? record.type : "about:blank";
  const status =
    typeof record.status === "number" && Number.isFinite(record.status)
      ? record.status
      : 500;
  const detail = typeof record.detail === "string" ? record.detail : undefined;
  const code = typeof record.code === "string" ? record.code : undefined;

  return { type, title, status, detail, code };
}

const GENERIC_PROBLEM_TITLES = new Set([
  "",
  "Bad Request",
  "Unauthorized",
  "Forbidden",
  "Not Found",
  "Internal Server Error",
]);

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

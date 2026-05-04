export type ProblemResponse = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code?: string;
};

const DEFAULT_PROBLEM_TITLE = "Request failed.";

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

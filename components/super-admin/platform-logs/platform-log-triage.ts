import type {
  PlatformRequestLogCategory,
  PlatformRequestLogRow,
} from "@/lib/super-admin-api";

import { CATEGORY_LABELS, isExpectedHostLookup } from "./platform-logs-shared";

/**
 * Triage helpers for the platform request stream.
 *
 * The API returns the newest N rows (no aggregates, no grouping), so the page
 * has to do the "what is actually broken" reduction itself. Everything here is
 * pure and cheap enough to run on every 5 s refresh of ≤ 500 rows.
 */

export type FailureGroup = {
  key: string;
  status: number;
  method: string;
  /** Path with ids collapsed, e.g. `/api/v1/businesses/:id/orders`. */
  pathTemplate: string;
  /** Best human label for the failure: error title → exception class → type. */
  title: string;
  category: PlatformRequestLogCategory;
  count: number;
  /** Distinct tenant labels (business name, falling back to id or "Platform"). */
  tenants: string[];
  firstSeen: string;
  lastSeen: string;
  sampleId: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const HEX_RE = /^[0-9a-f]{12,}$/i;
const NUMERIC_RE = /^\d+$/;
const LONG_TOKEN_RE = /^[A-Za-z0-9_-]{20,}$/;

function isIdSegment(segment: string): boolean {
  return (
    UUID_RE.test(segment) ||
    ULID_RE.test(segment) ||
    HEX_RE.test(segment) ||
    NUMERIC_RE.test(segment) ||
    LONG_TOKEN_RE.test(segment)
  );
}

/**
 * Collapse identifier segments so `/businesses/abc…/orders/42` and
 * `/businesses/def…/orders/43` group together. Query strings are dropped:
 * the interesting part of a failing request is the route, not the parameters.
 */
export function pathTemplate(path: string): string {
  if (!path) return "";
  const pathname = path.split("?")[0]?.split("#")[0] ?? "";
  if (!pathname.startsWith("/")) return pathname;
  return pathname
    .split("/")
    .map((segment) => (segment && isIdSegment(segment) ? ":id" : segment))
    .join("/");
}

export function failureTitle(row: PlatformRequestLogRow): string {
  return (
    row.errorTitle?.trim() ||
    row.exceptionClass?.trim() ||
    row.errorType?.trim() ||
    `HTTP ${row.status}`
  );
}

/** One stable identity per *kind* of failure, for repeat-collapsing. */
export function failureGroupKey(row: PlatformRequestLogRow): string {
  return [
    row.status,
    row.method.toUpperCase(),
    pathTemplate(row.path),
    row.errorTitle?.trim() ?? "",
    row.exceptionClass?.trim() ?? "",
    row.errorType?.trim() ?? "",
  ].join("|");
}

/** A failure a human should look at — expected host-lookup 404s excluded. */
export function isUnexpectedFailure(row: PlatformRequestLogRow): boolean {
  return !row.success && !isExpectedHostLookup(row);
}

export function tenantLabel(row: PlatformRequestLogRow): string {
  return row.businessName?.trim() || row.businessId?.trim() || "Platform";
}

/**
 * Collapse repeats of the same failure into one row, newest-first inside each
 * group and largest-first across groups. This is the difference between "41
 * red lines" and "one broken endpoint, 41 times, 6 tenants, since 09:12".
 */
export function groupFailures(
  rows: readonly PlatformRequestLogRow[],
): FailureGroup[] {
  const groups = new Map<string, FailureGroup>();

  for (const row of rows) {
    if (!isUnexpectedFailure(row)) continue;
    const key = failureGroupKey(row);
    const tenant = tenantLabel(row);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        status: row.status,
        method: row.method,
        pathTemplate: pathTemplate(row.path),
        title: failureTitle(row),
        category: row.category,
        count: 1,
        tenants: [tenant],
        firstSeen: row.loggedAt,
        lastSeen: row.loggedAt,
        sampleId: row.id,
      });
      continue;
    }

    existing.count += 1;
    if (!existing.tenants.includes(tenant)) existing.tenants.push(tenant);
    if (row.loggedAt < existing.firstSeen) existing.firstSeen = row.loggedAt;
    if (row.loggedAt > existing.lastSeen) existing.lastSeen = row.loggedAt;
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen),
  );
}

/** "Mama Njeri · +4 tenants" — or "Platform" for tenant-less traffic. */
export function tenantSummary(group: FailureGroup): string {
  const [first, ...rest] = group.tenants;
  if (!first) return "Platform";
  return rest.length === 0 ? first : `${first} · +${rest.length}`;
}

/**
 * Nearest-rank percentile (p95 etc.) over a value list. `null` when empty.
 * Used for latency, where a mean hides exactly the requests worth chasing.
 */
export function percentile(
  values: readonly number[],
  percentileValue: number,
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((percentileValue / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index] ?? null;
}

/**
 * Token-AND search over everything a person would paste into the box: status,
 * route, tenant, error text, correlation id, IP. Multi-word queries narrow
 * (`500 mpesa`); a single token broadens.
 */
export function searchRows(
  rows: readonly PlatformRequestLogRow[],
  query: string,
): PlatformRequestLogRow[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...rows];

  return rows.filter((row) => {
    const haystack = [
      row.status,
      row.method,
      row.path,
      row.businessName,
      row.businessId,
      row.errorTitle,
      row.errorDetail,
      row.exceptionClass,
      row.errorType,
      row.correlationId,
      row.ip,
      row.category,
      CATEGORY_LABELS[row.category],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Latency severity: 1 s is the "worth a look", 3 s the "this is broken" line. */
export function latencyTone(ms: number): "normal" | "warn" | "bad" {
  if (ms >= 3000) return "bad";
  if (ms >= 1000) return "warn";
  return "normal";
}

export function countHiddenExpected(
  rows: readonly PlatformRequestLogRow[],
): number {
  return rows.filter(isExpectedHostLookup).length;
}

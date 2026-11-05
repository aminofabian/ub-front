import type {
  SaBusinessRow,
  SaSupportPresencePayload,
} from "@/lib/super-admin-api";

/** Who is on the app right now. `support` means online and in the support chat. */
export type PresenceFilter = "all" | "online" | "support" | "offline";
export type StatusFilter = "all" | "active" | "inactive" | "stuck" | "new";
export type SortKey = "newest" | "online" | "seen" | "name";

export type TenantFilters = {
  query: string;
  presence: PresenceFilter;
  status: StatusFilter;
  tier: string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: TenantFilters = {
  query: "",
  presence: "all",
  status: "all",
  tier: "",
  sort: "newest",
};

/** A tenant counts as "new" for this many days after it is created. */
export const NEW_TENANT_DAYS = 7;

/** True when nothing narrows the list. Sorting does not count as a filter. */
export function filtersAreDefault(filters: TenantFilters): boolean {
  return (
    filters.query.trim() === "" &&
    filters.presence === "all" &&
    filters.status === "all" &&
    filters.tier.trim() === ""
  );
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

/** Live signal for one tenant, derived from the presence endpoint. */
export type TenantPresence = {
  online: boolean;
  /** Online and subscribed to the support channel. */
  onSupport: boolean;
  /** Open realtime connections (tabs, tills, apps). 0 when offline or unknown. */
  sessions: number;
  /** Last activity (ms epoch) since the API started, or null when never seen. */
  lastSeenAt: number | null;
};

export const OFFLINE: TenantPresence = {
  online: false,
  onSupport: false,
  sessions: 0,
  lastSeenAt: null,
};

export type PresenceIndex = {
  byId: ReadonlyMap<string, TenantPresence>;
  /**
   * True when the API reports every online tenant. False on an API that only
   * returns a total, where just tenants on the support channel can be marked.
   */
  perTenant: boolean;
  /** Distinct tenants online according to the API (may include unlisted ones). */
  totalOnline: number | null;
};

export const EMPTY_PRESENCE: PresenceIndex = {
  byId: new Map(),
  perTenant: false,
  totalOnline: null,
};

function parseTime(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function buildPresenceIndex(
  payload: SaSupportPresencePayload | null,
): PresenceIndex {
  if (!payload) return EMPTY_PRESENCE;

  const sessions = payload.tenantSessions;
  const lastSeen = payload.tenantLastSeen ?? {};
  const ids = new Set<string>([
    ...Object.keys(payload.presence),
    ...Object.keys(lastSeen),
    ...(sessions ? Object.keys(sessions) : []),
  ]);

  const byId = new Map<string, TenantPresence>();
  for (const id of ids) {
    const support = payload.presence[id];
    const open = sessions?.[id] ?? 0;
    const onSupport = support?.online === true;
    byId.set(id, {
      online: open > 0 || onSupport,
      onSupport,
      sessions: open,
      lastSeenAt: parseTime(lastSeen[id]) ?? parseTime(support?.lastSeenAt),
    });
  }

  return {
    byId,
    perTenant: sessions !== undefined,
    totalOnline: payload.tenantsOnline,
  };
}

export function presenceOf(index: PresenceIndex, id: string): TenantPresence {
  return index.byId.get(id) ?? OFFLINE;
}

/**
 * How much the live feed can be trusted:
 * - "full": every online tenant is listed.
 * - "support": an older API that only names tenants on the support channel,
 *   so a tenant that looks offline may simply not be on support.
 * - "unknown": no answer yet, or the feed is down. Nobody should read as offline.
 */
export type LiveMode = "full" | "support" | "unknown";

export function liveModeOf(index: PresenceIndex): LiveMode {
  if (index.totalOnline === null) return "unknown";
  return index.perTenant ? "full" : "support";
}

/* ------------------------------------------------------------------ */
/* Filtering, sorting, counting                                        */
/* ------------------------------------------------------------------ */

export type FilterContext = {
  stuckIds: ReadonlySet<string>;
  presence: PresenceIndex;
  /** ms epoch the lists were last refreshed; keeps "new" and "ago" stable. */
  now: number;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function matchesQuery(row: SaBusinessRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    row.name,
    row.slug,
    row.id,
    row.ownerName,
    row.ownerEmail,
    row.ownerPhone,
  ].map((value) => (value ?? "").toLowerCase());
  if (haystack.some((value) => value.includes(q))) return true;

  // "0712 345 678" should find "+254712345678".
  const queryDigits = digitsOnly(q);
  if (queryDigits.length >= 4) {
    const tail =
      queryDigits.length > 9
        ? queryDigits.slice(-9)
        : queryDigits.replace(/^0+/, "");
    if (tail.length >= 3 && digitsOnly(row.ownerPhone ?? "").includes(tail)) {
      return true;
    }
  }
  return false;
}

export function isNewTenant(row: SaBusinessRow, now: number): boolean {
  const created = Date.parse(row.createdAt);
  if (Number.isNaN(created)) return false;
  return now - created < NEW_TENANT_DAYS * 86_400_000;
}

export function filterTenants(
  rows: readonly SaBusinessRow[],
  filters: TenantFilters,
  ctx: FilterContext,
): SaBusinessRow[] {
  const tier = filters.tier.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesQuery(row, filters.query)) return false;

    const live = presenceOf(ctx.presence, row.id);
    if (filters.presence === "online" && !live.online) return false;
    if (filters.presence === "support" && !live.onSupport) return false;
    if (filters.presence === "offline" && live.online) return false;

    if (filters.status === "active" && !row.active) return false;
    if (filters.status === "inactive" && row.active) return false;
    if (filters.status === "stuck" && !ctx.stuckIds.has(row.id)) return false;
    if (filters.status === "new" && !isNewTenant(row, ctx.now)) return false;

    if (tier && row.subscriptionTier.trim().toLowerCase() !== tier) {
      return false;
    }
    return true;
  });
}

function createdMs(row: SaBusinessRow): number {
  const ms = Date.parse(row.createdAt);
  return Number.isNaN(ms) ? 0 : ms;
}

export function sortTenants(
  rows: readonly SaBusinessRow[],
  key: SortKey,
  ctx: FilterContext,
): SaBusinessRow[] {
  const list = [...rows];
  const live = (row: SaBusinessRow) => presenceOf(ctx.presence, row.id);

  switch (key) {
    case "name":
      return list.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "online":
      return list.sort((a, b) => {
        const pa = live(a);
        const pb = live(b);
        return (
          Number(pb.online) - Number(pa.online) ||
          pb.sessions - pa.sessions ||
          (pb.lastSeenAt ?? 0) - (pa.lastSeenAt ?? 0) ||
          createdMs(b) - createdMs(a)
        );
      });
    case "seen": {
      // Online tenants are "seen right now", so they lead.
      const rank = (row: SaBusinessRow) => {
        const p = live(row);
        return p.online ? Number.MAX_SAFE_INTEGER : (p.lastSeenAt ?? 0);
      };
      return list.sort(
        (a, b) => rank(b) - rank(a) || createdMs(b) - createdMs(a),
      );
    }
    default:
      return list.sort((a, b) => createdMs(b) - createdMs(a));
  }
}

export type SegmentCounts = {
  all: number;
  active: number;
  inactive: number;
  stuck: number;
  fresh: number;
  online: number;
  support: number;
  offline: number;
  /** Open connections across every listed tenant that is online. */
  sessions: number;
};

export function segmentCounts(
  rows: readonly SaBusinessRow[],
  ctx: FilterContext,
): SegmentCounts {
  const counts: SegmentCounts = {
    all: 0,
    active: 0,
    inactive: 0,
    stuck: 0,
    fresh: 0,
    online: 0,
    support: 0,
    offline: 0,
    sessions: 0,
  };
  for (const row of rows) {
    counts.all += 1;
    if (row.active) counts.active += 1;
    else counts.inactive += 1;
    if (ctx.stuckIds.has(row.id)) counts.stuck += 1;
    if (isNewTenant(row, ctx.now)) counts.fresh += 1;

    const live = presenceOf(ctx.presence, row.id);
    if (live.online) {
      counts.online += 1;
      counts.sessions += live.sessions;
      if (live.onSupport) counts.support += 1;
    } else {
      counts.offline += 1;
    }
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

export function filtersFromSearch(search: string): TenantFilters {
  const params = new URLSearchParams(search);
  const live = params.get("live");
  const state = params.get("state");
  const sort = params.get("sort");

  return {
    query: params.get("q") ?? "",
    presence:
      live === "online" || live === "support" || live === "offline"
        ? live
        : "all",
    status:
      state === "active" || state === "stuck" || state === "new"
        ? state
        : state === "off"
          ? "inactive"
          : "all",
    tier: params.get("plan") ?? "",
    sort:
      sort === "online" || sort === "seen" || sort === "name"
        ? sort
        : "newest",
  };
}

export function filtersToSearch(filters: TenantFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.presence !== "all") params.set("live", filters.presence);
  if (filters.status !== "all") {
    params.set("state", filters.status === "inactive" ? "off" : filters.status);
  }
  if (filters.tier.trim()) params.set("plan", filters.tier.trim());
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params.toString();
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * "just now", "12m ago", "3h ago", "5d ago", then a short date that fits a
 * narrow column: "11 Sep" this year, "Sep 2025" before that.
 */
export function formatAgo(
  ms: number | null | undefined,
  now: number,
): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  const mins = Math.floor(Math.max(0, now - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const then = new Date(ms);
  return then.getFullYear() === new Date(now).getFullYear()
    ? `${then.getDate()} ${MONTHS[then.getMonth()]}`
    : `${MONTHS[then.getMonth()]} ${then.getFullYear()}`;
}

/**
 * Two letters for the tenant mark: the first letter of the first two words
 * ("Mama Njeri Mini-Mart" is MN), skipping bare symbols ("Kamau & Sons" is KS),
 * or the first two letters of a single word ("Nairobi" is NA).
 */
export function initialsOf(name: string): string {
  const mark = /[\p{L}\p{N}]/gu;
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word.match(mark)?.[0])
    .filter((letter): letter is string => Boolean(letter));
  if (initials.length >= 2) return (initials[0] + initials[1]).toUpperCase();
  const letters = name.match(mark) ?? [];
  return letters.length > 0 ? letters.slice(0, 2).join("").toUpperCase() : "?";
}

/**
 * wa.me link for a Kenyan or international owner number, or null when the
 * number cannot be a phone number. "0712 345 678" becomes 254712345678.
 */
export function whatsappHref(phone?: string | null): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  let digits = digitsOnly(raw);
  if (!raw.startsWith("+")) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 10) {
      digits = `254${digits.slice(1)}`;
    } else if (digits.length === 9 && /^[17]/.test(digits)) {
      digits = `254${digits}`;
    }
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

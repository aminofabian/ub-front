import type {
  AuditEventActorType,
  AuditEventRecord,
  AuditEventSeverity,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

/**
 * The shop diary's sentence map.
 *
 * Every audit event the backend can emit gets one plain-English line with
 * named actors and targets, so an owner reads "Faith voided sale #1563 ·
 * KES 1,450 · customer left" instead of `sale.voided`. JSON stays in the
 * detail drawer. Keep till language exact: void, float, variance, drawout,
 * clear sale.
 *
 * Pure functions only — covered by `activity-stories.test.ts`.
 */

export type StoryTone = "calm" | "firm" | "alarm";

export type StoryPartKind = "actor" | "target" | "money" | "muted";

export type StoryPart = {
  text: string;
  kind?: StoryPartKind;
};

export type StoryGroup =
  | "money"
  | "security"
  | "drawer"
  | "stock"
  | "staff"
  | "orders"
  | "customers"
  | "system";

export type Story = {
  parts: StoryPart[];
  tone: StoryTone;
  /** Belongs in the "Needs a look" preset. */
  needsLook: boolean;
  /** Routine traffic hidden behind "Show routine" (sale completions, logins, …). */
  routine: boolean;
  group: StoryGroup;
  link?: { href: string; label: string };
  /** KES amount the row is about, when there is one. */
  amount?: number | null;
};

/** Event types the owner should see first: the "trust set". */
export const NEEDS_LOOK_TYPES: readonly string[] = [
  "sale.voided",
  "payment.adjusted",
  "refund.issued",
  "pos_sale.cleared",
  "pos_sales.cleared_all",
  "password.changed",
  "password.reset.requested",
  "password.reset.used",
  "pin.changed",
  "pin.viewed",
  "login.failed",
  "account.locked.soft",
  "account.locked.hard",
  "account.unlocked",
  "session.tenant_mismatch",
  "session.access_denied",
  "user.role.assigned",
  "role.created",
  "role.updated",
  "role.deleted",
  "permission.denied",
  "impersonation.started",
  "user.sessions_revoked",
  "shift.opening_updated",
  "variance.approved",
  "drawout.initiated",
  "drawout.approved",
  "drawout.rejected",
  "drawout.voided",
  "selling_price.changed",
  "buying_price.changed",
  "item.cost.adjusted",
  "stock.adjusted",
  "stock.wasted",
  "batch.cleared",
  "settings.cashier_capability_changed",
  "api_key.created",
  "api_key.revoked",
  "api_key.invalid",
  "user.deleted",
  "customer.credit_limit_changed",
  "customer.merged",
];

/** Attention chips on the pulse, in display order. Only drawn when non-zero. */
export const PULSE_CHIPS: readonly {
  id: string;
  label: string;
  types: readonly string[];
  tone: StoryTone;
}[] = [
  { id: "voids", label: "Voids", types: ["sale.voided"], tone: "firm" },
  {
    id: "cleared",
    label: "Cleared sales",
    types: ["pos_sale.cleared", "pos_sales.cleared_all"],
    tone: "firm",
  },
  {
    id: "adjusted",
    label: "Payments adjusted",
    types: ["payment.adjusted"],
    tone: "firm",
  },
  { id: "refunds", label: "Refunds", types: ["refund.issued"], tone: "calm" },
  {
    id: "logins",
    label: "Failed sign-ins",
    types: ["login.failed", "account.locked.soft", "account.locked.hard"],
    tone: "alarm",
  },
  {
    id: "credentials",
    label: "Password & PIN changes",
    types: [
      "password.changed",
      "password.reset.used",
      "pin.changed",
      "pin.viewed",
    ],
    tone: "firm",
  },
  {
    id: "drawer",
    label: "Drawer corrections",
    types: ["shift.opening_updated", "variance.approved"],
    tone: "firm",
  },
  {
    id: "drawouts",
    label: "Drawouts",
    types: [
      "drawout.initiated",
      "drawout.approved",
      "drawout.rejected",
      "drawout.voided",
    ],
    tone: "calm",
  },
  {
    id: "prices",
    label: "Price changes",
    types: ["selling_price.changed", "buying_price.changed", "item.cost.adjusted"],
    tone: "calm",
  },
  {
    id: "controls",
    label: "Controls changed",
    types: [
      "settings.cashier_capability_changed",
      "user.role.assigned",
      "role.updated",
      "permission.denied",
    ],
    tone: "alarm",
  },
  {
    id: "support",
    label: "Support sessions",
    types: ["impersonation.started"],
    tone: "firm",
  },
];

/** Low-signal traffic the diary hides until the owner asks for it. */
const ROUTINE_TYPES = new Set<string>([
  "sale.completed",
  "payment.tendered",
  "cash.sale_added",
  "login.succeeded",
  "logout",
  "logout.all",
  "session.token_expired",
  "session.idle_expired",
  "session.revoked",
  "api_key.used",
  "scheduler.started",
  "scheduler.completed",
  "webhook.delivered",
  "item.scanned",
  "pos_draft.created",
  "pos_draft.updated",
  "pos_draft.completed",
  "pos_draft.cancelled",
  "order.created",
  "order.paid",
  "order.confirmed",
  "order.dispatched",
  "order.completed",
  "stk_push.initiated",
  "stk_push.completed",
  "payment.gateway.webhook.received",
  "meta_capi.delivery.sent",
  "meta_capi.delivery.skipped",
  "catalog.resolved",
  "customer.wallet_transaction",
  "customer.loyalty_transaction",
  "customer.credit_transaction",
  "expense_schedules.processed",
  "expense_occurrence.posted",
  "global_product.image_uploaded",
]);

export function isRoutineEvent(e: Pick<AuditEventRecord, "eventType" | "severity">): boolean {
  if (e.severity === "DEBUG") return true;
  return ROUTINE_TYPES.has(e.eventType);
}

export function isNeedsLookEvent(
  e: Pick<AuditEventRecord, "eventType" | "severity">,
): boolean {
  if (NEEDS_LOOK_TYPES.includes(e.eventType)) return true;
  return e.severity === "ERROR" || e.severity === "CRITICAL";
}

type Json = Record<string, unknown>;

export function parseJsonObject(raw: string | null | undefined): Json {
  if (!raw || !raw.trim()) return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
  } catch {
    return {};
  }
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatKes(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** "KES 1,450" without the Intl spacing quirks across engines. */
function kes(n: number | null): string | null {
  if (n == null) return null;
  return formatKes(n);
}

function actorLabel(e: AuditEventRecord): string {
  const name = e.actorName?.trim();
  if (name) {
    if (name === "super_admin") return "Platform support";
    return name;
  }
  switch (e.actorType as AuditEventActorType) {
    case "SYSTEM":
      return "The system";
    case "SCHEDULER":
      return "A scheduled job";
    case "API_KEY":
      return "An API key";
    case "ANONYMOUS":
      return "Someone";
    default:
      return e.terminalId ? `Till ${e.terminalId}` : "Someone";
  }
}

function targetUser(e: AuditEventRecord): string {
  return e.targetName?.trim() || e.targetLabel?.trim() || "a staff account";
}

/** "their own" vs "Otieno's" — self-service vs admin acting on someone. */
function possessive(e: AuditEventRecord): { self: boolean; who: string } {
  const self = !!e.actorId && e.actorId === e.targetId;
  return { self, who: targetUser(e) };
}

function shortId(id: string | null | undefined): string {
  if (!id) return "";
  const t = id.trim();
  return t.length <= 8 ? t.toUpperCase() : t.slice(-8).toUpperCase();
}

function saleRef(e: AuditEventRecord, meta: Json): string {
  const receipt = str(meta.receiptNo);
  if (receipt) return `#${receipt}`;
  const label = e.targetLabel?.trim();
  if (label?.startsWith("Sale #")) return label.slice(5);
  return shortId(e.targetId);
}

function sourceLabel(source: string | null): string | null {
  switch (source) {
    case "dashboard":
      return "from the dashboard";
    case "pos_terminal":
      return "at the till";
    case "mobile":
      return "from the app";
    case "desktop":
      return "on the desktop till";
    case "api":
      return "through the API";
    default:
      return null;
  }
}

function sentence(
  parts: (StoryPart | string | null | undefined | false)[],
): StoryPart[] {
  return parts
    .filter((p): p is StoryPart | string => Boolean(p))
    .map((p) => (typeof p === "string" ? { text: p } : p));
}

const A = (text: string): StoryPart => ({ text, kind: "actor" });
const T = (text: string): StoryPart => ({ text, kind: "target" });
const M = (text: string | null): StoryPart | null =>
  text ? { text, kind: "money" } : null;
const Mu = (text: string | null): StoryPart | null =>
  text ? { text, kind: "muted" } : null;

function sep(): StoryPart {
  return { text: " · ", kind: "muted" };
}

function withDetails(
  head: (StoryPart | string | null | undefined | false)[],
  details: (StoryPart | string | null | undefined | false)[],
): StoryPart[] {
  const out = sentence(head);
  for (const d of details) {
    if (!d) continue;
    out.push(sep());
    out.push(typeof d === "string" ? { text: d } : d);
  }
  return out;
}

function toneFromSeverity(s: AuditEventSeverity): StoryTone {
  if (s === "CRITICAL" || s === "ERROR") return "alarm";
  if (s === "WARN") return "firm";
  return "calm";
}

function humanizeType(eventType: string): string {
  const overrides: Record<string, string> = {
    stk: "STK",
    pos: "POS",
    api: "API",
    pin: "PIN",
    mpesa: "M-Pesa",
    sms: "SMS",
    capi: "CAPI",
  };
  return eventType
    .split(/[._]/)
    .filter(Boolean)
    .map((t, i) => {
      const o = overrides[t.toLowerCase()];
      if (o) return o;
      return i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    })
    .join(" ");
}

function base(
  e: AuditEventRecord,
  group: StoryGroup,
  parts: StoryPart[],
  extra?: Partial<Story>,
): Story {
  return {
    parts,
    tone: toneFromSeverity(e.severity),
    needsLook: isNeedsLookEvent(e),
    routine: isRoutineEvent(e),
    group,
    ...extra,
  };
}

const salesLink = (e: AuditEventRecord, meta: Json) => {
  const receipt = str(meta.receiptNo);
  return {
    href: receipt
      ? `${APP_ROUTES.sales}?q=${encodeURIComponent(receipt)}`
      : APP_ROUTES.sales,
    label: "Open in Sales",
  };
};
const userLink = (e: AuditEventRecord) =>
  e.targetType === "user" && e.targetId
    ? {
        href: `${APP_ROUTES.users}?profile=${encodeURIComponent(e.targetId)}`,
        label: "Open staff profile",
      }
    : undefined;
const shiftLink = () => ({ href: APP_ROUTES.shifts, label: "Open shifts" });
const drawoutLink = (e: AuditEventRecord) =>
  e.targetId
    ? {
        href: `${APP_ROUTES.shifts}?drawout=${encodeURIComponent(e.targetId)}`,
        label: "Open drawout",
      }
    : shiftLink();
const productLink = (e: AuditEventRecord) =>
  e.targetLabel
    ? {
        href: `${APP_ROUTES.products}/catalog?q=${encodeURIComponent(e.targetLabel)}`,
        label: "Open product",
      }
    : undefined;
const customerLink = (e: AuditEventRecord) =>
  e.targetType === "customer" && e.targetId
    ? { href: APP_ROUTES.customer(e.targetId), label: "Open customer" }
    : undefined;

/** Build the diary line for one event. Never throws; unknown types degrade to a humanized label. */
export function storyFor(e: AuditEventRecord): Story {
  const meta = parseJsonObject(e.metadata);
  const before = parseJsonObject(e.oldState);
  const after = parseJsonObject(e.newState);
  const actor = actorLabel(e);
  const reason = e.reason?.trim() || null;
  const src = sourceLabel(e.source);

  switch (e.eventType) {
    // ── Money ────────────────────────────────────────────────────────
    case "sale.voided": {
      const total = num(meta.grandTotal) ?? num(before.grandTotal);
      return base(
        e,
        "money",
        withDetails(
          [A(actor), " voided sale ", T(saleRef(e, meta))],
          [M(kes(total)), reason ? `reason: ${reason}` : Mu("no reason given")],
        ),
        { link: salesLink(e, meta), amount: total, tone: "firm" },
      );
    }
    case "refund.issued": {
      const amount = num(after.amount) ?? num(meta.amount);
      return base(
        e,
        "money",
        withDetails(
          [A(actor), " refunded ", M(kes(amount)) ?? "a sale"],
          [reason],
        ),
        { link: salesLink(e, meta), amount },
      );
    }
    case "payment.adjusted": {
      const from = str(before.paymentMethods);
      const to = str(after.paymentMethods);
      return base(
        e,
        "money",
        withDetails(
          [A(actor), " changed how sale ", T(saleRef(e, meta)), " was paid"],
          [from && to ? `${from} → ${to}` : null, reason],
        ),
        { link: salesLink(e, meta), tone: "firm" },
      );
    }
    case "pos_sale.cleared":
    case "pos_sales.cleared_all": {
      const lines = num(meta.lineCount);
      const value = num(meta.value);
      const all = e.eventType === "pos_sales.cleared_all";
      return base(
        e,
        "money",
        withDetails(
          [
            A(actor),
            all ? " cleared all open sales, dropping " : " cleared a sale with ",
            T(lines == null ? "some lines" : `${lines} line${lines === 1 ? "" : "s"}`),
            " before payment",
          ],
          [M(kes(value)), e.targetLabel, reason && !/^cleared/i.test(reason) ? reason : null],
        ),
        { link: { href: APP_ROUTES.salesPendingCarts, label: "Open unfinished sales" }, amount: value, tone: "firm" },
      );
    }
    case "sale.completed": {
      const total = num(after.grandTotal) ?? num(meta.grandTotal);
      return base(
        e,
        "money",
        withDetails([A(actor), " rang up sale ", T(saleRef(e, meta))], [M(kes(total))]),
        { link: salesLink(e, meta), amount: total },
      );
    }
    case "stk_push.failed":
      return base(
        e,
        "money",
        withDetails([A(actor), " had an M-Pesa STK push fail"], [reason, Mu(e.targetLabel)]),
        { tone: "firm" },
      );
    case "stk_push.completed":
      return base(e, "money", withDetails([A(actor), " took an M-Pesa STK payment"], [M(kes(num(after.amount) ?? num(meta.amount)))]));

    // ── Security ─────────────────────────────────────────────────────
    case "password.changed": {
      const { self, who } = possessive(e);
      return base(
        e,
        "security",
        sentence([
          A(actor),
          self ? " changed their password" : ` changed ${who}'s password`,
          src ? ` ${src}` : null,
        ]),
        { link: userLink(e), tone: "firm" },
      );
    }
    case "password.reset.requested":
      return base(e, "security", sentence([A(actor), " asked for a password reset link"]), { link: userLink(e) });
    case "password.reset.used":
      return base(e, "security", sentence([A(actor), " set a new password from a reset link"]), { link: userLink(e), tone: "firm" });
    case "pin.changed": {
      const { self, who } = possessive(e);
      return base(
        e,
        "security",
        sentence([A(actor), self ? " changed their till PIN" : ` changed ${who}'s till PIN`]),
        { link: userLink(e), tone: "firm" },
      );
    }
    case "pin.viewed":
      return base(
        e,
        "security",
        sentence([A(actor), " viewed ", T(targetUser(e)), "'s till PIN"]),
        { link: userLink(e), tone: "firm" },
      );
    case "login.failed":
      return base(
        e,
        "security",
        withDetails(
          [A(actor), " failed to sign in"],
          [reason, e.terminalId ? `Till ${e.terminalId}` : null, e.ipAddress ? Mu(e.ipAddress) : null],
        ),
        { link: userLink(e), tone: "firm" },
      );
    case "login.succeeded":
      return base(e, "security", withDetails([A(actor), " signed in"], [src ? Mu(src) : null]));
    case "logout":
      return base(e, "security", sentence([A(actor), " signed out"]));
    case "logout.all":
      return base(e, "security", sentence([A(actor), " signed out of every device"]));
    case "account.locked.soft":
      return base(
        e,
        "security",
        withDetails([T(targetUser(e)), "'s account was locked for a while after repeated failed sign-ins"], [reason]),
        { link: userLink(e), tone: "alarm" },
      );
    case "account.locked.hard":
      return base(
        e,
        "security",
        withDetails([T(targetUser(e)), "'s account was locked and needs an admin to unlock it"], [reason]),
        { link: userLink(e), tone: "alarm" },
      );
    case "account.unlocked":
      return base(e, "security", sentence([A(actor), " unlocked ", T(targetUser(e)), "'s account"]), { link: userLink(e) });
    case "user.sessions_revoked":
      return base(e, "security", sentence([A(actor), " signed ", T(targetUser(e)), " out of every device"]), { link: userLink(e), tone: "firm" });
    case "impersonation.started":
      return base(
        e,
        "security",
        sentence([A("Platform support"), " started a support session as ", T(targetUser(e))]),
        { link: userLink(e), tone: "firm" },
      );
    case "session.tenant_mismatch":
      return base(e, "security", withDetails([A(actor), " presented a token for a different shop"], [Mu(e.ipAddress)]), { tone: "alarm" });
    case "session.access_denied":
      return base(e, "security", withDetails([A(actor), " was refused with an old session"], [reason]), { tone: "firm" });
    case "permission.denied":
      return base(e, "security", withDetails([A(actor), " tried something their role does not allow"], [reason, Mu(e.targetLabel)]), { tone: "firm" });
    case "user.role.assigned": {
      const to = str(after.roleName) ?? str(after.roleId);
      const from = str(before.roleName) ?? str(before.roleId);
      return base(
        e,
        "security",
        withDetails([A(actor), " changed ", T(targetUser(e)), "'s role"], [from && to ? `${from} → ${to}` : to]),
        { link: userLink(e), tone: "firm" },
      );
    }
    case "role.created":
      return base(e, "security", sentence([A(actor), " created the role ", T(e.targetLabel ?? "a role")]), { tone: "firm" });
    case "role.updated":
      return base(e, "security", sentence([A(actor), " changed what the role ", T(e.targetLabel ?? ""), " may do"]), { tone: "firm" });
    case "role.deleted":
      return base(e, "security", sentence([A(actor), " deleted the role ", T(e.targetLabel ?? "")]), { tone: "firm" });
    case "api_key.created":
      return base(e, "security", sentence([A(actor), " created an API key ", T(e.targetLabel ?? "")]), { tone: "firm" });
    case "api_key.revoked":
      return base(e, "security", sentence([A(actor), " revoked the API key ", T(e.targetLabel ?? "")]));
    case "api_key.invalid":
      return base(e, "security", withDetails(["Something tried an invalid API key"], [Mu(e.ipAddress)]), { tone: "firm" });
    case "settings.cashier_capability_changed": {
      const on = after.enabled === true;
      const label = str(meta.label) ?? e.targetLabel ?? "a cashier capability";
      return base(
        e,
        "security",
        sentence([A(actor), on ? " turned on " : " turned off ", T(label.replace(/^Allow cashiers to /, "cashiers can "))]),
        { link: { href: APP_ROUTES.businessSettings, label: "Open settings" }, tone: on ? "alarm" : "calm" },
      );
    }

    // ── Cash drawer ──────────────────────────────────────────────────
    case "shift.opened":
      return base(
        e,
        "drawer",
        withDetails([A(actor), " opened a shift"], [kes(num(after.openingCash)) ? `float ${kes(num(after.openingCash))}` : null]),
        { link: shiftLink() },
      );
    case "shift.closed": {
      const variance = num(after.variance);
      const counted = num(after.countedClosingCash);
      const hasVariance = variance != null && Math.abs(variance) >= 1;
      return base(
        e,
        "drawer",
        withDetails(
          [A(actor), " closed a shift"],
          [
            counted != null ? `counted ${kes(counted)}` : null,
            hasVariance
              ? M(`${variance > 0 ? "over" : "short"} by ${kes(Math.abs(variance))}`)
              : Mu("drawer balanced"),
          ],
        ),
        { link: shiftLink(), tone: hasVariance ? "firm" : "calm", needsLook: hasVariance || isNeedsLookEvent(e), amount: variance },
      );
    }
    case "shift.suspended":
      return base(e, "drawer", sentence([A(actor), " paused their shift"]), { link: shiftLink() });
    case "shift.resumed":
      return base(e, "drawer", sentence([A(actor), " resumed their shift"]), { link: shiftLink() });
    case "shift.opening_updated": {
      const from = kes(num(before.openingCash));
      const to = kes(num(after.openingCash));
      return base(
        e,
        "drawer",
        withDetails([A(actor), " corrected the opening float"], [from && to ? `${from} → ${to}` : null, str(after.reason)]),
        { link: shiftLink(), tone: "firm" },
      );
    }
    case "variance.approved":
      return base(e, "drawer", withDetails([A(actor), " approved a drawer variance"], [M(kes(num(after.variance) ?? num(meta.variance))), reason]), { link: shiftLink(), tone: "firm" });
    case "cash.paid_in":
      return base(e, "drawer", withDetails([A(actor), " paid cash into the drawer"], [M(kes(num(after.amount) ?? num(after.cashAmount)))]), { link: shiftLink() });
    case "cash.paid_out":
      return base(e, "drawer", withDetails([A(actor), " paid cash out of the drawer"], [M(kes(num(after.amount) ?? num(after.cashAmount))), reason]), { link: shiftLink(), tone: "firm" });
    case "cash.drop":
      return base(e, "drawer", withDetails([A(actor), " dropped cash to the safe"], [M(kes(num(after.amount) ?? num(after.cashAmount)))]), { link: shiftLink() });
    case "cash.void_removed":
      return base(e, "drawer", withDetails([M(kes(num(after.cashAmount))), " left the drawer for a void"], [Mu(reason)]), { link: shiftLink() });
    case "cash.refund_removed":
      return base(e, "drawer", withDetails([M(kes(num(after.cashAmount))), " left the drawer for a refund"], [Mu(reason)]), { link: shiftLink() });
    case "cash.payment_adjusted":
      return base(e, "drawer", withDetails(["Drawer cash moved by ", M(kes(num(after.cashDelta)))], [Mu(reason)]), { link: shiftLink() });
    case "cash.sale_added":
      return base(e, "drawer", withDetails([M(kes(num(after.cashAmount))), " cash went into the drawer"], []), { link: shiftLink() });
    case "drawout.initiated":
    case "drawout.approved":
    case "drawout.rejected":
    case "drawout.voided":
    case "drawout.expired": {
      const amount = num(after.amount);
      const category = str(after.category);
      const verb =
        e.eventType === "drawout.initiated"
          ? " asked to take "
          : e.eventType === "drawout.approved"
            ? " approved a drawout of "
            : e.eventType === "drawout.rejected"
              ? " rejected a drawout of "
              : e.eventType === "drawout.voided"
                ? " voided a drawout of "
                : " let a drawout request expire: ";
      return base(
        e,
        "drawer",
        withDetails(
          [A(e.eventType === "drawout.expired" ? "The system" : actor), verb, M(kes(amount)) ?? "cash", " from the drawer"],
          [category ? Mu(category) : null, reason],
        ),
        { link: drawoutLink(e), amount, tone: e.eventType === "drawout.initiated" || e.eventType === "drawout.rejected" ? "firm" : "calm" },
      );
    }

    // ── Stock & prices ───────────────────────────────────────────────
    case "selling_price.changed":
    case "buying_price.changed":
    case "item.cost.adjusted": {
      const from = kes(num(before.price) ?? num(before.cost));
      const to = kes(num(after.price) ?? num(after.cost));
      const what =
        e.eventType === "selling_price.changed"
          ? "Shelf price"
          : e.eventType === "buying_price.changed"
            ? "Buying price"
            : "Unit cost";
      return base(
        e,
        "stock",
        withDetails([A(actor), ` changed the ${what.toLowerCase()} of `, T(e.targetLabel ?? "a product")], [from && to ? `${from} → ${to}` : to, reason]),
        { link: productLink(e), tone: "firm" },
      );
    }
    case "tax_rate.changed":
      return base(e, "stock", sentence([A(actor), " changed the tax rate on ", T(e.targetLabel ?? "a product")]), { link: productLink(e) });
    case "stock.adjusted":
      return base(e, "stock", withDetails([A(actor), " adjusted stock of ", T(e.targetLabel ?? "a product")], [str(after.quantity) ? `${str(before.quantity) ?? "?"} → ${str(after.quantity)}` : null, reason]), { link: productLink(e), tone: "firm" });
    case "stock.wasted":
      return base(e, "stock", withDetails([A(actor), " wrote off stock of ", T(e.targetLabel ?? "a product")], [str(after.quantity), reason]), { link: productLink(e), tone: "firm" });
    case "batch.cleared":
      return base(e, "stock", withDetails([A(actor), " cleared a batch of ", T(e.targetLabel ?? "a product")], [reason]), { link: productLink(e), tone: "firm" });
    case "stock.received":
      return base(e, "stock", withDetails([A(actor), " received stock of ", T(e.targetLabel ?? "a product")], [str(after.quantity)]), { link: productLink(e) });
    case "stock.transferred_out":
      return base(e, "stock", sentence([A(actor), " sent stock of ", T(e.targetLabel ?? "a product"), " to another branch"]), { link: productLink(e) });
    case "stock.transferred_in":
      return base(e, "stock", sentence([A(actor), " received a transfer of ", T(e.targetLabel ?? "a product")]), { link: productLink(e) });
    case "stock.transfer_cancelled":
      return base(e, "stock", withDetails([A(actor), " cancelled a stock transfer"], [reason]), { tone: "firm" });
    case "stock_take.opened":
      return base(e, "stock", sentence([A(actor), " started a stock take"]));
    case "stock_take.closed":
      return base(e, "stock", sentence([A(actor), " closed a stock take"]));
    case "stock_count.submitted":
      return base(e, "stock", sentence([A(actor), " submitted a count for ", T(e.targetLabel ?? "a product")]));
    case "stock_count.edited":
      return base(e, "stock", withDetails([A(actor), " edited a submitted count for ", T(e.targetLabel ?? "a product")], [reason]), { tone: "firm" });
    case "item.created":
      return base(e, "stock", sentence([A(actor), " added the product ", T(e.targetLabel ?? "")]), { link: productLink(e) });
    case "item.updated":
      return base(e, "stock", sentence([A(actor), " edited the product ", T(e.targetLabel ?? "")]), { link: productLink(e) });
    case "item.deleted":
      return base(e, "stock", sentence([A(actor), " deleted the product ", T(e.targetLabel ?? "")]), { tone: "firm" });

    // ── Staff ────────────────────────────────────────────────────────
    case "user.created":
      return base(e, "staff", sentence([A(actor), " added ", T(targetUser(e)), " to the team"]), { link: userLink(e) });
    case "user.updated":
      return base(e, "staff", sentence([A(actor), " edited ", T(targetUser(e)), "'s profile"]), { link: userLink(e) });
    case "user.deactivated":
      return base(e, "staff", sentence([A(actor), " deactivated ", T(targetUser(e))]), { link: userLink(e), tone: "firm" });
    case "user.activated":
      return base(e, "staff", sentence([A(actor), " reactivated ", T(targetUser(e))]), { link: userLink(e) });
    case "user.deleted":
      return base(e, "staff", sentence([A(actor), " removed ", T(targetUser(e)), " from the team"]), { tone: "firm" });
    case "user.anonymised":
      return base(e, "staff", sentence([A(actor), " anonymised a former staff account"]));

    // ── Customers ────────────────────────────────────────────────────
    case "customer.credit_limit_changed": {
      const from = kes(num(before.creditLimit));
      const to = kes(num(after.creditLimit));
      return base(e, "customers", withDetails([A(actor), " changed the credit limit for ", T(e.targetLabel ?? "a customer")], [from && to ? `${from} → ${to}` : to]), { link: customerLink(e), tone: "firm" });
    }
    case "customer.credit_suspended":
      return base(e, "customers", withDetails([A(actor), " suspended credit for ", T(e.targetLabel ?? "a customer")], [reason]), { link: customerLink(e), tone: "firm" });
    case "customer.merged":
      return base(e, "customers", sentence([A(actor), " merged two customer records into ", T(e.targetLabel ?? "one")]), { link: customerLink(e), tone: "firm" });
    case "customer.created":
      return base(e, "customers", sentence([A(actor), " added the customer ", T(e.targetLabel ?? "")]), { link: customerLink(e) });
    case "customer.updated":
      return base(e, "customers", sentence([A(actor), " edited the customer ", T(e.targetLabel ?? "")]), { link: customerLink(e) });
    case "customer.deleted":
      return base(e, "customers", sentence([A(actor), " deleted the customer ", T(e.targetLabel ?? "")]), { tone: "firm" });

    // ── Orders ───────────────────────────────────────────────────────
    case "order.cancelled":
      return base(e, "orders", withDetails([A(actor), " cancelled online order ", T(e.targetLabel ?? shortId(e.targetId))], [reason]), { link: { href: APP_ROUTES.storefrontWebOrders, label: "Open web orders" }, tone: "firm" });
    case "order.returned":
      return base(e, "orders", withDetails([A(actor), " took a return on online order ", T(e.targetLabel ?? shortId(e.targetId))], [reason]), { link: { href: APP_ROUTES.storefrontWebOrders, label: "Open web orders" }, tone: "firm" });
    case "order.payment_failed":
      return base(e, "orders", withDetails(["Payment failed on online order ", T(e.targetLabel ?? shortId(e.targetId))], [reason]), { link: { href: APP_ROUTES.storefrontWebOrders, label: "Open web orders" }, tone: "firm" });
    case "order.created":
    case "order.paid":
    case "order.confirmed":
    case "order.dispatched":
    case "order.completed": {
      const verb = e.eventType.split(".")[1];
      const phrase =
        verb === "created" ? " placed online order " : verb === "paid" ? " paid online order " : verb === "confirmed" ? " confirmed online order " : verb === "dispatched" ? " dispatched online order " : " completed online order ";
      return base(e, "orders", sentence([A(actor), phrase, T(e.targetLabel ?? shortId(e.targetId))]), { link: { href: APP_ROUTES.storefrontWebOrders, label: "Open web orders" } });
    }

    // ── Finance ──────────────────────────────────────────────────────
    case "expense.approved":
      return base(e, "money", withDetails([A(actor), " approved the expense ", T(e.targetLabel ?? "")], [M(kes(num(after.amount)))]), { tone: "calm" });
    case "expense.rejected":
      return base(e, "money", withDetails([A(actor), " rejected the expense ", T(e.targetLabel ?? "")], [reason]), { tone: "firm" });
    case "expense.deleted":
      return base(e, "money", sentence([A(actor), " deleted the expense ", T(e.targetLabel ?? "")]), { tone: "firm" });

    default: {
      const label = humanizeType(e.eventType);
      const target = e.targetName?.trim() || e.targetLabel?.trim() || null;
      return base(
        e,
        e.category === "SECURITY" || e.category === "STAFF"
          ? "security"
          : e.category === "CASH_DRAWER"
            ? "drawer"
            : e.category === "INVENTORY" || e.category === "PRODUCTS"
              ? "stock"
              : e.category === "ORDERS"
                ? "orders"
                : e.category === "CUSTOMERS"
                  ? "customers"
                  : e.category === "SALES" || e.category === "FINANCE"
                    ? "money"
                    : "system",
        withDetails([A(actor), ": ", label], [target ? T(target) : null, reason]),
      );
    }
  }
}

/** Plain-text rendering for CSV export, tooltips and tests. */
export function storyText(story: Story): string {
  return story.parts.map((p) => p.text).join("");
}

// ── Time-of-day grouping ─────────────────────────────────────────────

export type DiaryDaypart = "Morning" | "Afternoon" | "Evening" | "Overnight";

export function daypartFor(d: Date): DiaryDaypart {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Overnight";
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today", "Yesterday", or "Mon 9 Nov" in the viewer's clock (Africa/Nairobi for the shop). */
export function dayLabelFor(d: Date, now: Date = new Date()): string {
  if (sameLocalDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type DiaryGroupKey = {
  key: string;
  day: string;
  daypart: DiaryDaypart;
};

export function groupKeyFor(iso: string, now: Date = new Date()): DiaryGroupKey {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { key: "unknown", day: "Unknown time", daypart: "Overnight" };
  }
  const day = dayLabelFor(d, now);
  const daypart = daypartFor(d);
  return {
    key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${daypart}`,
    day,
    daypart,
  };
}

/** "14:08" for today, "Yesterday 14:08" otherwise — the feed already shows the day heading. */
export function clockFor(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

// ── Streaks ──────────────────────────────────────────────────────────

export type DiaryStreak = {
  actorId: string;
  actorLabel: string;
  eventType: string;
  count: number;
  minutes: number;
  firstAt: string;
  lastAt: string;
};

const STREAK_TYPES = new Set([
  "sale.voided",
  "pos_sale.cleared",
  "pos_sales.cleared_all",
  "payment.adjusted",
  "login.failed",
]);

/**
 * "Same cashier voided 4 sales in 20 minutes." Pure client-side: looks at the
 * rows on screen, so it is a hint, not a report. Threshold: 3 in 20 minutes.
 */
export function findStreaks(
  rows: AuditEventRecord[],
  opts: { min?: number; windowMinutes?: number } = {},
): DiaryStreak[] {
  const min = opts.min ?? 3;
  const windowMs = (opts.windowMinutes ?? 20) * 60_000;
  const byKey = new Map<string, AuditEventRecord[]>();
  for (const r of rows) {
    if (!STREAK_TYPES.has(r.eventType)) continue;
    const who = r.actorId ?? r.actorName ?? r.terminalId ?? "unknown";
    const type = r.eventType.startsWith("pos_sale") ? "pos_sale.cleared" : r.eventType;
    const key = `${who}|${type}`;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  const out: DiaryStreak[] = [];
  for (const list of byKey.values()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let best: { start: number; end: number } | null = null;
    let i = 0;
    for (let j = 0; j < sorted.length; j++) {
      const tj = new Date(sorted[j]!.createdAt).getTime();
      while (new Date(sorted[i]!.createdAt).getTime() < tj - windowMs) i++;
      const span = j - i + 1;
      if (span >= min && (!best || span > best.end - best.start + 1)) {
        best = { start: i, end: j };
      }
    }
    if (best) {
      const first = sorted[best.start]!;
      const last = sorted[best.end]!;
      out.push({
        actorId: first.actorId ?? "",
        actorLabel: actorLabel(first),
        eventType: first.eventType.startsWith("pos_sale") ? "pos_sale.cleared" : first.eventType,
        count: best.end - best.start + 1,
        minutes: Math.max(
          1,
          Math.round(
            (new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / 60_000,
          ),
        ),
        firstAt: first.createdAt,
        lastAt: last.createdAt,
      });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

export function streakSentence(s: DiaryStreak): string {
  const what =
    s.eventType === "sale.voided"
      ? `voided ${s.count} sales`
      : s.eventType === "pos_sale.cleared"
        ? `cleared ${s.count} sales before payment`
        : s.eventType === "payment.adjusted"
          ? `changed how ${s.count} sales were paid`
          : `failed to sign in ${s.count} times`;
  return `${s.actorLabel} ${what} in ${s.minutes} minute${s.minutes === 1 ? "" : "s"}`;
}

// ── "Ask the diary" ──────────────────────────────────────────────────

export type DiaryQuery = {
  /** Event types the words map to; empty means no type constraint. */
  eventTypes: string[];
  /** Leftover words matched against actor, target and the sentence. */
  text: string[];
  /** A period the words named, if any. */
  period: "today" | "yesterday" | "7d" | "30d" | null;
  /** "till 2" → terminal id fragment. */
  terminal: string | null;
};

const QUERY_WORDS: [RegExp, string[]][] = [
  [/^voids?$|^voided$/, ["sale.voided"]],
  [/^cleared?$|^clears?$|^abandon(ed)?$/, ["pos_sale.cleared", "pos_sales.cleared_all"]],
  [/^refunds?$|^refunded$/, ["refund.issued"]],
  [/^adjust(ed|ment|ments)?$|^tender$/, ["payment.adjusted"]],
  [/^passwords?$/, ["password.changed", "password.reset.requested", "password.reset.used"]],
  [/^pins?$/, ["pin.changed", "pin.viewed"]],
  [/^login(s)?$|^sign-?ins?$|^lock(ed|s)?$|^lockouts?$/, ["login.failed", "account.locked.soft", "account.locked.hard", "account.unlocked"]],
  [/^m-?pesa$|^stk$/, ["stk_push.failed", "stk_push.completed", "stk_push.initiated"]],
  [/^fails?$|^failed$|^failures?$/, ["login.failed", "stk_push.failed", "order.payment_failed", "webhook.failed"]],
  [/^drawouts?$/, ["drawout.initiated", "drawout.approved", "drawout.rejected", "drawout.voided", "drawout.expired"]],
  [/^shifts?$|^floats?$|^variances?$|^drawer$/, ["shift.opened", "shift.closed", "shift.opening_updated", "variance.approved"]],
  [/^prices?$|^pricing$/, ["selling_price.changed", "buying_price.changed", "item.cost.adjusted"]],
  [/^stock$|^waste(d)?$|^wastage$/, ["stock.adjusted", "stock.wasted", "batch.cleared", "stock.received"]],
  [/^roles?$|^permissions?$/, ["user.role.assigned", "role.created", "role.updated", "role.deleted", "permission.denied"]],
  [/^support$|^impersonat(e|ed|ion)$/, ["impersonation.started"]],
  [/^settings?$|^controls?$|^capabilit(y|ies)$/, ["settings.cashier_capability_changed"]],
];

const STOP = new Set(["on", "at", "by", "the", "a", "an", "in", "for", "of", "and", "who", "did", "what", "show", "me", "sales", "sale"]);

export function parseDiaryQuery(raw: string): DiaryQuery {
  const words = raw
    .toLowerCase()
    .replace(/[?.,!]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: DiaryQuery = { eventTypes: [], text: [], period: null, terminal: null };
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (w === "today") {
      out.period = "today";
      continue;
    }
    if (w === "yesterday") {
      out.period = "yesterday";
      continue;
    }
    if ((w === "this" || w === "last") && words[i + 1] === "week") {
      out.period = "7d";
      i++;
      continue;
    }
    if ((w === "this" || w === "last") && words[i + 1] === "month") {
      out.period = "30d";
      i++;
      continue;
    }
    if (w === "till" && words[i + 1] && /^[a-z0-9-]+$/.test(words[i + 1]!)) {
      out.terminal = words[i + 1]!;
      i++;
      continue;
    }
    const hit = QUERY_WORDS.find(([re]) => re.test(w));
    if (hit) {
      for (const t of hit[1]) if (!out.eventTypes.includes(t)) out.eventTypes.push(t);
      continue;
    }
    if (STOP.has(w)) continue;
    out.text.push(w);
  }
  return out;
}

/** Client-side match for the leftover words against the row and its sentence. */
export function rowMatchesText(e: AuditEventRecord, story: Story, words: string[]): boolean {
  if (words.length === 0) return true;
  const hay = [
    storyText(story),
    e.actorName,
    e.targetLabel,
    e.targetName,
    e.reason,
    e.terminalId,
    e.eventType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}

// ── CSV ──────────────────────────────────────────────────────────────

const CSV_HEADER = [
  "when",
  "branch",
  "category",
  "event_type",
  "severity",
  "actor",
  "actor_type",
  "target_type",
  "target",
  "amount_kes",
  "reason",
  "terminal",
  "shift_id",
  "ip_address",
  "source",
  "correlation_id",
  "summary",
  "before",
  "after",
  "metadata",
];

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Boring and complete: one row per event, JSON columns last. */
export function diaryCsv(
  rows: AuditEventRecord[],
  branchNames: Record<string, string> = {},
): string {
  const lines = [CSV_HEADER.join(",")];
  for (const e of rows) {
    const story = storyFor(e);
    lines.push(
      [
        e.createdAt,
        e.branchId ? (branchNames[e.branchId] ?? e.branchId) : "",
        e.category,
        e.eventType,
        e.severity,
        e.actorName ?? e.actorId ?? "",
        e.actorType,
        e.targetType ?? "",
        e.targetName ?? e.targetLabel ?? e.targetId ?? "",
        story.amount ?? "",
        e.reason ?? "",
        e.terminalId ?? "",
        e.shiftId ?? "",
        e.ipAddress ?? "",
        e.source ?? "",
        e.correlationId ?? "",
        storyText(story),
        e.oldState ?? "",
        e.newState ?? "",
        e.metadata ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ── Pulse sentence ───────────────────────────────────────────────────

/** "12 things needed your eye today" — the one human line at the top. */
export function pulseSentence(
  needsLook: number,
  periodWord: string,
): string {
  if (needsLook === 0) return `Nothing needed your eye ${periodWord}.`;
  if (needsLook === 1) return `One thing needed your eye ${periodWord}.`;
  return `${needsLook.toLocaleString("en-KE")} things needed your eye ${periodWord}.`;
}

export function compareLine(
  label: string,
  now: number,
  before: number,
): string | null {
  if (now === 0 && before === 0) return null;
  if (now > before) return `${label} are up on the same period last week (${before} → ${now}).`;
  if (now < before) return `${label} are down on the same period last week (${before} → ${now}).`;
  return `${label} match the same period last week (${now}).`;
}

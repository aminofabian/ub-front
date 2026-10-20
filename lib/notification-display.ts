type NotificationPayload = Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  "payable.overdue": "Overdue supplier payments",
  "receivable.overdue": "Overdue customer payments",
  "shift.variance_detected": "Shift cash variance detected",
  "stock.low": "Low stock alert",
  "batch.expiring": "Expiring stock alert",
  "storefront.order.placed": "New web order",
  "storefront.order.paid": "Web order paid",
  "till.slip": "Print on this till",
  "order.received": "Order received",
  "order.payment_received": "Payment received",
  "order.confirmed": "Order confirmed",
  "order.dispatched": "Ready for pickup",
  "order.delivered": "Order complete",
  "credit_sale.reminder": "Credit purchase",
  "approval.requested": "Approval requested",
  "approval.resolved": "Approval resolved",
  "export.completed": "Export ready",
  "sales.daily_digest": "Daily sales summary",
  "inventory.restock_digest": "Tonight's list",
  "catalog.back_in_stock": "Back in stock",
  "promo.price_drop": "Price drop",
  "promo.flash_sale": "Flash sale",
  "promo.weekly_deals": "Weekly deals",
  "engagement.win_back": "We miss you",
  "insights.abandoned_cart": "Abandoned carts",
  "insights.peak_hours": "Peak sales window",
  "insights.top_products": "Top products",
  "account.welcome": "Welcome to Kiosk!",
  "onboarding.fill_shelf": "Fill your shelf in 10 minutes",
  "onboarding.sizes_right": "Sizes done right",
  "onboarding.money_loop": "Suppliers → supply → first sale",
  "onboarding.first_sale": "First sale",
  "onboarding.go_live": "Put your shop online",
  "onboarding.team_rhythm": "Team + rhythm",
  "onboarding.week_checkin": "Your week 1",
  "onboarding.reengage": "10 minutes gets you selling",
  "onboarding.lookalike": "Sizes done right?",
  "onboarding.close_shift": "Remember to close tonight",
  "onboarding.web_order": "Someone ordered online!",
  "drawout.approval_requested": "Cash drawout needs approval",
  "drawout.recorded": "Cash drawout recorded",
  "till.access_requested": "Till waiting to be trusted",
  "profit_pocket.friday_reminder": "Friday Pocket",
};

function readString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function humanizeType(type: string): string {
  return type
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseJsonObject(raw: unknown): NotificationPayload | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as NotificationPayload;
  }
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as NotificationPayload;
    }
  } catch {
    return null;
  }
  return null;
}

function resolvePayload(data: NotificationPayload): NotificationPayload | null {
  const nested = parseJsonObject(data.payload);
  if (nested) {
    return nested;
  }
  return parseJsonObject(data.payloadJson);
}

/** Fallback destinations when payload omits actionUrl (or welcome still points at hub). */
function defaultActionUrl(notificationType: string): string {
  switch (notificationType) {
    case "account.welcome":
      return "kiosk:support-chat";
    case "onboarding.fill_shelf":
      return "/products/catalog";
    case "onboarding.sizes_right":
    case "onboarding.lookalike":
      return "/products";
    case "onboarding.money_loop":
      return "/suppliers";
    case "onboarding.first_sale":
      return "/cashier";
    case "onboarding.go_live":
      return "/business/settings";
    case "onboarding.team_rhythm":
      return "/business/team";
    case "onboarding.week_checkin":
    case "onboarding.reengage":
      return "/business";
    case "onboarding.close_shift":
      return "/shifts";
    case "drawout.approval_requested":
    case "drawout.recorded":
      // Prefer id-bearing URL from payload when present (see resolveActionUrl).
      return "/shifts";
    case "till.access_requested":
      return "/tills/review";
    case "profit_pocket.friday_reminder":
      return "/business?pocket=1";
    case "onboarding.web_order":
      return "/storefront/web-orders";
    default:
      return "";
  }
}

function resolveActionUrl(
  notificationType: string,
  data: NotificationPayload,
  payload: NotificationPayload | null,
): string {
  let raw =
    readString(data.actionUrl) ||
    readString(payload?.actionUrl) ||
    readString(data.action_url) ||
    readString(payload?.action_url) ||
    defaultActionUrl(notificationType);

  // Ensure drawout alerts deep-link to the matching entry on the shifts board.
  if (
    (notificationType === "drawout.approval_requested" ||
      notificationType === "drawout.recorded") &&
    !/[?&]drawout=/.test(raw)
  ) {
    const drawoutId =
      readString(payload?.drawoutId) ||
      readString(data.drawoutId) ||
      readString(payload?.id);
    if (drawoutId) {
      raw = `/shifts?drawout=${encodeURIComponent(drawoutId)}`;
    } else if (!raw) {
      raw = "/shifts";
    }
  }

  // Legacy welcome payloads used /business or /support — open the chat drawer instead.
  if (
    notificationType === "account.welcome" &&
    (raw === "" ||
      raw === "/business" ||
      raw === "/" ||
      raw === "/support" ||
      raw.startsWith("/support?"))
  ) {
    return "kiosk:support-chat";
  }
  return raw;
}

function normalizeMoneyInput(value: string): string {
  const raw = value.trim();
  // Treat a single comma followed by two digits as a decimal separator
  // ("5,00" from a localised producer); otherwise drop thousands separators.
  if (/^\d{1,3},\d{2}$/.test(raw)) {
    return raw.replace(",", ".");
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
    return raw.replace(/,/g, "");
  }
  return raw;
}

function formatMoney(value: string, currency = "KES"): string {
  const amount = Number(normalizeMoneyInput(value));
  if (!Number.isFinite(amount)) {
    return value;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return value;
  }
}

function orderReference(payload: NotificationPayload): string {
  const code =
    readString(payload.orderCode) ||
    readString(payload.order_code) ||
    readString(payload.code) ||
    readString(payload.reference);
  if (code) {
    return `#${code.replace(/^#/, "")}`;
  }
  const id = readString(payload.orderId) || readString(payload.order_id);
  if (!id) {
    return "";
  }
  const compact = id.replace(/-/g, "");
  return compact ? `#${compact.slice(0, 8).toUpperCase()}` : "";
}

/** Collapse authored/legacy email copy into a notification-sized preview. */
function cleanNotificationBody(raw: string): string {
  let text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[`*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  text = text.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (id) => `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
  );
  if (text.length > 180) {
    const cut = text.slice(0, 177);
    const lastSpace = cut.lastIndexOf(" ");
    text = `${cut.slice(0, lastSpace > 120 ? lastSpace : 177).trimEnd()}…`;
  }
  return text;
}

function welcomePreview(payload: NotificationPayload | null): string {
  const business = readString(payload?.businessName);
  const phone = readString(payload?.supportPhone);
  const email = readString(payload?.supportEmail);
  const who = business || "Your shop";
  const contact = phone
    ? `call ${phone}`
    : email
      ? `email ${email}`
      : "reply in Support";
  return `${who} is ready. Setup, M-Pesa, storefront, and custom help are free — ${contact}.`;
}

function formatPayloadBody(
  type: string,
  payload: NotificationPayload | null,
): string {
  if (!payload) {
    return "";
  }

  switch (type) {
    case "storefront.order.placed": {
      const customerName = readString(payload.customerName);
      const total = readString(payload.total);
      const parts: string[] = [];
      if (customerName) {
        parts.push(customerName);
      }
      if (total) {
        parts.push(formatMoney(total));
      }
      const reference = orderReference(payload);
      if (reference) {
        parts.push(reference);
      }
      return parts.join(" · ");
    }
    case "order.received":
    case "order.payment_received":
    case "storefront.order.paid": {
      const customerName = readString(payload.customerName);
      const total = readString(payload.total);
      const currency = readString(payload.currency);
      const parts: string[] = [];
      if (customerName) {
        parts.push(customerName);
      }
      if (total) {
        parts.push(
          currency ? `${formatMoney(total, currency)}` : total,
        );
      }
      const reference = orderReference(payload);
      if (reference) {
        parts.push(reference);
      }
      return parts.join(" · ");
    }
    case "export.completed": {
      const exportId = readString(payload.exportId);
      const format = readString(payload.format);
      const parts: string[] = [];
      if (format) {
        parts.push(format.toUpperCase());
      }
      if (exportId) {
        parts.push(`Export ${exportId}`);
      }
      return parts.join(" · ");
    }
    case "stock.low": {
      const itemCount = readString(payload.itemCount);
      const itemNames = readString(payload.itemNames);
      const parts: string[] = [];
      if (itemCount) {
        parts.push(`${itemCount} item(s)`);
      }
      if (itemNames) {
        parts.push(itemNames);
      }
      const itemName = readString(payload.itemName);
      const qty = readString(payload.qtyOnHand ?? payload.quantity ?? payload.currentStock);
      if (parts.length === 0 && itemName) {
        parts.push(itemName);
      }
      if (parts.length === 0 && qty) {
        parts.push(`${qty} on hand`);
      }
      return parts.join(" · ");
    }
    case "batch.expiring": {
      const itemName = readString(payload.itemName);
      const qty = readString(payload.qtyOnHand ?? payload.quantity);
      const parts: string[] = [];
      if (itemName) {
        parts.push(itemName);
      }
      if (qty) {
        parts.push(`${qty} on hand`);
      }
      return parts.join(" · ");
    }
    case "sales.daily_digest": {
      const day = readString(payload.businessDay);
      const revenue = readString(payload.revenue);
      const currency = readString(payload.currency);
      const parts: string[] = [];
      if (day) {
        parts.push(day);
      }
      if (revenue) {
        parts.push(currency ? formatMoney(revenue, currency) : revenue);
      }
      return parts.join(" · ");
    }
    case "inventory.restock_digest": {
      const lineCount = readString(payload.lineCount);
      const estTotal = readString(payload.estTotal);
      const currency = readString(payload.currency);
      const supplierCount = readString(payload.supplierCount);
      const parts: string[] = [];
      if (lineCount) {
        parts.push(`${lineCount} items`);
      }
      if (estTotal) {
        parts.push(currency ? formatMoney(estTotal, currency) : estTotal);
      }
      if (supplierCount) {
        parts.push(`${supplierCount} suppliers`);
      }
      return parts.join(" · ");
    }
    case "till.access_requested": {
      const cashierName = readString(payload.cashierName);
      const branchName = readString(payload.branchName);
      return [cashierName, branchName].filter(Boolean).join(" · ");
    }
    case "profit_pocket.friday_reminder": {
      const body = readString(payload.body);
      if (body) return body;
      const suggested = readString(payload.suggestedPocket);
      const dest = readString(payload.destinationSummary);
      if (suggested) {
        return dest
          ? `Pocket KES ${suggested} → ${dest}`
          : `Pocket KES ${suggested} before the weekend`;
      }
      return "";
    }
    case "drawout.approval_requested":
    case "drawout.recorded": {
      const initiatedByName = readString(payload.initiatedByName);
      const amount = readString(payload.amount);
      const currency = readString(payload.currency) || "KES";
      const category = readString(payload.category);
      const recipientName = readString(payload.recipientName);
      const money = amount ? formatMoney(amount, currency) : "";
      const cat = category ? ` (${category})` : "";
      const forWhom =
        recipientName && recipientName !== "—" ? ` for ${recipientName}` : "";
      if (initiatedByName && money) {
        return `${initiatedByName} took ${money}${cat}${forWhom}`;
      }
      return [initiatedByName, money ? `${money}${cat}` : "", forWhom.trim()]
        .filter(Boolean)
        .join(" · ");
    }
    default: {
      const ignored = new Set([
        "id",
        "notificationType",
        "createdAt",
        "title",
        "body",
        "actionUrl",
        "payload",
        "payloadJson",
        "readAt",
        "type",
      ]);
      const parts = Object.entries(payload)
        .filter(([key, value]) => !ignored.has(key) && value != null)
        .slice(0, 3)
        .map(([key, value]) => {
          const label = humanizeType(key);
          if (typeof value === "string" || typeof value === "number") {
            return `${label}: ${String(value)}`;
          }
          return label;
        });
      return parts.join(" · ");
    }
  }
}

const STRUCTURED_NOTIFICATION_TYPES = new Set([
  "storefront.order.placed",
  "storefront.order.paid",
  "order.received",
  "order.payment_received",
  "order.confirmed",
  "order.dispatched",
  "order.delivered",
  "stock.low",
  "batch.expiring",
  "sales.daily_digest",
  "inventory.restock_digest",
  "export.completed",
  "till.access_requested",
  "profit_pocket.friday_reminder",
  "drawout.approval_requested",
  "drawout.recorded",
]);

/** Same-origin absolute URLs from email/SMS payloads become in-app paths. */
export function toClientNavigationHref(actionUrl: string): string {
  const raw = actionUrl.trim();
  if (!raw || raw.startsWith("/") || raw.startsWith("kiosk:")) {
    return raw;
  }
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(raw, origin);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export function getNotificationPresentation(data: NotificationPayload): {
  title: string;
  body: string;
  actionUrl: string;
} {
  const notificationType =
    readString(data.notificationType) || readString(data.type);
  const payload = resolvePayload(data);
  const title =
    readString(data.title) ||
    readString(payload?.title) ||
    (notificationType
      ? TYPE_LABELS[notificationType] ?? humanizeType(notificationType)
      : "Notification");
  const structured = STRUCTURED_NOTIFICATION_TYPES.has(notificationType)
    ? formatPayloadBody(notificationType, payload)
    : "";
  const authored =
    readString(data.body) || readString(payload?.body) || "";
  const body =
    notificationType === "account.welcome"
      ? cleanNotificationBody(welcomePreview(payload))
      : cleanNotificationBody(structured || authored);
  const actionUrl = resolveActionUrl(notificationType, data, payload);

  return { title, body, actionUrl };
}

export function normalizeNotificationData(
  raw: NotificationPayload,
): NotificationPayload {
  const presentation = getNotificationPresentation(raw);
  const notificationType =
    readString(raw.notificationType) || readString(raw.type);
  const payload = resolvePayload(raw);

  return {
    ...raw,
    id: readString(raw.id) || readString(raw.eventId),
    notificationType,
    title: presentation.title,
    body: presentation.body,
    actionUrl: presentation.actionUrl,
    payload,
  };
}

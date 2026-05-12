type NotificationPayload = Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  "payable.overdue": "Overdue supplier payments",
  "receivable.overdue": "Overdue customer payments",
  "shift.variance_detected": "Shift cash variance detected",
  "stock.low": "Low stock alert",
  "batch.expiring": "Expiring stock alert",
  "storefront.order.placed": "New web order",
  "approval.requested": "Approval requested",
  "approval.resolved": "Approval resolved",
  "export.completed": "Export ready",
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

function formatMoney(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return value;
  }
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
      const orderId = readString(payload.orderId);
      const parts: string[] = [];
      if (customerName) {
        parts.push(customerName);
      }
      if (total) {
        parts.push(formatMoney(total));
      }
      if (orderId) {
        parts.push(`Order ${orderId}`);
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
    case "stock.low":
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
    (notificationType
      ? TYPE_LABELS[notificationType] ?? humanizeType(notificationType)
      : "Notification");
  const body =
    readString(data.body) || formatPayloadBody(notificationType, payload);
  const actionUrl = readString(data.actionUrl);

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

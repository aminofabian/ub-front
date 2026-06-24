import type { NotificationCampaign } from "@/lib/api";

export type PromoStatusTab = "all" | "active" | "scheduled" | "drafts" | "past";

export type PromoSortKey = "newest" | "oldest" | "name" | "reach";

export function campaignTypeLabel(type: string): string {
  if (type === "WEEKLY_DEALS") return "Weekly deals";
  if (type === "FLASH_SALE") return "Flash sale";
  return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function campaignStatusMeta(status: string): {
  label: string;
  tab: PromoStatusTab;
  badge: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
} {
  switch (status) {
    case "RUNNING":
      return { label: "Sending", tab: "active", badge: "warning" };
    case "SCHEDULED":
      return { label: "Scheduled", tab: "scheduled", badge: "default" };
    case "DRAFT":
      return { label: "Draft", tab: "drafts", badge: "secondary" };
    case "COMPLETED":
      return { label: "Completed", tab: "past", badge: "success" };
    case "CANCELLED":
      return { label: "Cancelled", tab: "past", badge: "destructive" };
    default:
      return { label: status, tab: "all", badge: "outline" };
  }
}

export function matchesStatusTab(row: NotificationCampaign, tab: PromoStatusTab): boolean {
  if (tab === "all") return true;
  const { tab: rowTab } = campaignStatusMeta(row.status);
  if (tab === "active") return row.status === "RUNNING";
  if (tab === "scheduled") return row.status === "SCHEDULED";
  if (tab === "drafts") return row.status === "DRAFT";
  if (tab === "past") return row.status === "COMPLETED" || row.status === "CANCELLED";
  return rowTab === tab;
}

export function deliveryRate(row: NotificationCampaign): number | null {
  if (row.recipientsTargeted <= 0) return null;
  return Math.round((row.recipientsSent / row.recipientsTargeted) * 100);
}

export function campaignWhenLabel(row: NotificationCampaign): string {
  if (row.status === "SCHEDULED" && row.scheduledAt) {
    return `Sends ${formatWhen(row.scheduledAt)}`;
  }
  if (row.startedAt) {
    return `Sent ${formatWhen(row.startedAt)}`;
  }
  if (row.scheduledAt) {
    return formatWhen(row.scheduledAt);
  }
  if (row.createdAt) {
    return `Created ${formatWhen(row.createdAt)}`;
  }
  return "Not scheduled";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortCampaigns(
  rows: NotificationCampaign[],
  sort: PromoSortKey,
): NotificationCampaign[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "reach":
        return b.recipientsTargeted - a.recipientsTargeted;
      case "oldest": {
        const ta = new Date(a.createdAt ?? a.scheduledAt ?? 0).getTime();
        const tb = new Date(b.createdAt ?? b.scheduledAt ?? 0).getTime();
        return ta - tb;
      }
      case "newest":
      default: {
        const ta = new Date(a.createdAt ?? a.scheduledAt ?? 0).getTime();
        const tb = new Date(b.createdAt ?? b.scheduledAt ?? 0).getTime();
        return tb - ta;
      }
    }
  });
  return copy;
}

export function aggregatePromoStats(rows: NotificationCampaign[]) {
  const drafts = rows.filter((r) => r.status === "DRAFT").length;
  const scheduled = rows.filter((r) => r.status === "SCHEDULED").length;
  const active = rows.filter((r) => r.status === "RUNNING").length;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  const totalReach = rows.reduce((sum, r) => sum + r.recipientsSent, 0);
  const totalTargeted = rows.reduce((sum, r) => sum + r.recipientsTargeted, 0);
  return { drafts, scheduled, active, completed, totalReach, totalTargeted };
}

/** Sales channel for POS vs storefront. */
export type SaleChannel = "walk_in" | "online_store";

export type ChannelFilter = "all" | SaleChannel;

export const CHANNEL_FILTER_OPTIONS: {
  id: ChannelFilter;
  label: string;
  short: string;
}[] = [
  { id: "all", label: "All channels", short: "All" },
  { id: "walk_in", label: "Walk-in (POS)", short: "Walk-in" },
  { id: "online_store", label: "Online store", short: "Online" },
];

export function normalizeSaleChannel(
  channel: string | null | undefined,
): SaleChannel {
  return channel === "online_store" ? "online_store" : "walk_in";
}

export function matchesChannelFilter(
  filter: ChannelFilter,
  channel: string | null | undefined,
): boolean {
  if (filter === "all") return true;
  return normalizeSaleChannel(channel) === filter;
}

export function formatChannelLabel(channel: string | null | undefined): string {
  return normalizeSaleChannel(channel) === "online_store"
    ? "Online store"
    : "Walk-in";
}

/** Web orders use pending_payment; treat as visible for “completed” POS filter. */
export function matchesStatusWithChannel(
  statusFilter: "all" | "completed" | "refunded",
  status: string | undefined,
  channel: string | null | undefined,
): boolean {
  const refunded = (status?.toLowerCase() ?? "").includes("refund");
  const isOnline = normalizeSaleChannel(channel) === "online_store";

  if (statusFilter === "all") return true;
  if (statusFilter === "refunded") return refunded;
  if (statusFilter === "completed") {
    if (isOnline) return !refunded;
    return !refunded;
  }
  return true;
}

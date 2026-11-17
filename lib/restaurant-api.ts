"use client";

import { apiRequest, apiUploadFile } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

/**
 * Client for the restaurant endpoints: the menu, the kitchen board, the counter's list of
 * orders and the menu reports. Shapes mirror `docs/openapi/phase-1.yaml`.
 */

export type MenuItemKind = "DISH" | "ITEM";

export type KitchenStationRecord = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  /** The station's own printer: a CUPS/printer name, or a network printer's host and port. All null means none. */
  printerName?: string | null;
  printerHost?: string | null;
  printerPort?: number | null;
};

/** A station's printer: a CUPS/printer name, or a network printer's host and port, not both; clear removes it. */
export type StationPrinterPayload = {
  printerName?: string;
  printerHost?: string;
  printerPort?: number;
  clearPrinter?: boolean;
};

export type MenuCategoryRecord = {
  id: string;
  name: string;
  stationId: string | null;
  sortOrder: number;
  active: boolean;
  /** A named-menu serving window (Breakfast, Lunch), minutes after midnight Nairobi; null means all day. */
  serveFromMinute?: number | null;
  serveToMinute?: number | null;
};

export type ModifierOptionRecord = {
  id: string;
  name: string;
  priceDelta: number;
  /** Chosen for the customer unless they say otherwise. */
  preselected: boolean;
  available: boolean;
  sortOrder: number;
};

export type ModifierGroupRecord = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: ModifierOptionRecord[];
};

export type MenuItemRecord = {
  id: string;
  categoryId: string | null;
  name: string;
  kind: MenuItemKind;
  /** The product sold, when `kind` is `ITEM`. */
  itemId: string | null;
  /** A dish's price before modifiers; a product's shelf price at the branch asked for (null without a branch). */
  price: number | null;
  taxRateId: string | null;
  stationId: string | null;
  /** False while the kitchen has run out. */
  available: boolean;
  active: boolean;
  /** False when the product behind a menu item was removed or can no longer be sold. */
  sellable: boolean;
  sortOrder: number;
  modifierGroupIds: string[];
  /** A dish's ordinary price; `price` is what it costs right now, which differs in happy hour. */
  regularPrice?: number | null;
  /** True while happy hour is running for this dish. */
  happyNow?: boolean;
  /** False outside the dish's serving hours; it cannot be ordered then. */
  servedNow?: boolean;
  /** Serving hours and happy hour, in minutes after midnight, Nairobi time. */
  serveFromMinute?: number | null;
  serveToMinute?: number | null;
  happyPrice?: number | null;
  happyFromMinute?: number | null;
  happyToMinute?: number | null;
  /** Days happy hour runs, as digits 1 (Monday) to 7 (Sunday); empty means every day. */
  happyDays?: string | null;
  /** A line about the dish, shown to customers under its name. */
  description?: string | null;
  /** The dish's picture, if it has one. */
  imageUrl?: string | null;
  /**
   * How many more the branch's usable stock can make, if only this were made. Null when the dish
   * has no recipe of counted ingredients, or no branch was asked for.
   */
  canMake?: number | null;
  /** The ingredient that runs out first. */
  limitingIngredient?: string | null;
  /** How many of `canMake` depend on stock that expires today. */
  mustUseToday?: number | null;
};

export type MenuRecord = {
  categories: MenuCategoryRecord[];
  items: MenuItemRecord[];
  modifierGroups: ModifierGroupRecord[];
  stations: KitchenStationRecord[];
};

const base = API_ROUTES.restaurant;

/** The whole menu. With a branch, products carry their shelf price there. */
export async function fetchMenu(branchId?: string | null): Promise<MenuRecord> {
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return apiRequest<MenuRecord>(`${base}/menu${query}`, { toast: false });
}

export type MenuItemPayload = {
  categoryId?: string | null;
  name?: string;
  kind?: MenuItemKind;
  itemId?: string;
  price?: number;
  taxRateId?: string | null;
  stationId?: string | null;
  sortOrder?: number;
  active?: boolean;
  modifierGroupIds?: string[];
  serveFromMinute?: number;
  serveToMinute?: number;
  clearServingHours?: boolean;
  happyPrice?: number;
  happyFromMinute?: number;
  happyToMinute?: number;
  happyDays?: string;
  clearHappyHour?: boolean;
  /** Blank clears it. */
  description?: string;
};

export async function createMenuItem(body: MenuItemPayload): Promise<MenuItemRecord> {
  return apiRequest<MenuItemRecord>(`${base}/menu/items`, { method: "POST", body });
}

/** Blank `categoryId` / `stationId` / `taxRateId` clears it; a field left out is not changed. */
export async function updateMenuItem(id: string, body: MenuItemPayload): Promise<MenuItemRecord> {
  return apiRequest<MenuItemRecord>(`${base}/menu/items/${id}`, { method: "PATCH", body });
}

/** Gives a menu item its one picture (JPEG, PNG or WebP), replacing any it had. */
export async function setMenuItemPicture(id: string, file: File): Promise<MenuItemRecord> {
  return apiUploadFile<MenuItemRecord>(`${base}/menu/items/${id}/picture`, file);
}

export async function removeMenuItemPicture(id: string): Promise<MenuItemRecord> {
  return apiRequest<MenuItemRecord>(`${base}/menu/items/${id}/picture`, { method: "DELETE" });
}

export async function deleteMenuItem(id: string): Promise<void> {
  await apiRequest<void>(`${base}/menu/items/${id}`, { method: "DELETE" });
}

/** The kitchen has run out of a dish, or has it again. */
export async function setMenuItemAvailable(id: string, available: boolean): Promise<MenuItemRecord> {
  return apiRequest<MenuItemRecord>(`${base}/menu/items/${id}/availability`, {
    method: "PUT",
    body: { available },
  });
}

export type CategoryPayload = {
  name: string;
  stationId?: string | null;
  sortOrder?: number;
  active?: boolean;
  serveFromMinute?: number;
  serveToMinute?: number;
  /** True clears the serving window, leaving the heading served all day. */
  clearServingHours?: boolean;
};

export async function createMenuCategory(body: CategoryPayload): Promise<MenuCategoryRecord> {
  return apiRequest<MenuCategoryRecord>(`${base}/menu/categories`, { method: "POST", body });
}

export async function updateMenuCategory(id: string, body: CategoryPayload): Promise<MenuCategoryRecord> {
  return apiRequest<MenuCategoryRecord>(`${base}/menu/categories/${id}`, { method: "PUT", body });
}

export async function deleteMenuCategory(id: string): Promise<void> {
  await apiRequest<void>(`${base}/menu/categories/${id}`, { method: "DELETE" });
}

export type ModifierGroupPayload = {
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder?: number;
  /** An option sent with its id is kept; one left out is removed from the menu. */
  options: { id?: string; name: string; priceDelta?: number; preselected?: boolean }[];
};

export async function createModifierGroup(body: ModifierGroupPayload): Promise<ModifierGroupRecord> {
  return apiRequest<ModifierGroupRecord>(`${base}/menu/modifier-groups`, { method: "POST", body });
}

export async function updateModifierGroup(id: string, body: ModifierGroupPayload): Promise<ModifierGroupRecord> {
  return apiRequest<ModifierGroupRecord>(`${base}/menu/modifier-groups/${id}`, { method: "PUT", body });
}

export async function deleteModifierGroup(id: string): Promise<void> {
  await apiRequest<void>(`${base}/menu/modifier-groups/${id}`, { method: "DELETE" });
}

/** One pour off a bottle: a tot, single, double or glass. `price` is the whole price a customer pays. */
export type MeasurePourPayload = {
  label: string;
  pourMl: number;
  price: number;
  preselected?: boolean;
};

/**
 * Sets up a bottle's pour measures. The server builds a "choose one" modifier group whose options
 * each take their fraction of the bottle off the stock count when sold, so the owner never computes
 * 30/750. Re-running with the same group name replaces the pours.
 */
export type MeasuresPayload = {
  bottleItemId: string;
  bottleMl: number;
  groupName?: string;
  dishMenuItemId?: string;
  pours: MeasurePourPayload[];
};

export type MeasuresRecord = {
  groupId: string;
  bottleItemId: string;
  bottleMl: number;
  pours: { optionId: string; label: string; quantity: number; price: number }[];
};

export async function generateMeasures(body: MeasuresPayload): Promise<MeasuresRecord> {
  return apiRequest<MeasuresRecord>(`${base}/menu/measures`, { method: "POST", body });
}

export async function createStation(name: string): Promise<KitchenStationRecord> {
  return apiRequest<KitchenStationRecord>(`${base}/stations`, { method: "POST", body: { name } });
}

export async function updateStation(
  id: string,
  body: { name: string; active?: boolean } & StationPrinterPayload,
): Promise<KitchenStationRecord> {
  return apiRequest<KitchenStationRecord>(`${base}/stations/${id}`, { method: "PUT", body });
}

// ---------------------------------------------------------------- kitchen and orders

export type KitchenStage = "NEW" | "PREPARING" | "READY" | "SERVED" | "VOIDED";

export type ChosenModifier = { group: string; option: string; priceDelta: number; optionId?: string };

export type KitchenLineRecord = {
  id: string;
  orderLineId: string;
  name: string;
  quantity: number;
  modifiers: ChosenModifier[];
  note: string | null;
  stage: KitchenStage;
  readyAt: string | null;
};

export type KitchenTicketRecord = {
  id: string;
  orderId: string;
  orderNumber: number;
  /** Null is the one kitchen of a business that has set up no stations. */
  stationId: string | null;
  ticketType: "NEW" | "VOID";
  status: "OPEN" | "READY" | "SERVED" | "VOIDED";
  roundNo: number;
  sentAt: string;
  readyAt: string | null;
  lines: KitchenLineRecord[];
};

export type KitchenBoardRecord = { branchId: string; asOf: string; tickets: KitchenTicketRecord[] };

/** `stationId`: a station id, `"none"` for the kitchen with no station, or nothing for every station. */
export async function fetchKitchenBoard(branchId: string, stationId?: string | null): Promise<KitchenBoardRecord> {
  const params = new URLSearchParams({ branchId });
  if (stationId) params.set("stationId", stationId);
  return apiRequest<KitchenBoardRecord>(`${base}/kitchen/tickets?${params.toString()}`, { toast: false });
}

/** Safe to repeat: asking for the stage a line already has changes nothing. */
export async function setKitchenLineStage(lineId: string, stage: KitchenStage): Promise<KitchenTicketRecord> {
  return apiRequest<KitchenTicketRecord>(`${base}/kitchen/lines/${lineId}/stage`, {
    method: "POST",
    body: { stage },
    toast: false,
  });
}

export async function setKitchenTicketStage(ticketId: string, stage: KitchenStage): Promise<KitchenTicketRecord> {
  return apiRequest<KitchenTicketRecord>(`${base}/kitchen/tickets/${ticketId}/stage`, {
    method: "POST",
    body: { stage },
    toast: false,
  });
}

export async function acknowledgeVoidTicket(ticketId: string): Promise<void> {
  await apiRequest<void>(`${base}/kitchen/tickets/${ticketId}/acknowledge`, { method: "POST", toast: false });
}

// ---------------------------------------------------------------- kitchen print queue

/**
 * A kitchen ticket waiting to be printed, addressed to a branch and a station. Any signed-in device
 * at the branch may claim it (once) and print it, on the station's own printer if it named one, else
 * on the printing device's. The ticket itself rides along so a claiming device prints without another
 * read. `reprint` is true for a ticket the counter asked to print again.
 */
export type KitchenPrintJobRecord = {
  id: string;
  ticketId: string;
  orderNumber: number;
  stationId: string | null;
  stationName: string | null;
  printerName: string | null;
  printerHost: string | null;
  printerPort: number | null;
  reprint: boolean;
  ticket: KitchenTicketRecord;
};

/** A kitchen ticket the counter should warn has not printed. */
export type UnprintedTicketRecord = {
  jobId: string;
  ticketId: string;
  orderNumber: number;
  stationId: string | null;
  ticketType: "NEW" | "VOID";
  sentAt: string;
};

/** Jobs this device should print now: its station's, and the implicit kitchen's. Oldest first. */
export async function fetchKitchenPrintJobs(branchId: string, stationId?: string | null): Promise<KitchenPrintJobRecord[]> {
  const params = new URLSearchParams({ branchId });
  if (stationId) params.set("stationId", stationId);
  const res = await apiRequest<{ jobs: KitchenPrintJobRecord[] }>(
    `${base}/kitchen/print-jobs?${params.toString()}`,
    { toast: false },
  );
  return res.jobs;
}

/** Claim one job for this device. Throws (404) when another device already took it. */
export async function claimKitchenPrintJob(jobId: string): Promise<KitchenPrintJobRecord> {
  return apiRequest<KitchenPrintJobRecord>(`${base}/kitchen/print-jobs/${jobId}/claim`, { method: "POST", toast: false });
}

/** Tell the server the ticket came out of the printer. Safe to repeat. */
export async function markKitchenJobPrinted(jobId: string): Promise<void> {
  await apiRequest<void>(`${base}/kitchen/print-jobs/${jobId}/printed`, { method: "POST", toast: false });
}

/** Reprint a ticket from the counter; the new slip is marked a reprint. */
export async function reprintKitchenTicket(ticketId: string): Promise<KitchenPrintJobRecord> {
  return apiRequest<KitchenPrintJobRecord>(`${base}/kitchen/tickets/${ticketId}/reprint`, { method: "POST", toast: false });
}

/** Tickets the counter should warn have not printed at the kitchen. */
export async function fetchUnprintedTickets(branchId: string): Promise<UnprintedTicketRecord[]> {
  const res = await apiRequest<{ tickets: UnprintedTicketRecord[] }>(
    `${base}/kitchen/unprinted?${new URLSearchParams({ branchId }).toString()}`,
    { toast: false },
  );
  return res.tickets;
}

export type OrderSummaryRecord = {
  orderId: string;
  orderNumber: number;
  saleId: string | null;
  sentAt: string | null;
  ready: boolean;
  linesTotal: number;
  linesReady: number;
  lineNames: string[];
};

/** Orders paid for and not yet handed over, oldest first. */
export async function fetchOrdersInProgress(branchId: string): Promise<OrderSummaryRecord[]> {
  const res = await apiRequest<{ orders: OrderSummaryRecord[] }>(
    `${base}/orders?branchId=${encodeURIComponent(branchId)}`,
    { toast: false },
  );
  return res.orders ?? [];
}

/** The order a sale produced, or null when the sale sent nothing to a kitchen. */
export async function fetchOrderForSale(saleId: string): Promise<OrderSummaryRecord | null> {
  try {
    return await apiRequest<OrderSummaryRecord>(`${base}/orders/by-sale/${saleId}`, { toast: false });
  } catch {
    return null;
  }
}

export async function handOverOrder(orderId: string): Promise<OrderSummaryRecord> {
  return apiRequest<OrderSummaryRecord>(`${base}/orders/${orderId}/handed-over`, { method: "POST", toast: false });
}

// ---------------------------------------------------------------- reports

export type MenuSalesReport = {
  from: string;
  to: string;
  totalRevenue: number;
  /** True once any recipe exists. A dish with no recipe still has no cost. */
  costTracked: boolean;
  /** What the ingredients of the dishes that have a recipe cost. */
  totalCost: number;
  items: {
    menuItemId: string | null;
    name: string | null;
    quantity: number;
    revenue: number;
    sharePercent: number;
    /** Null when the dish has no recipe. */
    cost: number | null;
    margin: number | null;
    costPercent: number | null;
    engineering: "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG" | null;
  }[];
  modifiers: { group: string; option: string; timesChosen: number; extraRevenue: number }[];
};

export type KitchenTimesReport = {
  from: string;
  to: string;
  stations: {
    stationId: string | null;
    stationName: string;
    tickets: number;
    medianSeconds: number;
    slowestSeconds: number;
  }[];
};

export async function fetchMenuSalesReport(branchId: string, from: string, to: string): Promise<MenuSalesReport> {
  const params = new URLSearchParams({ branchId, from, to });
  return apiRequest<MenuSalesReport>(`${base}/reports/menu-sales?${params.toString()}`, { toast: false });
}

export async function fetchKitchenTimesReport(branchId: string, from: string, to: string): Promise<KitchenTimesReport> {
  const params = new URLSearchParams({ branchId, from, to });
  return apiRequest<KitchenTimesReport>(`${base}/reports/kitchen-times?${params.toString()}`, { toast: false });
}

export type TableTakingsRow = {
  /** Null for a row that is not a table: tabs, takeaway, delivery. */
  tableId: string | null;
  name: string;
  area: string | null;
  /** The waiter assigned to the table now. */
  waiter: string | null;
  orders: number;
  guests: number;
  bills: number;
  /** What the paid bills came to, service charge included, tips not. */
  taken: number;
  tips: number;
  perOrder: number;
};

export type WaiterTakingsRow = { staffProfileId: string; name: string; orders: number; taken: number; tips: number };

export type TableTakingsReport = {
  from: string;
  to: string;
  taken: number;
  tips: number;
  orders: number;
  tables: TableTakingsRow[];
  offTheFloor: TableTakingsRow[];
  waiters: WaiterTakingsRow[];
};

/** What each table and each waiter took over a period, from the bills paid. */
export async function fetchTableTakings(branchId: string, from: string, to: string): Promise<TableTakingsReport> {
  const params = new URLSearchParams({ branchId, from, to });
  return apiRequest<TableTakingsReport>(`${base}/reports/tables?${params.toString()}`, { toast: false });
}

// ---------------------------------------------------------------- tables, the floor, open orders

export type RestaurantTableRecord = {
  id: string;
  name: string;
  capacity: number | null;
  area: string | null;
  active: boolean;
  sortOrder: number;
  /** The secret in the table's QR code; null when customers cannot order from it. */
  qrToken?: string | null;
  /** The waiter who looks after the table: a new order there is theirs unless another is named. */
  waiterStaffProfileId?: string | null;
  waiterName?: string | null;
};

export type OrderChannel = "COUNTER" | "DINE_IN" | "TAKEAWAY" | "DELIVERY";

/** An open order as the floor shows it. */
export type OrderCardRecord = {
  orderId: string;
  orderNumber: number;
  channel: OrderChannel;
  tableId: string | null;
  guestCount: number | null;
  servedByStaffProfileId: string | null;
  servedByName: string | null;
  customerName: string | null;
  openedAt: string;
  total: number;
  /** What of the total is on no paid or closed bill yet. */
  unsettled: number;
  /** Lines added but not yet sent to the kitchen. */
  unsent: number;
  inKitchen: number;
  /** Made and waiting to be carried over. */
  ready: number;
  billRequestedAt: string | null;
  /** A table booked for later whose guests have not arrived. */
  booked: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  /** Paid or otherwise closed. Only a delivery still to be delivered is listed in this state. */
  settled?: boolean;
  /** A delivery: when it left with the rider. */
  dispatchedAt?: string | null;
};

export type FloorRecord = {
  branchId: string;
  asOf: string;
  tables: { table: RestaurantTableRecord; orders: OrderCardRecord[] }[];
  /** Open orders with no table: takeaway, delivery, and bookings not yet given a table. */
  otherOrders: OrderCardRecord[];
};

export type OrderLineStage = "DRAFT" | KitchenStage;

export type OrderLineRecord = {
  id: string;
  kind: "DISH" | "ITEM";
  menuItemId: string | null;
  itemId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: ChosenModifier[];
  note: string | null;
  seatNo: number | null;
  /** `DRAFT` until it is sent to the kitchen. */
  stage: OrderLineStage;
  sentAt: string | null;
  /** How much of the line is on a bill that is open or settled. */
  billedQuantity: number;
  /** How much of it is on a bill that is paid or otherwise closed. */
  settledQuantity: number;
  voidReason: string | null;
  /** The customer added this line from the table's QR code; nobody on the staff has confirmed it until it is sent. */
  fromCustomer?: boolean;
};

export type OrderBillRecord = {
  id: string;
  billNo: number;
  status: "OPEN" | "PAID" | "COMP" | "UNPAID" | "VOIDED";
  total: number;
  saleId: string | null;
  receiptNo: number | null;
  reason: string | null;
  lines: { orderLineId: string; name: string; quantity: number; amount: number }[];
  serviceCharge: number;
  packagingCharge: number;
  deliveryFee: number;
  /** The lines plus the service charge, packaging charge and delivery fee. */
  toPay: number;
};

export type OpenOrderRecord = {
  id: string;
  orderNumber: number;
  branchId: string;
  channel: OrderChannel;
  /** `pending` while open, `completed` once every line is settled, `cancelled`. */
  status: "pending" | "completed" | "cancelled";
  booked: boolean;
  tableId: string | null;
  tableName: string | null;
  guestCount: number | null;
  servedByStaffProfileId: string | null;
  servedByName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  openedAt: string;
  billRequestedAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  version: number;
  /** Everything not cancelled. */
  total: number;
  /** What closed bills cover. */
  settled: number;
  /** What is on no bill yet. */
  unbilled: number;
  lines: OrderLineRecord[];
  bills: OrderBillRecord[];
  /** A delivery order's fee (its own, else the usual one), rider and progress. */
  deliveryFee: number | null;
  riderName: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  /** `QR` when a customer started it from a table's QR code. */
  source: string | null;
  /** A deposit held against a booking, and its state, or null when none. */
  depositAmount: number | null;
  depositState: "HELD" | "APPLIED" | "CREDITED" | "FORFEITED" | "REFUNDED" | null;
};

export async function fetchTables(branchId: string): Promise<RestaurantTableRecord[]> {
  return apiRequest<RestaurantTableRecord[]>(`${base}/tables?branchId=${encodeURIComponent(branchId)}`, { toast: false });
}

export async function createTable(body: {
  branchId: string;
  name: string;
  capacity?: number;
  area?: string;
}): Promise<RestaurantTableRecord> {
  return apiRequest<RestaurantTableRecord>(`${base}/tables`, { method: "POST", body });
}

/** A field left out is not changed; a blank area clears it. */
export async function updateTable(
  id: string,
  body: {
    name?: string;
    capacity?: number;
    area?: string;
    active?: boolean;
    /** The table's waiter; an empty string takes them off it. */
    waiterStaffProfileId?: string;
  },
): Promise<RestaurantTableRecord> {
  return apiRequest<RestaurantTableRecord>(`${base}/tables/${id}`, { method: "PATCH", body });
}

export async function fetchFloor(branchId: string): Promise<FloorRecord> {
  return apiRequest<FloorRecord>(`${base}/floor?branchId=${encodeURIComponent(branchId)}`, { toast: false });
}

export type OpenOrderPayload = {
  branchId: string;
  channel: Exclude<OrderChannel, "COUNTER">;
  tableId?: string | null;
  guestCount?: number;
  servedByStaffProfileId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  /** Made once by the device for this order; repeating the request returns the same order. */
  clientOrderId: string;
  /** For a table, set both to book it for later. For a takeaway or delivery: when it is wanted. */
  scheduledStart?: string;
  scheduledEnd?: string;
  /** A delivery order's own fee; left out, the usual fee applies. */
  deliveryFee?: number;
};

export async function openOrder(body: OpenOrderPayload): Promise<OpenOrderRecord> {
  return apiRequest<OpenOrderRecord>(`${base}/open-orders`, { method: "POST", body, toast: false });
}

export async function fetchOpenOrder(orderId: string): Promise<OpenOrderRecord> {
  return apiRequest<OpenOrderRecord>(`${base}/open-orders/${orderId}`, { toast: false });
}

export type NewOrderLinePayload = {
  /** Made once by the device for this line; a repeated request does not add it twice. */
  clientLineId: string;
  menuItemId: string;
  modifierOptionIds?: string[];
  quantity: number;
  note?: string;
  seatNo?: number;
};

const order = (orderId: string, path = "") => `${base}/open-orders/${orderId}${path}`;
const post = (url: string, body?: unknown) =>
  apiRequest<OpenOrderRecord>(url, { method: "POST", ...(body === undefined ? {} : { body }), toast: false });

export const addOrderLines = (orderId: string, lines: NewOrderLinePayload[]) => post(order(orderId, "/lines"), { lines });

/** Only for a line that has not been sent. A quantity of zero removes it. */
export async function changeOrderLine(
  orderId: string,
  lineId: string,
  body: { quantity?: number; note?: string; seatNo?: number },
): Promise<OpenOrderRecord> {
  return apiRequest<OpenOrderRecord>(order(orderId, `/lines/${lineId}`), { method: "PATCH", body, toast: false });
}

/** Removes an unsent line, or cancels a sent one (which needs a reason and its own permission). */
export const cancelOrderLine = (orderId: string, lineId: string, reason?: string) =>
  post(order(orderId, `/lines/${lineId}/cancel`), reason ? { reason } : {});

/** Sends everything not yet sent to the kitchen. Sending twice sends nothing the second time. */
export const sendOrder = (orderId: string) => post(order(orderId, "/send"));
export const moveOrder = (orderId: string, tableId: string | null) => post(order(orderId, "/move"), { tableId });
export const setBillRequested = (orderId: string, requested: boolean) =>
  post(order(orderId, "/bill-requested"), { requested });
export const seatBooking = (orderId: string) => post(order(orderId, "/seat"));
/** Everything the kitchen has finished has been carried to the table. */
export const markOrderServed = (orderId: string) => post(order(orderId, "/served"));
/** Cancel an order. On a booking with a held deposit, hand it back (cash/M-Pesa) or let it fall to credit. */
export const cancelOrder = (
  orderId: string,
  reason?: string,
  deposit?: { refundsDeposit: boolean; depositBack?: "cash" | "mpesa_manual" },
) => post(order(orderId, "/cancel"), { reason, ...(deposit ?? {}) });

/** Take a deposit against a booking. Held in the customer's name (found or made from the booking's phone). */
export const takeBookingDeposit = (orderId: string, amount: number, method: "cash" | "mpesa_manual") =>
  post(order(orderId, "/deposit"), { amount, method });

/** A booking whose guests never arrived. Its deposit is kept as income, or made the customer's credit. */
export const markNoShow = (orderId: string, keepDepositAsCredit: boolean) =>
  post(order(orderId, "/no-show"), { keepDepositAsCredit });

/** A field left out is not changed; a blank clears it. */
export async function updateOrderDetails(
  orderId: string,
  body: { guestCount?: number; servedByStaffProfileId?: string; customerName?: string; customerPhone?: string },
): Promise<OpenOrderRecord> {
  return apiRequest<OpenOrderRecord>(order(orderId), { method: "PATCH", body, toast: false });
}

/** A bill for exactly these lines, for one seat, or — with neither — for everything not yet on a bill. */
export const createBill = (
  orderId: string,
  body?: { lines?: { orderLineId: string; quantity: number }[]; seatNo?: number },
) => post(order(orderId, "/bills"), body ?? {});

export async function discardBill(orderId: string, billId: string): Promise<OpenOrderRecord> {
  return apiRequest<OpenOrderRecord>(order(orderId, `/bills/${billId}`), { method: "DELETE", toast: false });
}

export type PayBillPayload = {
  payments: { method: "cash" | "mpesa_manual"; amount: number; reference?: string }[];
  /** For whoever served the order; not part of the bill. */
  tip?: number;
  cashReceived?: number;
  clientSoldAt?: string;
};

/** One ordinary sale. Paying the same bill again rings nothing more. */
export const payBill = (orderId: string, billId: string, body: PayBillPayload) =>
  post(order(orderId, `/bills/${billId}/pay`), body);

/** Closes a bill with no sale: on the house (`COMP`) or left without paying (`UNPAID`). */
export const closeBillWithoutSale = (orderId: string, billId: string, outcome: "COMP" | "UNPAID", reason: string) =>
  post(order(orderId, `/bills/${billId}/close`), { outcome, reason });

// ---------------------------------------------------------------- recipes

export type RecipeIngredientRecord = {
  itemId: string;
  name: string;
  unit: string | null;
  /** What ends up on the plate, in the ingredient's own stock unit. */
  quantity: number;
  yieldPercent: number | null;
  takenFromStock: number;
  /** Today's buying price: an estimate. The sale uses what the stock actually cost. */
  unitCost: number | null;
  cost: number | null;
  onHand: number | null;
  /** A product used instead, in the same amount, when this one has run out and the stand-in has not. */
  substituteItemId?: string | null;
  substituteName?: string | null;
  substituteOnHand?: number | null;
};

export type RecipeRecord = { ingredients: RecipeIngredientRecord[]; estimatedCost: number; costKnown: boolean };

export type RecipeIngredientPayload = {
  itemId: string;
  quantity: number;
  yieldPercent?: number;
  substituteItemId?: string;
};

export async function fetchDishRecipe(menuItemId: string): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/menu/items/${menuItemId}/recipe`, { toast: false });
}

/** An empty list removes the recipe. */
export async function saveDishRecipe(menuItemId: string, ingredients: RecipeIngredientPayload[]): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/menu/items/${menuItemId}/recipe`, { method: "PUT", body: { ingredients } });
}

export async function fetchOptionRecipe(optionId: string): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/menu/modifier-options/${optionId}/recipe`, { toast: false });
}

export async function saveOptionRecipe(optionId: string, ingredients: RecipeIngredientPayload[]): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/menu/modifier-options/${optionId}/recipe`, { method: "PUT", body: { ingredients } });
}

// ---------------------------------------------------------------- settings, servers, joining, delivery, QR, batches

export type RestaurantSettingsRecord = {
  /** Added to every bill of a table's order; null means none. */
  serviceChargePercent: number | null;
  /** True: a tip is shared equally among everyone marked as serving customers. */
  tipsPooled: boolean;
  /** Added once to a takeaway or delivery order. */
  packagingCharge: number | null;
  /** The usual delivery fee; an order may carry its own. */
  deliveryFee: number | null;
  /** Minutes after midnight, Nairobi time, at which a report's day starts. */
  dayStartsAtMinute: number;
  /** Whether a customer may add to a table's order from its QR code. */
  qrOrdering: boolean;
  /**
   * `BUSINESS`: the service charge is the restaurant's income. `STAFF`: it is collected for whoever
   * serves and shared exactly as a tip is. The customer pays the same either way.
   */
  serviceChargeTo?: "BUSINESS" | "STAFF";
  /** Whether the menu is shown on the restaurant's public web page. */
  menuOnline?: boolean;
};

export async function fetchRestaurantSettings(): Promise<RestaurantSettingsRecord> {
  return apiRequest<RestaurantSettingsRecord>(`${base}/settings`, { toast: false });
}

/** A field left out is not changed; zero switches a charge off. */
export async function saveRestaurantSettings(body: Partial<RestaurantSettingsRecord>): Promise<RestaurantSettingsRecord> {
  return apiRequest<RestaurantSettingsRecord>(`${base}/settings`, { method: "PUT", body });
}

/** Everyone who can be named as serving an order. */
export async function fetchServers(): Promise<{ staffProfileId: string; name: string }[]> {
  return apiRequest<{ staffProfileId: string; name: string }[]>(`${base}/servers`, { toast: false });
}

/** Joins this order into another open order at the same branch; this one is closed. */
export const mergeOrder = (orderId: string, intoOrderId: string) => post(order(orderId, "/merge"), { intoOrderId });

/** A delivery order's fee, rider and progress. A field left out is not changed. */
export const setOrderDelivery = (
  orderId: string,
  body: { deliveryFee?: number; riderName?: string; dispatched?: boolean; delivered?: boolean },
) => post(order(orderId, "/delivery"), body);

/** Gives a table a new QR code (the old one stops working), or takes its code away. */
export async function setTableQr(tableId: string, enabled: boolean): Promise<RestaurantTableRecord> {
  return apiRequest<RestaurantTableRecord>(`${base}/tables/${tableId}/qr`, { method: "POST", body: { enabled } });
}

export async function fetchBatchRecipe(itemId: string): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/prep/${itemId}/recipe`, { toast: false });
}

export async function saveBatchRecipe(itemId: string, ingredients: RecipeIngredientPayload[]): Promise<RecipeRecord> {
  return apiRequest<RecipeRecord>(`${base}/prep/${itemId}/recipe`, { method: "PUT", body: { ingredients } });
}

/** Makes a batch: its ingredients leave the stock count and the batch joins it at what they cost. */
export async function makePrepBatch(
  itemId: string,
  branchId: string,
  quantity: number,
): Promise<{ itemId: string; quantity: number; cost: number }> {
  return apiRequest<{ itemId: string; quantity: number; cost: number }>(`${base}/prep/${itemId}/batches`, {
    method: "POST",
    body: { branchId, quantity },
  });
}

// ---------------------------------------------------------------- kitchen requisitions

export type RequisitionLineRecord = {
  id: string;
  itemId: string;
  name: string;
  unit: string | null;
  quantityRequested: number;
  /** Null until issued; zero when this product was not given. */
  quantityIssued: number | null;
  /** The product's stock count now. */
  onHand: number | null;
};

export type RequisitionRecord = {
  id: string;
  number: number;
  branchId: string;
  stationId: string | null;
  stationName: string | null;
  status: "REQUESTED" | "ISSUED" | "REFUSED" | "CANCELLED";
  note: string | null;
  requestedByName: string | null;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  lines: RequisitionLineRecord[];
};

export type RequisitionListRecord = { branchId: string; waiting: RequisitionRecord[]; recent: RequisitionRecord[] };

/** What the kitchen has asked the store for: a record of who asked and what they were given. No stock moves. */
export async function fetchRequisitions(branchId: string): Promise<RequisitionListRecord> {
  return apiRequest<RequisitionListRecord>(`${base}/requisitions?branchId=${encodeURIComponent(branchId)}`, {
    toast: false,
  });
}

export type RequisitionProductRecord = { id: string; name: string; unit: string | null };

/**
 * Stocked products the kitchen can ask for. Deliberately not the catalogue search: that needs
 * catalog.items.read and returns prices, which a cook is not shown.
 */
export async function searchRequisitionProducts(search: string): Promise<RequisitionProductRecord[]> {
  return apiRequest<RequisitionProductRecord[]>(`${base}/requisitions/products?search=${encodeURIComponent(search)}`, {
    toast: false,
  });
}

/** `clientKey` is made once per request, so sending it again after a dropped connection asks once. */
export async function askRequisition(body: {
  branchId: string;
  clientKey: string;
  note?: string;
  stationId?: string;
  lines: { itemId: string; quantity: number }[];
}): Promise<RequisitionRecord> {
  return apiRequest<RequisitionRecord>(`${base}/requisitions`, { method: "POST", body });
}

/** A line left out is given in full. */
export async function issueRequisition(
  id: string,
  body: { lines?: { lineId: string; quantity: number }[]; note?: string },
): Promise<RequisitionRecord> {
  return apiRequest<RequisitionRecord>(`${base}/requisitions/${id}/issue`, { method: "POST", body });
}

export async function refuseRequisition(id: string, reason: string): Promise<RequisitionRecord> {
  return apiRequest<RequisitionRecord>(`${base}/requisitions/${id}/refuse`, { method: "POST", body: { reason } });
}

export async function cancelRequisition(id: string): Promise<RequisitionRecord> {
  return apiRequest<RequisitionRecord>(`${base}/requisitions/${id}/cancel`, { method: "POST" });
}

// ---------------------------------------------------------------- the pantry (ADR 0026)

export type PantryDishRecord = {
  menuItemId: string;
  name: string;
  /** Portions the usable stock allows, if only this dish were made. */
  canMake: number;
  limitingIngredient: string;
  mustUseToday: number;
  /** Average sold a day over the last fourteen days. */
  soldPerDay: number;
  /** How long `canMake` lasts at that rate; null when none sold. */
  daysOfCover: number | null;
};

export type PantryIngredientRecord = {
  itemId: string;
  name: string;
  unit: string | null;
  usable: number;
  /** Still on the shelf but past its date: it makes nothing, and can be written off. */
  expired: number;
  dishes: string[];
  /** The dish its stock is stated in: of those that use it, the one that sells most. */
  servingsDish: string | null;
  perServing: number | null;
  servings: number;
  /** The part of `usable` whose batch expires within three days. */
  expiringSoon: number;
  firstExpiry: string | null;
  lastBoughtAt: string | null;
  lastSupplier: string | null;
  lastUnitCost: number | null;
};

export type PantryLossReason = "SPOILAGE" | "BREAKAGE" | "EXPIRED" | "OTHER";

export type PantryLossRecord = {
  itemId: string;
  name: string;
  unit: string | null;
  reason: string;
  quantity: number;
  cost: number;
  servingsDish: string | null;
  servingsLost: number;
};

export type PantryRecord = {
  branchId: string;
  asOf: string;
  dishes: PantryDishRecord[];
  ingredients: PantryIngredientRecord[];
  losses: PantryLossRecord[];
};

export async function fetchPantry(branchId: string): Promise<PantryRecord> {
  return apiRequest<PantryRecord>(`${base}/pantry?branchId=${encodeURIComponent(branchId)}`);
}

export type PantryPlanLineRecord = {
  itemId: string;
  name: string;
  unit: string | null;
  needed: number;
  usable: number;
  /** How much more must be bought; zero when there is enough. */
  shortfall: number;
  unitCost: number | null;
  estimatedCost: number | null;
  lastSupplier: string | null;
};

export type PantryPlanRecord = {
  lines: PantryPlanLineRecord[];
  estimatedTotal: number;
  /** False when some shortfall has no known price, so the total is a floor. */
  costKnown: boolean;
};

/** What a planned service needs bought. A calculation; nothing is stored. */
export async function planPantryService(
  branchId: string,
  portions: { menuItemId: string; portions: number }[],
): Promise<PantryPlanRecord> {
  return apiRequest<PantryPlanRecord>(`${base}/pantry/plan`, { method: "POST", body: { branchId, portions } });
}

export type PantryLossResult = {
  itemId: string;
  name: string;
  quantity: number;
  cost: number | null;
  servingsDish: string | null;
  servingsLost: number;
};

/** Writes off an ingredient that spoiled, broke or expired. One call, one write-off. */
export async function recordPantryLoss(body: {
  branchId: string;
  itemId: string;
  quantity: number;
  reason: PantryLossReason;
  note?: string;
}): Promise<PantryLossResult> {
  return apiRequest<PantryLossResult>(`${base}/pantry/losses`, { method: "POST", body });
}

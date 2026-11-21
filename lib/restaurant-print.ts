import {
  getLocalTillCupsName,
  getLocalTillNetworkTarget,
  printEscPosViaTillBridge,
  type TillBridgePrintTarget,
} from "@/lib/till-print-bridge";
import { fetchSaleReceiptThermal } from "@/lib/api";
import type {
  KitchenPrintJobRecord,
  KitchenTicketRecord,
  OpenOrderRecord,
  OrderBillRecord,
} from "@/lib/restaurant-api";

/**
 * Kitchen tickets and bills on a thermal printer, through the same print bridge the till uses
 * (a small program on the device that owns the printer). Plain ESC/POS text: any 58 or 80 mm
 * receipt printer prints it. Nothing here needs the server, so a kitchen printer keeps working
 * on the device it is plugged into.
 */

const INIT = [0x1b, 0x40];
const CUT = [0x1b, 0x64, 0x05, 0x1d, 0x56, 0x01];
const BIG = [0x1d, 0x21, 0x11];
const NORMAL = [0x1d, 0x21, 0x00];
const BOLD_ON = [0x1b, 0x45, 0x01];
const BOLD_OFF = [0x1b, 0x45, 0x00];
const WIDTH = 32;

/** Printers speak a single-byte code page; anything outside plain ASCII is replaced so nothing prints as noise. */
function ascii(text: string): number[] {
  const out: number[] = [];
  for (const ch of text.normalize("NFKD")) {
    const code = ch.charCodeAt(0);
    if (code === 0xd7) out.push(0x78); // the multiplication sign prints as "x"
    else if (code === 0xb7) out.push(0x2d); // a middle dot prints as "-", not as noise
    else if (code >= 0x20 && code < 0x7f) out.push(code);
    else if (code === 0x0a) out.push(0x0a);
    else if (code < 0x300 || code > 0x36f) out.push(0x3f);
  }
  return out;
}

function line(text = ""): number[] {
  return [...ascii(text), 0x0a];
}

function wrap(text: string, indent = ""): number[] {
  const out: number[] = [];
  let rest = text;
  while (rest.length > WIDTH - indent.length) {
    let cut = rest.lastIndexOf(" ", WIDTH - indent.length);
    if (cut <= 0) cut = WIDTH - indent.length;
    out.push(...line(indent + rest.slice(0, cut)));
    rest = rest.slice(cut).trimStart();
  }
  out.push(...line(indent + rest));
  return out;
}

function columns(left: string, right: string): number[] {
  const space = Math.max(1, WIDTH - left.length - right.length);
  return line(left.slice(0, WIDTH - right.length - 1) + " ".repeat(space) + right);
}

function clock(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
}

/** What a station is told to make: order number large, where it goes, each line with its choices and note, no prices. */
export function buildKitchenTicketEscPos(
  ticket: KitchenTicketRecord,
  stationName: string | null,
  reprint = false,
): Uint8Array {
  const bytes: number[] = [...INIT];
  const isVoid = ticket.ticketType === "VOID";
  if (isVoid) bytes.push(...BOLD_ON, ...BIG, ...line("** CANCELLED **"), ...NORMAL, ...BOLD_OFF);
  if (reprint) bytes.push(...BOLD_ON, ...line("** REPRINT **"), ...BOLD_OFF);
  bytes.push(...BIG, ...line(`Order ${ticket.orderNumber}`), ...NORMAL);
  bytes.push(...line(`${stationName ?? "Kitchen"}  ${clock(ticket.sentAt)}${ticket.roundNo > 1 ? `  round ${ticket.roundNo}` : ""}`));
  // Where the food goes. A docket without it cannot be carried to the right table or bagged.
  const where = kitchenWhere(ticket);
  if (where) bytes.push(...BOLD_ON, ...line(where), ...BOLD_OFF);
  bytes.push(...line("-".repeat(WIDTH)));
  for (const l of ticket.lines) {
    const seat = l.seatNo ? `S${l.seatNo} · ` : "";
    bytes.push(...BOLD_ON, ...wrap(`${seat}${l.quantity} x ${l.name}`), ...BOLD_OFF);
    if (l.modifiers.length > 0) bytes.push(...wrap(l.modifiers.map((m) => m.option).join(", "), "  "));
    if (l.note) bytes.push(...wrap(`"${l.note}"`, "  "));
  }
  if (isVoid) bytes.push(...line("-".repeat(WIDTH)), ...line("Stop making the above."));
  bytes.push(...CUT);
  return new Uint8Array(bytes);
}

/** "DINE-IN · Table 4" / "TAKEAWAY · Kevin" / "DELIVERY" for a ticket's heading; empty on an old ticket. */
export function kitchenWhere(ticket: Pick<KitchenTicketRecord, "orderChannel" | "tableName" | "customerName">): string {
  const channel =
    ticket.orderChannel === "TAKEAWAY"
      ? "TAKEAWAY"
      : ticket.orderChannel === "DELIVERY"
        ? "DELIVERY"
        : ticket.orderChannel === "COUNTER"
          ? "COUNTER"
          : ticket.orderChannel === "DINE_IN"
            ? "DINE-IN"
            : ticket.orderChannel === "LODGING"
              ? "ROOM"
              : "";
  if (ticket.tableName) return channel === "DINE-IN" ? `DINE-IN · ${ticket.tableName}` : `${channel || "DINE-IN"} · ${ticket.tableName}`;
  // A counter or takeaway order is called by the guest's name when the cashier took one.
  if (ticket.customerName && (channel === "COUNTER" || channel === "TAKEAWAY" || channel === "DELIVERY")) {
    return `${channel} · ${ticket.customerName}`;
  }
  return channel;
}

/** A bill for the customer to check before paying. It is not a receipt: that prints when it is paid. */
export function buildBillEscPos(order: OpenOrderRecord, bill: OrderBillRecord, shopName: string | null): Uint8Array {
  const money = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bytes: number[] = [...INIT];
  if (shopName) bytes.push(...BOLD_ON, ...line(shopName), ...BOLD_OFF);
  const where =
    order.channel === "TAKEAWAY" ? "Takeaway" : order.channel === "DELIVERY" ? "Delivery" : (order.tableName ?? "Table");
  bytes.push(...line(`${where} - order ${order.orderNumber} - bill ${bill.billNo}`));
  bytes.push(...line(clock(null)));
  if (order.servedByName) bytes.push(...line(`Served by ${order.servedByName}`));
  bytes.push(...line("-".repeat(WIDTH)));
  for (const l of bill.lines) bytes.push(...columns(`${l.quantity} x ${l.name}`, money(l.amount)));
  bytes.push(...line("-".repeat(WIDTH)));
  if (bill.serviceCharge > 0) bytes.push(...columns("Service charge", money(bill.serviceCharge)));
  if (bill.packagingCharge > 0) bytes.push(...columns("Packaging", money(bill.packagingCharge)));
  if (bill.deliveryFee > 0) bytes.push(...columns("Delivery", money(bill.deliveryFee)));
  bytes.push(...BOLD_ON, ...columns("TO PAY KES", money(bill.toPay)), ...BOLD_OFF);
  bytes.push(...line(), ...line("This is not a receipt."), ...CUT);
  return new Uint8Array(bytes);
}

/** The printer this device was set up with for the till, if any. */
export function localPrinter(): TillBridgePrintTarget | null {
  const network = getLocalTillNetworkTarget();
  if (network?.host) return { host: network.host, port: network.port };
  const name = getLocalTillCupsName();
  return name ? { name } : null;
}

/** Prints on this device's printer. Throws with a message a person can act on when it cannot. */
export async function printOnThisDevice(bytes: Uint8Array): Promise<void> {
  const target = localPrinter();
  if (!target) {
    throw new Error("No printer is set up on this device. Set one up under the till's printer settings first.");
  }
  await printEscPosViaTillBridge(new Blob([bytes as BlobPart]), target);
}

/**
 * The customer's receipt for a sale, printed through the till bridge. The bytes come from the
 * server's own receipt renderer, so the paper says exactly what the fiscal receipt says — the shop's
 * name, the tax, the payments and the order number. Throws a message a person can act on.
 */
export async function printSaleReceiptOnThisDevice(
  saleId: string,
  cashReceived?: number | null,
): Promise<void> {
  const target = localPrinter();
  if (!target) {
    throw new Error("No printer is set up on this device. Set one up under the till's printer settings first.");
  }
  const blob = await fetchSaleReceiptThermal(saleId, 80, cashReceived ?? null);
  await printEscPosViaTillBridge(blob, target);
}

/** The printer a job should go to: the station's own, if it named one, else this device's. */
export function jobPrinterTarget(job: KitchenPrintJobRecord): TillBridgePrintTarget | null {
  if (job.printerHost) return { host: job.printerHost, port: job.printerPort ?? 9100 };
  if (job.printerName) return { name: job.printerName };
  return localPrinter();
}

/**
 * Print one queued kitchen ticket. It goes to the station's own printer when the station named one,
 * otherwise to this device's printer. Throws a message a person can act on when no printer is known.
 */
export async function printKitchenJob(job: KitchenPrintJobRecord): Promise<void> {
  const target = jobPrinterTarget(job);
  if (!target) {
    throw new Error(
      "No printer for this ticket. Give the station a printer in the menu, or set one up on this device.",
    );
  }
  const bytes = buildKitchenTicketEscPos(job.ticket, job.stationName, job.reprint);
  await printEscPosViaTillBridge(new Blob([bytes as BlobPart]), target);
}

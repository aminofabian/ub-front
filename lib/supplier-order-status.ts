/**
 * One vocabulary for a trade order as the supplier sees it. Every supplier screen (the order list, the order
 * itself, the overview) takes its words from here, so an order is called the same thing everywhere and always says
 * whose turn it is and what happens next.
 *
 * The buyer's side has its own words (`tradeOrderStatusLabel` in lib/web-cart.ts): to a buyer a placed order is
 * "waiting for an answer"; to the supplier the same order is one "to answer".
 */

export type SupplierOrderStage = "to_answer" | "to_dispatch" | "dispatched" | "closed";

/** Whose move it is. "nobody" means the order is finished. */
export type SupplierOrderTurn = "you" | "buyer" | "nobody";

export type SupplierOrderStatus = {
  stage: SupplierOrderStage;
  /** What the order is called in a list and in its heading. */
  label: string;
  turn: SupplierOrderTurn;
  /** What happens next, in one or two plain sentences. */
  next: string;
};

const UNKNOWN: SupplierOrderStatus = {
  stage: "closed",
  label: "Unknown",
  turn: "nobody",
  next: "",
};

const BY_STATUS: Record<string, SupplierOrderStatus> = {
  placed: {
    stage: "to_answer",
    label: "To answer",
    turn: "you",
    next: "Say how much of each line you can supply. Nothing leaves your stock until you answer.",
  },
  accepted: {
    stage: "to_dispatch",
    label: "Accepted, to dispatch",
    turn: "you",
    next: "Pack the order. Mark it dispatched when it leaves: that raises the invoice for what you accepted.",
  },
  part_accepted: {
    stage: "to_dispatch",
    label: "Accepted in part, to dispatch",
    turn: "you",
    next: "Pack what you accepted. Mark it dispatched when it leaves: that raises the invoice for what you accepted.",
  },
  dispatched: {
    stage: "dispatched",
    label: "Dispatched",
    turn: "buyer",
    next: "The goods have left and the invoice is raised. The buyer says what arrived. You have nothing to do unless they report a shortage.",
  },
  rejected: {
    stage: "closed",
    label: "Declined",
    turn: "nobody",
    next: "You supplied none of this order. No stock was taken and nothing is owed.",
  },
  cancelled: {
    stage: "closed",
    label: "Cancelled",
    turn: "nobody",
    next: "This order was called off. Any stock it held is back on your shelf.",
  },
};

export function supplierOrderStatus(status: string | null | undefined): SupplierOrderStatus {
  const known = BY_STATUS[(status ?? "").trim().toLowerCase()];
  return known ?? { ...UNKNOWN, label: (status ?? "Unknown").replace(/_/g, " ") };
}

/** "Your turn", "Buyer's turn" or "" for a finished order. Said in words; never by colour alone. */
export function supplierTurnLabel(turn: SupplierOrderTurn): string {
  if (turn === "you") return "Your turn";
  if (turn === "buyer") return "Buyer's turn";
  return "";
}

/** The stages an order list is sorted into, in the order work flows. */
export const SUPPLIER_ORDER_STAGES: { stage: SupplierOrderStage | "all"; label: string; empty: string }[] = [
  { stage: "to_answer", label: "To answer", empty: "No orders are waiting for your answer." },
  { stage: "to_dispatch", label: "To dispatch", empty: "Nothing is waiting to be dispatched." },
  { stage: "dispatched", label: "Dispatched", empty: "No orders are on their way." },
  { stage: "closed", label: "Declined or cancelled", empty: "No orders were declined or cancelled." },
  { stage: "all", label: "All", empty: "No trade orders yet. Buyers place them from your shop." },
];

export function inSupplierStage(status: string, stage: SupplierOrderStage | "all"): boolean {
  return stage === "all" || supplierOrderStatus(status).stage === stage;
}

/** The four steps every order passes through, for the line at the top of an order. */
const STEPS = ["Placed", "Answered", "Dispatched", "Received"] as const;

export type SupplierOrderStep = { label: string; state: "done" | "now" | "later" };

/**
 * Where an order is on its way from placed to received. `received` is true once the buying shop has said what
 * arrived (only known for an order sent to a connected shop). A declined or cancelled order has no steps left.
 */
export function supplierOrderSteps(status: string, received = false): SupplierOrderStep[] {
  const key = (status ?? "").trim().toLowerCase();
  if (key === "rejected" || key === "cancelled") return [];
  // How many steps are behind the order. The step after them is the one it is waiting on now.
  const done = key === "placed" ? 1 : key === "dispatched" ? (received ? 4 : 3) : 2;
  return STEPS.map((label, index) => ({
    label,
    state: index < done ? "done" : index === done ? "now" : "later",
  }));
}

/**
 * What the answer button says, from the quantities typed: it names what will happen, so nobody saves an answer
 * without knowing which answer it is.
 */
export function supplierAnswerAction(lines: { asked: number; supply: number }[]): {
  label: string;
  done: string;
  kind: "all" | "part" | "none";
} {
  const some = lines.some((l) => l.supply > 0);
  const all = lines.length > 0 && lines.every((l) => l.supply >= l.asked);
  if (!some) return { label: "Decline the order", done: "Order declined", kind: "none" };
  if (all) return { label: "Accept the whole order", done: "Order accepted", kind: "all" };
  return { label: "Accept in part", done: "Order accepted in part", kind: "part" };
}

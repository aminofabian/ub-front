export type ContactChallengeKind =
  | "TOTAL"
  | "CHANGE"
  | "DISCOUNT"
  | "MULTIPLY"
  | "MISSING"
  | "VAT"
  | "INVENTORY";

export type ContactTillLine = {
  label: string;
  qty: number;
  unitPrice: number;
};

export type ContactTillChallenge = {
  kind: ContactChallengeKind;
  title: string;
  blurb: string;
  lines: ContactTillLine[];
  metaRows: Array<{ label: string; value: string }>;
  askLabel: string;
  answerUnit: "KSh" | "";
  expectedAnswer: number;
  tendered?: number;
  percent?: number;
  baseAmount?: number;
  secondaryAmount?: number;
};

const PRODUCTS = [
  "Bread",
  "Eggs",
  "Milk",
  "Sugar",
  "Rice",
  "Soda",
  "Flour",
  "Soap",
  "Water",
  "Tea",
] as const;

const KINDS: ContactChallengeKind[] = [
  "TOTAL",
  "CHANGE",
  "DISCOUNT",
  "MULTIPLY",
  "MISSING",
  "VAT",
  "INVENTORY",
];

const UNIT_PRICES = [15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 85, 90, 100, 120, 150] as const;
const TENDER_OPTIONS = [100, 200, 500, 1000, 2000] as const;
const DISCOUNT_PERCENTS = [5, 10, 15, 20] as const;
const VAT_PERCENTS = [16] as const;

function pickOne<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)]!;
}

function pickInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function formatKsh(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

function lineTotal(lines: ContactTillLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
}

function uniqueProductLines(count: number): ContactTillLine[] {
  const labels = shuffle(PRODUCTS).slice(0, count);
  return labels.map((label) => ({
    label,
    qty: pickInt(1, label === "Eggs" || label === "Soda" ? 4 : 2),
    unitPrice: pickOne(UNIT_PRICES),
  }));
}

function pickTendered(total: number): number {
  const enough = TENDER_OPTIONS.filter((amount) => amount > total);
  if (enough.length > 0) return pickOne(enough);
  return Math.ceil((total + 40) / 50) * 50;
}

function makeTotal(): ContactTillChallenge {
  const lines = uniqueProductLines(pickInt(2, 3));
  return {
    kind: "TOTAL",
    title: "Cart total",
    blurb: "Add up the cart — quick till maths.",
    lines,
    metaRows: [],
    askLabel: "What's the total?",
    answerUnit: "KSh",
    expectedAnswer: lineTotal(lines),
  };
}

function makeChange(): ContactTillChallenge {
  const lines = uniqueProductLines(pickInt(2, 3));
  const total = lineTotal(lines);
  const tendered = pickTendered(total);
  return {
    kind: "CHANGE",
    title: "Change due",
    blurb: "Customer paid cash. How much change?",
    lines,
    metaRows: [{ label: "Paid", value: formatKsh(tendered) }],
    askLabel: "Change to give back?",
    answerUnit: "KSh",
    expectedAnswer: tendered - total,
    tendered,
  };
}

function makeDiscount(): ContactTillChallenge {
  const baseAmount = pickOne([200, 300, 400, 500, 600, 800, 1000] as const);
  const percent = pickOne(DISCOUNT_PERCENTS);
  const expectedAnswer = baseAmount - (baseAmount * percent) / 100;
  return {
    kind: "DISCOUNT",
    title: "Discount",
    blurb: "Apply the discount, then take payment.",
    lines: [],
    metaRows: [
      { label: "Goods", value: formatKsh(baseAmount) },
      { label: "Discount", value: `${percent}%` },
    ],
    askLabel: "How much do they pay?",
    answerUnit: "KSh",
    expectedAnswer,
    baseAmount,
    percent,
  };
}

function makeMultiply(): ContactTillChallenge {
  const product = pickOne(PRODUCTS);
  const qty = pickInt(2, 5);
  const unitPrice = pickOne(UNIT_PRICES);
  const scanStyle = Math.random() < 0.45;
  const lines = [{ label: product, qty, unitPrice }];
  return {
    kind: "MULTIPLY",
    title: scanStyle ? "Barcode scan" : "Quantity × price",
    blurb: scanStyle
      ? `Same item scanned ${qty} times.`
      : `${qty} × ${product} at the till.`,
    lines,
    metaRows: scanStyle
      ? [{ label: "Scans", value: String(qty) }]
      : [],
    askLabel: "What's the total?",
    answerUnit: "KSh",
    expectedAnswer: qty * unitPrice,
  };
}

function makeMissing(): ContactTillChallenge {
  const lines = uniqueProductLines(2);
  const missingPrice = pickOne(UNIT_PRICES);
  const billTotal = lineTotal(lines) + missingPrice;
  return {
    kind: "MISSING",
    title: "Missing item",
    blurb: "One line fell off the receipt.",
    lines,
    metaRows: [
      { label: "Bill total", value: formatKsh(billTotal) },
      { label: "Missing", value: "?" },
    ],
    askLabel: "Missing item's price?",
    answerUnit: "KSh",
    expectedAnswer: missingPrice,
    baseAmount: billTotal,
  };
}

function makeVat(): ContactTillChallenge {
  const baseAmount = pickOne([200, 250, 400, 500, 800, 1000] as const);
  const percent = pickOne(VAT_PERCENTS);
  return {
    kind: "VAT",
    title: "VAT included",
    blurb: "Add VAT to get the final amount.",
    lines: [],
    metaRows: [
      { label: "Goods", value: formatKsh(baseAmount) },
      { label: "VAT", value: `${percent}%` },
    ],
    askLabel: "Final amount?",
    answerUnit: "KSh",
    expectedAnswer: baseAmount + (baseAmount * percent) / 100,
    baseAmount,
    percent,
  };
}

function makeInventory(): ContactTillChallenge {
  const start = pickInt(20, 80);
  const sold = pickInt(3, Math.min(25, start - 1));
  const product = pickOne(["bottles", "packets", "bars", "bags"] as const);
  return {
    kind: "INVENTORY",
    title: "Stock count",
    blurb: "Update the shelf after a sale.",
    lines: [],
    metaRows: [
      { label: "On hand", value: `${start} ${product}` },
      { label: "Sold", value: String(sold) },
    ],
    askLabel: "How many remain?",
    answerUnit: "",
    expectedAnswer: start - sold,
    baseAmount: start,
    secondaryAmount: sold,
  };
}

export function createContactTillChallenge(): ContactTillChallenge {
  const kind = pickOne(KINDS);
  switch (kind) {
    case "TOTAL":
      return makeTotal();
    case "CHANGE":
      return makeChange();
    case "DISCOUNT":
      return makeDiscount();
    case "MULTIPLY":
      return makeMultiply();
    case "MISSING":
      return makeMissing();
    case "VAT":
      return makeVat();
    case "INVENTORY":
      return makeInventory();
  }
}

export function contactChallengePayload(challenge: ContactTillChallenge) {
  return {
    challengeKind: challenge.kind,
    lines: challenge.lines.map((line) => ({
      qty: line.qty,
      unitPrice: line.unitPrice,
    })),
    tendered: challenge.tendered,
    percent: challenge.percent,
    baseAmount: challenge.baseAmount,
    secondaryAmount: challenge.secondaryAmount,
    challengeAnswer: challenge.expectedAnswer,
  };
}

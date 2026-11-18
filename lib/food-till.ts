/**
 * The cashier page of a restaurant, bar, café or takeaway: which house it is, the words that
 * house uses at the counter, and whether its lights start low. Pure, so the choices are tested
 * without a browser. The page is drawn by `components/restaurant/food-till.tsx`.
 */

export type FoodTillKind = "restaurant" | "bar" | "bar_kitchen" | "cafe" | "takeaway";
export type FoodTillLights = "day" | "night";

/**
 * Which house the counter speaks as (ADR 0031). A tenant that is BOTH a bar and a restaurant runs a
 * bar with a kitchen, so the counter names both rather than pretending it is bar-only; a bar alone is
 * the bar; then the sit-down house, the café, the takeaway. One till, one voice — the voice just
 * admits every food format the tenant runs.
 */
export function foodTillKind(storeTypes: readonly string[] | null | undefined): FoodTillKind {
  const types = new Set((storeTypes ?? []).map((t) => t.trim().toLowerCase()));
  if (types.has("bar") && types.has("restaurant")) return "bar_kitchen";
  if (types.has("bar")) return "bar";
  if (types.has("restaurant")) return "restaurant";
  if (types.has("cafe")) return "cafe";
  if (types.has("fast-food")) return "takeaway";
  return "restaurant";
}

/** What the counter calls its three columns and what it says when an order is paid. */
export type CounterVoice = {
  /** The till's name in its header. */
  till: string;
  /** Orders being made. */
  pass: string;
  passEmpty: string;
  /** How many are being made: "3 cooking". */
  making: string;
  /** The menu to ring from. */
  board: string;
  /** The order being rung. */
  order: string;
  orderEmpty: string;
  /** Said under the order number once it is paid. */
  sent: string;
  next: string;
};

export const COUNTER_VOICES: Record<FoodTillKind, CounterVoice> = {
  restaurant: {
    till: "Restaurant till",
    pass: "On the pass",
    passEmpty: "Nothing is being made. An order appears here the moment it is paid, and turns terracotta when the kitchen says it is ready.",
    making: "cooking",
    board: "The board",
    order: "This order",
    orderEmpty: "Tap the menu to start an order.",
    sent: "The kitchen has it. Give the customer this number.",
    next: "Next customer",
  },
  bar: {
    till: "Bar till",
    pass: "On the bar",
    passEmpty: "Nothing is being poured. A round appears here the moment it is paid, and turns terracotta when it is ready to carry.",
    making: "pouring",
    board: "The list",
    order: "This round",
    orderEmpty: "Tap a drink to start a round.",
    sent: "The bar has it. Give the customer this number.",
    next: "Next round",
  },
  bar_kitchen: {
    till: "Bar & kitchen till",
    pass: "On the bar and the pass",
    passEmpty: "Nothing is being made. An order appears here the moment it is paid, and turns terracotta when the bar or the kitchen says it is ready.",
    making: "being made",
    board: "The menu",
    order: "This order",
    orderEmpty: "Tap the menu to start an order.",
    sent: "The bar and the kitchen have it. Give the customer this number.",
    next: "Next customer",
  },
  cafe: {
    till: "Café till",
    pass: "Being made",
    passEmpty: "Nothing is being made. An order appears here the moment it is paid, and turns terracotta when it is ready to hand over.",
    making: "being made",
    board: "The board",
    order: "This order",
    orderEmpty: "Tap the board to start an order.",
    sent: "It is being made. Give the customer this number.",
    next: "Next customer",
  },
  takeaway: {
    till: "Takeaway till",
    pass: "On the pass",
    passEmpty: "Nothing is being made. An order appears here the moment it is paid, and turns terracotta when it is ready to bag.",
    making: "cooking",
    board: "The board",
    order: "This order",
    orderEmpty: "Tap the board to start an order.",
    sent: "The kitchen has it. Give the customer this number.",
    next: "Next customer",
  },
};

/**
 * Whether the lights start low. A bar works in the dark, where a white screen dazzles the person
 * pouring and lights up the room; any house may want the same once the sun is down. Kenya sits
 * on the equator: dusk is near 18:30 all year.
 */
export function defaultFoodTillLights(kind: FoodTillKind, hourInNairobi: number): FoodTillLights {
  if (kind === "bar") return "night";
  return hourInNairobi >= 19 || hourInNairobi < 6 ? "night" : "day";
}

/** The owner's own choice of lights on this device, if they made one. */
export function readFoodTillLights(saved: unknown): FoodTillLights | null {
  return saved === "day" || saved === "night" ? saved : null;
}

/** The hour of the day in Nairobi, whatever the device's own clock zone is set to. */
export function nairobiHour(now: Date): number {
  return (now.getUTCHours() + 3) % 24;
}

/** The time as a till shows it: 24-hour, Nairobi. */
export function nairobiClock(now: Date): string {
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  return `${String(nairobiHour(now)).padStart(2, "0")}:${minutes}`;
}

import { API_ROUTES } from "@/lib/config";
import { apiRequest } from "@/lib/api";

export type SokoMindContextPacket = {
  surface?: string;
  route?: string;
  locale?: string;
  entities?: Record<string, string>;
  uiHints?: string[];
};

export type SokoMindStatus = {
  enabled: boolean;
  guideEnabled: boolean;
  brainEnabled: boolean;
  eyeEnabled: boolean;
  providerConfigured: boolean;
  primaryProvider: string;
  defaultLocale: string;
};

export type SokoMindChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SokoMindChatResponse = {
  requestId: string;
  reply: string;
  skill: string;
  surface: string;
  suggestions: string[];
  provider: string;
  model: string;
  latencyMs: number;
  toolsUsed?: string[];
  usedLiveData?: boolean;
  draftBody?: string | null;
};

export type SokoMindRouteGuide = {
  surface: string;
  title: string;
  summary: string;
  suggestions: string[];
};

/** Map a dashboard pathname to a stable surface id for the Guide. */
export function surfaceFromPathname(pathname: string): string {
  const path = (pathname || "/").split("?")[0] || "/";
  if (path.startsWith("/business/settings")) return "business.settings";
  if (path === "/business" || path.startsWith("/business/")) return "business.hub";
  if (path.startsWith("/purchasing/ap-aging")) return "purchasing.ap";
  if (path.startsWith("/purchasing/record-payment")) return "purchasing.pay";
  if (path.startsWith("/purchasing/intelligence")) return "purchasing.intel";
  if (path === "/supplies" || path.startsWith("/supplies/")) return "purchasing.supplies";
  if (path.startsWith("/order")) return "ordering";
  if (path.startsWith("/inventory/stock-take")) return "inventory.stocktake";
  if (path.startsWith("/inventory/restock-digest")) return "inventory.restockdigest";
  if (path.startsWith("/inventory") || path.startsWith("/stock")) return "inventory.stock";
  if (path.startsWith("/pricing")) return "pricing";
  if (path.startsWith("/products")) return "products.catalog";
  if (path.startsWith("/item-types")) return "departments";
  if (path.startsWith("/categories")) return "categories";
  if (path.startsWith("/suppliers") || path.startsWith("/supplier/")) return "suppliers.ap";
  if (path.startsWith("/customers")) return "customers";
  if (path.startsWith("/credits")) return "credits";
  if (path.startsWith("/shifts")) return "shifts";
  if (path.startsWith("/messages")) return "messages";
  if (path.startsWith("/storefront")) return "storefront";
  if (path.startsWith("/sales")) return "sales";
  if (path.startsWith("/analytics")) return "analytics";
  if (path.startsWith("/discounts")) return "discounts";
  if (path.startsWith("/payments/day")) return "payments.day";
  if (path.startsWith("/payments/settings")) return "payments.settings";
  if (path.startsWith("/marketplace")) return "marketplace";
  if (path.startsWith("/supplier-portal")) return "supplier-portal";
  if (path.startsWith("/payroll")) return "payroll";
  if (path.startsWith("/users")) return "users";
  return "app.general";
}

export function buildSokoMindContext(
  pathname: string,
  opts?: {
    locale?: string;
    entities?: Record<string, string>;
    uiHints?: string[];
  },
): SokoMindContextPacket {
  return {
    surface: surfaceFromPathname(pathname),
    route: pathname,
    locale: opts?.locale ?? "en-KE",
    entities: opts?.entities,
    uiHints: opts?.uiHints,
  };
}

/** Pick skill from user text when the client does not force one. */
export function inferSokoMindSkill(message: string): string {
  const msg = message.toLowerCase();
  if (
    msg.includes("draft") ||
    msg.includes("compose") ||
    msg.includes("write a message") ||
    msg.includes("sms") ||
    msg.includes("whatsapp")
  ) {
    return "draft_message";
  }
  if (
    msg.includes("morning") ||
    msg.includes("briefing") ||
    msg.includes("how am i doing") ||
    msg.includes("today's numbers") ||
    msg.includes("daily summary")
  ) {
    return "morning_briefing";
  }
  return "explain_page";
}

/** POS / till surfaces — Guide stays off to protect scan focus. */
export function isSokoMindGuideHiddenRoute(pathname: string): boolean {
  const path = (pathname || "/").split("?")[0] || "/";
  return (
    path.startsWith("/cashier") ||
    path.startsWith("/grocery") ||
    path.startsWith("/butcher") ||
    path.startsWith("/sales/quick") ||
    path.startsWith("/supplier/")
  );
}

export async function fetchSokoMindStatus(): Promise<SokoMindStatus> {
  return apiRequest<SokoMindStatus>(API_ROUTES.aiStatus);
}

export async function fetchSokoMindRouteGuide(
  route: string,
  surface?: string,
): Promise<SokoMindRouteGuide> {
  const params = new URLSearchParams();
  if (route) params.set("route", route);
  if (surface) params.set("surface", surface);
  const qs = params.toString();
  return apiRequest<SokoMindRouteGuide>(
    `${API_ROUTES.aiRouteGuide}${qs ? `?${qs}` : ""}`,
  );
}

export type ProductPolishSuggestion = {
  requestId: string;
  summary: string;
  issues: string[];
  suggestedName: string | null;
  suggestedBrand: string | null;
  suggestedSize: string | null;
  suggestedDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryReason: string | null;
  itemTypeId: string | null;
  itemTypeName: string | null;
  itemTypeReason: string | null;
  suggestedSellPrice: number | null;
  suggestedCostPrice: number | null;
  pricingReason: string | null;
  suggestedMinStock: number | null;
  suggestedReorderLevel: number | null;
  suggestedReorderQty: number | null;
  stockReason: string | null;
};

/** AI review of a single product: name, description, category, pricing and stock tips. */
export async function polishProduct(itemId: string): Promise<ProductPolishSuggestion> {
  return apiRequest<ProductPolishSuggestion>(API_ROUTES.aiProductPolish, {
    method: "POST",
    body: { itemId: itemId.trim() },
  });
}

export type PriceRadarRecord = {
  itemId: string;
  itemName: string | null;
  cost: number | string | null;
  currentSell: number | string | null;
  ruleSuggestedSell: number | string | null;
  marginPercent: number | string | null;
  ruleName: string | null;
  globalRecommendedBuy: number | string | null;
  globalRecommendedSell: number | string | null;
  bandLow: number | string | null;
  bandMid: number | string | null;
  bandHigh: number | string | null;
  stance: string;
  rationale: string;
  signals: string[];
  note: string | null;
};

export async function fetchPriceRadar(
  itemId: string,
  opts?: { supplierId?: string; branchId?: string; unitCost?: number | null },
): Promise<PriceRadarRecord> {
  const params = new URLSearchParams({ itemId: itemId.trim() });
  if (opts?.supplierId?.trim()) params.set("supplierId", opts.supplierId.trim());
  if (opts?.branchId?.trim()) params.set("branchId", opts.branchId.trim());
  if (opts?.unitCost != null && Number.isFinite(opts.unitCost) && opts.unitCost > 0) {
    params.set("unitCost", String(opts.unitCost));
  }
  return apiRequest<PriceRadarRecord>(`${API_ROUTES.aiPriceRadar}?${params.toString()}`);
}

export async function sendSokoMindChat(body: {
  message: string;
  skill?: string;
  context?: SokoMindContextPacket;
  history?: SokoMindChatMessage[];
}): Promise<SokoMindChatResponse> {
  return apiRequest<SokoMindChatResponse>(API_ROUTES.aiChat, {
    method: "POST",
    body,
  });
}

export async function sendSokoMindFeedback(
  requestId: string,
  feedback: "up" | "down",
): Promise<void> {
  await apiRequest(API_ROUTES.aiFeedback, {
    method: "POST",
    body: { requestId, feedback },
  });
}

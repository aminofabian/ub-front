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
  if (path === "/business" || path.startsWith("/business/")) return "business.hub";
  if (path.startsWith("/products")) return "products.catalog";
  if (path.startsWith("/suppliers") || path.startsWith("/supplier/")) return "suppliers.ap";
  if (path.startsWith("/inventory") || path.startsWith("/stock")) return "inventory.stock";
  if (path.startsWith("/analytics")) return "analytics";
  if (path.startsWith("/marketplace")) return "marketplace";
  if (path.startsWith("/supplier-portal")) return "supplier-portal";
  if (path.startsWith("/payroll")) return "payroll";
  if (path.startsWith("/users")) return "users";
  return "app.general";
}

export function buildSokoMindContext(
  pathname: string,
  opts?: { locale?: string; entities?: Record<string, string>; uiHints?: string[] },
): SokoMindContextPacket {
  return {
    surface: surfaceFromPathname(pathname),
    route: pathname,
    locale: opts?.locale ?? "en-KE",
    entities: opts?.entities,
    uiHints: opts?.uiHints,
  };
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

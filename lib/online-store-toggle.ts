import type { BusinessRecord, StorefrontPatchPayload } from "@/lib/api";

export function firstCatalogBranchId(
  branches: { id: string; active?: boolean }[],
  currentId = "",
): string {
  if (currentId.trim()) return currentId.trim();
  const active = branches.filter((b) => b.active !== false);
  const pool = active.length > 0 ? active : branches;
  return pool[0]?.id ?? "";
}

export function buildOnlineStorePatch(input: {
  enabled: boolean;
  catalogBranchId: string;
}):
  | { ok: true; payload: StorefrontPatchPayload }
  | { ok: false; reason: "no-branch" } {
  if (!input.enabled) {
    return { ok: true, payload: { enabled: false } };
  }
  const catalogBranchId = input.catalogBranchId.trim();
  if (!catalogBranchId) {
    return { ok: false, reason: "no-branch" };
  }
  return { ok: true, payload: { enabled: true, catalogBranchId } };
}

export function withStorefrontEnabled(
  business: BusinessRecord,
  enabled: boolean,
  catalogBranchId?: string,
): BusinessRecord {
  const current = business.storefront;
  return {
    ...business,
    storefront: {
      enabled,
      featuredItemIds: current?.featuredItemIds ?? [],
      catalogBranchId:
        catalogBranchId ?? current?.catalogBranchId ?? null,
      label: current?.label,
      announcement: current?.announcement,
      deliveryAreas: current?.deliveryAreas,
      storeThemeId: current?.storeThemeId,
      landingTemplateId: current?.landingTemplateId,
      landingContent: current?.landingContent,
      whatsappCheckout: current?.whatsappCheckout,
      designJson: current?.designJson,
    },
  };
}

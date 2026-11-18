"use client";

import { apiRequest } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

/**
 * The business-type catalogue (ADR 0029). The type <em>codes</em> are a fixed enum defined in code
 * (see {@link ./business-store-type}); this is only their presentation — label, hint, image,
 * section, order, enabled — which Super Admin manages. The merchant-facing read is public and
 * returns enabled types only. Shapes mirror `docs/openapi/phase-1.yaml` (`BusinessTypeResponse`).
 */
export type BusinessType = {
  /** The store-format code, e.g. `bar`, `salon`, `lodging`. */
  code: string;
  label: string;
  hint: string | null;
  /** Display section: `food`, `service`, `lodging`, `shop`. */
  section: string;
  displayOrder: number;
  enabled: boolean;
  /** Secure image URL (R2/Cloudinary), served verbatim, or null when none is set. */
  imageUrl: string | null;
};

/**
 * The enabled, merged catalogue for merchant surfaces (onboarding, business hub, storefront).
 * Public — carries no tenant or customer data. Callers overlay this onto the built-in
 * `STORE_TYPE_OPTIONS` defaults so the UI still works offline / before this call resolves.
 */
export async function fetchBusinessTypes(): Promise<BusinessType[]> {
  return apiRequest<BusinessType[]>(API_ROUTES.publicBusinessTypes, { toast: false });
}

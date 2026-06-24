"use client";

import { API_ROUTES } from "@/lib/config";
import { apiRequest } from "@/lib/api";

export type GenerateProductDescriptionPayload = {
  name: string;
  categoryName?: string;
  brand?: string;
  size?: string;
  unitType?: string;
  variantName?: string;
  sku?: string;
  barcode?: string;
};

export type GenerateProductDescriptionResponse = {
  description: string;
};

export async function generateProductDescription(
  payload: GenerateProductDescriptionPayload,
): Promise<GenerateProductDescriptionResponse> {
  const name = payload.name?.trim();
  if (!name) {
    throw new Error("Product name is required to generate a description.");
  }
  const body: GenerateProductDescriptionPayload = { name };
  const optional = [
    "categoryName",
    "brand",
    "size",
    "unitType",
    "variantName",
    "sku",
  ] as const;
  for (const key of optional) {
    const value = payload[key]?.trim();
    if (value) {
      body[key] = value;
    }
  }
  return apiRequest<GenerateProductDescriptionResponse>(
    `${API_ROUTES.items}/generate-description`,
    { method: "POST", body, toast: false },
  );
}

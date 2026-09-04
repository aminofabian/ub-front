/**
 * Browser-local draft for the cashier Add product drawer.
 * Survives close / refresh so mid-entry name, options, and photo are not lost.
 */

import type { ItemSummaryRecord } from "@/lib/api";

export const CASHIER_CREATE_PRODUCT_DRAFT_PREFIX =
  "palmart:cashierCreateProduct:v1:";

export type CashierCreateProductDraftVariant = {
  key: string;
  label: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  stock: string;
  /** Optional option photo as a data URL. */
  imageDataUrl?: string | null;
};

export type CashierCreateProductDraft = {
  v: 1;
  updatedAt: number;
  branchId: string;
  purpose: "cart" | "receive";
  mode: "single" | "group";
  name: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  initialStockQty: string;
  itemTypeId: string;
  linkAsVariant: boolean;
  variantName: string;
  relatedItem: ItemSummaryRecord | null;
  groupVariants: CashierCreateProductDraftVariant[];
  /** data: URL for the pending photo (omitted when too large). */
  imageDataUrl?: string | null;
};

const MAX_IMAGE_DATA_URL_CHARS = 1_200_000;
/** Per-option thumbs stay smaller so a group draft fits in localStorage. */
const MAX_OPTION_IMAGE_DATA_URL_CHARS = 450_000;

function storageKey(branchId: string, purpose: string): string {
  return `${CASHIER_CREATE_PRODUCT_DRAFT_PREFIX}${purpose}:${branchId.trim() || "_"}`;
}

function trimOptionImages(
  rows: CashierCreateProductDraftVariant[],
): CashierCreateProductDraftVariant[] {
  return rows.map((r) => ({
    ...r,
    imageDataUrl:
      r.imageDataUrl &&
      r.imageDataUrl.length <= MAX_OPTION_IMAGE_DATA_URL_CHARS
        ? r.imageDataUrl
        : null,
  }));
}

export function loadCashierCreateProductDraft(
  branchId: string,
  purpose: "cart" | "receive",
): CashierCreateProductDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(branchId, purpose));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CashierCreateProductDraft;
    if (parsed?.v !== 1) return null;
    if (parsed.purpose !== purpose) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCashierCreateProductDraft(
  draft: Omit<CashierCreateProductDraft, "v" | "updatedAt"> & {
    imageDataUrl?: string | null;
  },
): void {
  if (typeof window === "undefined") return;
  const imageDataUrl =
    draft.imageDataUrl &&
    draft.imageDataUrl.length <= MAX_IMAGE_DATA_URL_CHARS
      ? draft.imageDataUrl
      : null;
  const payload: CashierCreateProductDraft = {
    ...draft,
    groupVariants: trimOptionImages(draft.groupVariants),
    v: 1,
    updatedAt: Date.now(),
    imageDataUrl,
  };
  try {
    window.localStorage.setItem(
      storageKey(draft.branchId, draft.purpose),
      JSON.stringify(payload),
    );
  } catch {
    // Quota or private mode — drop images and retry text-only once.
    try {
      window.localStorage.setItem(
        storageKey(draft.branchId, draft.purpose),
        JSON.stringify({
          ...payload,
          imageDataUrl: null,
          groupVariants: payload.groupVariants.map((r) => ({
            ...r,
            imageDataUrl: null,
          })),
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

export function clearCashierCreateProductDraft(
  branchId: string,
  purpose: "cart" | "receive",
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(branchId, purpose));
  } catch {
    /* ignore */
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(
  dataUrl: string,
  filename = "product-photo.jpg",
): File | null {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const data = dataUrl.slice(comma + 1);
    const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

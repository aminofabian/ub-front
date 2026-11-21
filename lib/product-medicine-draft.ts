/**
 * What the "new product" form holds about a medicine until the product exists. The medicine
 * record is a separate row keyed by the product, so it can only be saved after the product is.
 * Kept outside the product draft on purpose: it is not persisted between visits.
 */

import type { DispensingClass } from "@/lib/pharmacy-api";

export type ProductMedicineDraft = {
  /** The product being created is a medicine. */
  on: boolean;
  genericName: string;
  strength: string;
  dosageForm: string;
  dispensingClass: DispensingClass;
};

const EMPTY: ProductMedicineDraft = {
  on: false,
  genericName: "",
  strength: "",
  dosageForm: "",
  dispensingClass: "UNCLASSIFIED",
};

let current: ProductMedicineDraft = EMPTY;
const listeners = new Set<() => void>();

export const productMedicineDraft = {
  get: (): ProductMedicineDraft => current,
  set(patch: Partial<ProductMedicineDraft>) {
    current = { ...current, ...patch };
    for (const l of listeners) l();
  },
  reset() {
    if (current === EMPTY) return;
    current = EMPTY;
    for (const l of listeners) l();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

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
/** True while a pharmacy's new-product form is open, so the save step knows to look at medicines. */
let formOpen = false;
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
  /** Called by the form's medicine block when it appears and when it goes. */
  setFormOpen(open: boolean) {
    formOpen = open;
  },
  isFormOpen: (): boolean => formOpen,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

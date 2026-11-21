"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { MedicineStockDialog } from "@/components/pharmacy/medicine-stock-dialog";
import { MedicineEditor } from "@/components/pharmacy/pharmacy-medicines";
import { APP_ROUTES } from "@/lib/config";
import {
  DISPENSING_CLASSES,
  DISPENSING_CLASS_HINT,
  DISPENSING_CLASS_LABEL,
  fetchMedicineForItem,
  type DispensingClass,
  type MedicineRecord,
} from "@/lib/pharmacy-api";
import { hasPermission, Permission } from "@/lib/permissions";
import { productMedicineDraft } from "@/lib/product-medicine-draft";
import { cn } from "@/lib/utils";

/**
 * In the "new product" form of a pharmacy: says whether the product is a medicine and, if so,
 * what it is. The medicine record is saved right after the product. The caller passes its own
 * input and label classes so the block looks like the rest of that form.
 */
export function ProductCreateMedicineFields({
  inputClassName,
  labelClassName,
  className,
}: {
  inputClassName: string;
  labelClassName: string;
  className?: string;
}) {
  const draft = useSyncExternalStore(productMedicineDraft.subscribe, productMedicineDraft.get, productMedicineDraft.get);
  // A form opened afresh must not inherit the last product's answer.
  useEffect(() => {
    productMedicineDraft.setFormOpen(true);
    return () => {
      productMedicineDraft.setFormOpen(false);
      productMedicineDraft.reset();
    };
  }, []);

  const text = (key: "genericName" | "strength" | "dosageForm") => (e: React.ChangeEvent<HTMLInputElement>) =>
    productMedicineDraft.set({ [key]: e.target.value });

  return (
    <div className={cn("space-y-3", className)}>
      <label className="flex min-h-11 cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={draft.on}
          onChange={(e) => productMedicineDraft.set({ on: e.target.checked })}
        />
        <span>
          <span className="block text-[14px] font-medium text-[var(--catalog-ink,#15231f)]">This is a medicine</span>
          <span className={cn("block", labelClassName)}>
            It will need a lot number and expiry date when received, and is sold earliest expiry first.
            Leave this off for plasters, thermometers and the like.
          </span>
        </span>
      </label>
      {draft.on ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="create-med-generic" className={labelClassName}>
                Generic name
              </label>
              <input
                id="create-med-generic"
                className={inputClassName}
                value={draft.genericName}
                onChange={text("genericName")}
                maxLength={255}
                placeholder="e.g. Amoxicillin"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-med-strength" className={labelClassName}>
                Strength
              </label>
              <input
                id="create-med-strength"
                className={inputClassName}
                value={draft.strength}
                onChange={text("strength")}
                maxLength={64}
                placeholder="e.g. 500 mg"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-med-form" className={labelClassName}>
                Dosage form
              </label>
              <input
                id="create-med-form"
                className={inputClassName}
                value={draft.dosageForm}
                onChange={text("dosageForm")}
                maxLength={64}
                placeholder="e.g. Capsule"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="create-med-class" className={labelClassName}>
                How it is sold
              </label>
              <select
                id="create-med-class"
                className={inputClassName}
                value={draft.dispensingClass}
                onChange={(e) => productMedicineDraft.set({ dispensingClass: e.target.value as DispensingClass })}
              >
                {DISPENSING_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c === "UNCLASSIFIED" ? "Decide later (cannot be sold until then)" : DISPENSING_CLASS_LABEL[c]}
                  </option>
                ))}
              </select>
              <p className={labelClassName}>{DISPENSING_CLASS_HINT[draft.dispensingClass]}</p>
            </div>
          </div>
          <p className={labelClassName}>
            Stock is not added here for a medicine. After saving, use Add stock on the product, where you
            enter its lot number and expiry date.
          </p>
        </>
      ) : null}
    </div>
  );
}

/**
 * On a product's page in a pharmacy: whether the product is a medicine, its class, and a way to
 * change either without going to the Pharmacy workspace.
 */
export function ProductMedicineSection({
  itemId,
  itemName,
  canManage,
  className,
  labelClassName,
  onStockAdded,
}: {
  itemId: string;
  itemName: string;
  canManage: boolean;
  /** So the page around it can re-read the product's stock. */
  onStockAdded?: () => void;
  className?: string;
  labelClassName?: string;
}) {
  const [medicine, setMedicine] = useState<MedicineRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<MedicineRecord | null>(null);
  const [stocking, setStocking] = useState(false);
  const { me } = useDashboard();
  const canAddStock = hasPermission(me?.permissions, Permission.InventoryWrite);

  const load = useCallback(() => {
    let alive = true;
    fetchMedicineForItem(itemId)
      .then((m) => {
        if (alive) setMedicine(m);
      })
      .then(() => {
        if (alive) setLoaded(true);
      })
      .catch(() => {
        // Unknown is not the same as "not a medicine": show nothing rather than offer to mark it.
        if (alive) setLoaded(false);
      });
    return () => {
      alive = false;
    };
  }, [itemId]);

  useEffect(() => {
    setLoaded(false);
    setMedicine(null);
    return load();
  }, [load]);

  if (!loaded) return null;
  if (!medicine && !canManage) return null;

  const blank: MedicineRecord = {
    itemId,
    name: itemName,
    sku: null,
    barcode: null,
    itemTypeId: null,
    genericName: null,
    strength: null,
    dosageForm: null,
    packSize: null,
    manufacturer: null,
    registrationNo: null,
    storageNote: null,
    dispensingClass: "UNCLASSIFIED",
    restockOnRefund: false,
    classSetAt: null,
  };
  const described = medicine
    ? [medicine.genericName, medicine.strength, medicine.dosageForm?.toLowerCase()].filter(Boolean).join(" ")
    : "";
  const blocked = medicine?.dispensingClass === "UNCLASSIFIED";
  const buttonClass =
    "inline-flex h-11 shrink-0 items-center border border-foreground/15 px-3 text-[13px] font-medium text-foreground hover:bg-foreground/[0.04] sm:h-9";

  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className={labelClassName}>Medicine</p>
          {medicine ? (
            <>
              <p className={cn("mt-1 text-[14px] font-medium", blocked ? "text-[#8a4129]" : "text-foreground")}>
                {blocked ? "No class set. It cannot be sold yet." : DISPENSING_CLASS_LABEL[medicine.dispensingClass]}
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                {described || "No generic name recorded."}
                {blocked && medicine.suggestedClass
                  ? ` The catalogue suggests ${DISPENSING_CLASS_LABEL[medicine.suggestedClass].toLowerCase()}.`
                  : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              Not marked as a medicine. It sells like any other product.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <button type="button" className={buttonClass} onClick={() => setEditing(medicine ?? blank)}>
              {medicine ? (blocked ? "Set the class" : "Edit") : "Mark as a medicine"}
            </button>
          ) : null}
          {medicine && canAddStock ? (
            <button type="button" className={buttonClass} onClick={() => setStocking(true)}>
              Add stock
            </button>
          ) : null}
          {medicine ? (
            <Link
              href={`${APP_ROUTES.pharmacy}?tab=stock`}
              className="inline-flex min-h-11 items-center text-[13px] font-medium text-foreground underline underline-offset-4 sm:min-h-9"
            >
              Stock safety
            </Link>
          ) : null}
        </div>
      </div>
      {stocking ? (
        <MedicineStockDialog
          medicines={[{ itemId, name: itemName }]}
          onClose={() => setStocking(false)}
          onSaved={() => {
            setStocking(false);
            onStockAdded?.();
          }}
        />
      ) : null}
      {editing ? (
        <MedicineEditor
          medicine={editing}
          isNew={!medicine}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </section>
  );
}

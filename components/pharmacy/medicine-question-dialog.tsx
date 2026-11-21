"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";

/**
 * Asked before the quick "new product" sheet in a pharmacy. A medicine made there would have no
 * class, lot or expiry, so a medicine is sent to Products (or to the pharmacist). The usual
 * answer, "No", is the filled button: most things added at a till are not medicines.
 */
export function MedicineQuestionDialog({
  canAddMedicines,
  style,
  onNotMedicine,
  onClose,
}: {
  /** The person can mark medicines and add products, so Products is somewhere they can finish. */
  canAddMedicines: boolean;
  style?: CSSProperties;
  onNotMedicine: () => void;
  onClose: () => void;
}) {
  const [isMedicine, setIsMedicine] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent side="center" className="sm:max-w-md" style={style}>
        <DialogHeader className="text-left">
          <DialogTitle>
            {isMedicine
              ? canAddMedicines
                ? "Add it from Products"
                : "Ask your pharmacist to add it"
              : "Is this a medicine?"}
          </DialogTitle>
          <DialogDescription>
            {isMedicine
              ? canAddMedicines
                ? "There you say what it is and how it is sold. Then receive its stock with a lot number and expiry date."
                : "A medicine needs a class, a lot number and an expiry date before it can be sold. Only someone who manages the pharmacy can set those."
              : "Medicines are added from Products, where they get a class, a lot number and an expiry date. Anything else can be added here."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          {isMedicine ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              {canAddMedicines ? (
                <Button type="button" asChild>
                  <Link href={APP_ROUTES.products}>Open Products</Link>
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setIsMedicine(true)}>
                Yes, a medicine
              </Button>
              <Button type="button" onClick={onNotMedicine}>
                No, something else
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

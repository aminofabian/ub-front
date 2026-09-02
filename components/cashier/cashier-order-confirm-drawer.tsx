"use client";

import { ClipboardCheck } from "lucide-react";

import { OrderReceivePanel } from "@/app/(dashboard)/order/_components/order-receive-panel";
import { FormDrawer } from "@/components/form-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Full-screen cashier drawer for confirming Path A purchase orders. */
export function CashierOrderConfirmDrawer({ open, onOpenChange }: Props) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm supply"
      description="Mark goods as received for open purchase orders."
      contextLabel="Receiving"
      icon={<ClipboardCheck className="size-4" aria-hidden />}
      width="full"
      appearance="sharp"
      headerDensity="compact"
      bodyLayout="fill"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <OrderReceivePanel
          embedded
          onConfirmed={() => {
            /* stay in drawer so the cashier can confirm the next PO */
          }}
        />
      </div>
    </FormDrawer>
  );
}

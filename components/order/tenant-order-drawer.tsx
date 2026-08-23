"use client";

import { ShoppingCart } from "lucide-react";

import { TenantOrderWorkspace } from "@/app/(dashboard)/order/_components/tenant-order-workspace";
import { FormDrawer } from "@/components/form-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the Confirm (receive) drawer instead of navigating away. */
  onOpenConfirm?: () => void;
};

/** Full-screen drawer: supplier Order workspace (Path A place + WhatsApp). */
export function TenantOrderDrawer({
  open,
  onOpenChange,
  onOpenConfirm,
}: Props) {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Order"
      description="Build a supplier order, save the PO, and WhatsApp it."
      contextLabel="Procurement"
      icon={<ShoppingCart className="size-4" aria-hidden />}
      width="full"
      appearance="sharp"
      headerDensity="compact"
      bodyLayout="fill"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {open ? (
          <TenantOrderWorkspace
            embedded
            onOpenConfirm={
              onOpenConfirm
                ? () => {
                    onOpenChange(false);
                    onOpenConfirm();
                  }
                : undefined
            }
          />
        ) : null}
      </div>
    </FormDrawer>
  );
}

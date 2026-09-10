"use client";

import { PackageCheck } from "lucide-react";

import { TenantOrderWorkspace } from "@/app/(dashboard)/order/_components/tenant-order-workspace";
import { FormDrawer } from "@/components/form-drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the Confirm (receive) drawer instead of navigating away. */
  onOpenConfirm?: () => void;
};

/** Half-width drawer: supplier Order workspace (Path A place + WhatsApp). */
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
      description="Pick a supplier, build the slip, then save or WhatsApp."
      contextLabel="Suppliers"
      icon={<PackageCheck className="size-4" aria-hidden />}
      width="half"
      appearance="sharp"
      headerDensity="compact"
      bodyLayout="fill"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--order-shelf,#ffffff)]">
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

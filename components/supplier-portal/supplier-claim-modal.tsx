"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supplierPortalClaimPath } from "@/lib/marketplace-url";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  autoSendCode?: boolean;
};

/** Opens the full-page stall sign-up. Kept so existing call sites still work. */
export function SupplierClaimModal({
  open,
  onOpenChange,
  initialPhone,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    onOpenChange(false);
    router.push(supplierPortalClaimPath(initialPhone));
  }, [open, initialPhone, onOpenChange, router]);

  return null;
}

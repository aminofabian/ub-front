"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShopperPhoneLogin } from "@/components/storefront/shop-phone-login";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  suggestedName?: string;
  onSignedIn?: (tabPhone: string) => void;
  onContinueAsGuest?: () => void;
};

export function ShopCheckoutPhoneModal({
  open,
  onOpenChange,
  initialPhone,
  suggestedName,
  onSignedIn,
  onContinueAsGuest,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[90] max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg"
        overlayClassName="z-[89]"
      >
        <div className="border-b border-border/60 px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl tracking-tight">
              Your number is your account
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed">
              If you already have a tab at this shop, verify the phone and enter
              your PIN. No second signup.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <ShopperPhoneLogin
            key={`${open}-${initialPhone ?? ""}`}
            initialPhone={initialPhone}
            suggestedName={suggestedName}
            onSignedIn={(tabPhone) => {
              onOpenChange(false);
              onSignedIn?.(tabPhone);
            }}
            footer={
              onContinueAsGuest ? (
                <button
                  type="button"
                  className="mt-4 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    onOpenChange(false);
                    onContinueAsGuest();
                  }}
                >
                  Continue as guest
                </button>
              ) : null
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

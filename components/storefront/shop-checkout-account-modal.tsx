"use client";

import { UnifiedSignInForm } from "@/components/storefront/storefront-sign-in-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  onSignedIn?: () => void;
  onContinueAsGuest?: () => void;
};

/**
 * Checkout account door. It renders the storefront's single sign-in component
 * (`UnifiedSignInForm`) — the same one the header sheet and the account page use —
 * so phone/email/PIN behaves identically wherever a shopper signs in.
 */
export function ShopCheckoutAccountModal({
  open,
  onOpenChange,
  initialPhone,
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
              Sign in or create an account
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed">
              Use your phone or email. We&apos;ll save your details and keep this
              order on your account — or continue as a guest.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <UnifiedSignInForm
            key={`${open}-${initialPhone ?? ""}`}
            initialPhone={initialPhone}
            nextPath={APP_ROUTES.shopCheckout}
            onSignedIn={() => {
              onOpenChange(false);
              onSignedIn?.();
            }}
          />
          {onContinueAsGuest ? (
            <button
              type="button"
              className="mt-4 w-full text-center text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => {
                onOpenChange(false);
                onContinueAsGuest();
              }}
            >
              Continue as guest
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

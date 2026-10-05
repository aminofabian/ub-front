"use client";

import { toast } from "sonner";

import { showConfirmModal } from "@/components/confirm-modal";

export {
  showConfirmModal,
  showConfirmModal as showThemedConfirmToast,
  type ConfirmModalOptions,
  type ConfirmModalOptions as ThemedConfirmToastOptions,
} from "@/components/confirm-modal";

const themedToastClassNames = {
  toast:
    "font-sans !items-center !justify-center text-center border-border/80 bg-card shadow-lg",
  title: "font-heading text-base font-semibold tracking-tight !text-center",
  description: "font-sans text-sm !text-center text-muted-foreground",
};

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

/** In-app replacement for the browser “Open Phone?” protocol prompt. */
export function showOpenPhoneToast(phone: string) {
  const display = phone.trim();
  const tel = display.replace(/[\s()-]/g, "");
  if (!tel) return;

  const canDialHere = MOBILE_UA.test(navigator.userAgent);

  showConfirmModal({
    id: `open-phone-${tel}`,
    title: "Open Phone?",
    description: canDialHere
      ? `Call ${display}?`
      : `${display}\n\nCopy the number to dial from your phone.`,
    confirmLabel: canDialHere ? "Open Phone" : "Copy number",
    confirmVariant: "default",
    onConfirm: () => {
      if (canDialHere) {
        window.location.href = `tel:${tel}`;
        return;
      }
      void navigator.clipboard.writeText(display).then(
        () => toast.success("Phone number copied"),
        () => toast.error("Could not copy number"),
      );
    },
  });
}

export function showThemedSuccessToast(message: string) {
  toast.success(message, { classNames: themedToastClassNames });
}

export function showThemedErrorToast(message: string) {
  toast.error(message, { classNames: themedToastClassNames });
}

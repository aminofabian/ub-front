"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ThemedConfirmToastOptions = {
  id: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

const toastCardClass =
  "pointer-events-auto w-full max-w-md rounded-2xl border border-border/80 bg-card px-6 py-5 text-center shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

const themedToastClassNames = {
  toast:
    "font-sans !items-center !justify-center text-center border-border/80 bg-card shadow-lg",
  title: "font-heading text-base font-semibold tracking-tight !text-center",
  description: "font-sans text-sm !text-center text-muted-foreground",
};

function ConfirmToastCard({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className={cn(toastCardClass, "border-t-[3px] border-t-primary")}
      role="alertdialog"
      aria-labelledby="confirm-toast-title"
      aria-describedby="confirm-toast-desc"
    >
      <p
        id="confirm-toast-title"
        className="font-heading text-xl font-semibold tracking-tight text-foreground"
      >
        {title}
      </p>
      <p
        id="confirm-toast-desc"
        className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground"
      >
        {description}
      </p>
      <ConfirmToastCardActions
        confirmLabel={confirmLabel}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function ConfirmToastCardActions({
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}

/** Centered delete/archive confirmation styled with brand fonts and primary accent. */
export function showThemedConfirmToast({
  id,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: ThemedConfirmToastOptions) {
  toast.custom(
    (toastId) => (
      <ConfirmToastCard
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        onCancel={() => toast.dismiss(toastId)}
        onConfirm={() => {
          toast.dismiss(toastId);
          void onConfirm();
        }}
      />
    ),
    { id, duration: Infinity },
  );
}

export function showThemedSuccessToast(message: string) {
  toast.success(message, { classNames: themedToastClassNames });
}

export function showThemedErrorToast(message: string) {
  toast.error(message, { classNames: themedToastClassNames });
}

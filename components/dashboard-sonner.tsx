"use client";

import { Toaster } from "sonner";

type DashboardToasterProps = {
  /** Center toasts and apply brand heading/body fonts (super-admin console). */
  centered?: boolean;
};

export function DashboardToaster({ centered = false }: DashboardToasterProps) {
  return (
    <Toaster
      richColors={!centered}
      closeButton
      position={centered ? "top-center" : "top-right"}
      toastOptions={
        centered
          ? {
              classNames: {
                toast:
                  "font-sans !items-center !justify-center text-center border-border/80 bg-card shadow-lg",
                title:
                  "font-heading text-base font-semibold tracking-tight !text-center",
                description:
                  "font-sans text-sm !text-center text-muted-foreground",
              },
            }
          : undefined
      }
    />
  );
}

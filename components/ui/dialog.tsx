"use client";

import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = RadixDialog.Root;
const DialogTrigger = RadixDialog.Trigger;
const DialogClose = RadixDialog.Close;
const DialogPortal = RadixDialog.Portal;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className, ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/45 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

const dialogContentVariants = cva(
  "fixed z-50 flex flex-col gap-4 bg-background shadow-xl outline-none focus:outline-none",
  {
    variants: {
      side: {
        center:
          "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 " +
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        right:
          "right-0 top-0 h-full w-full max-w-md border-l " +
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right " +
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
        bottom:
          "bottom-0 left-0 right-0 h-[85vh] max-h-[85vh] rounded-t-2xl border-t " +
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom " +
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
      },
    },
    defaultVariants: {
      side: "center",
    },
  },
);

type DialogContentProps = React.ComponentPropsWithoutRef<typeof RadixDialog.Content> &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
  };

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  DialogContentProps
>(({ className, children, side = "center", showCloseButton = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(dialogContentVariants({ side }), className)}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <RadixDialog.Close
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <X className="size-4" />
        </RadixDialog.Close>
      ) : null}
    </RadixDialog.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

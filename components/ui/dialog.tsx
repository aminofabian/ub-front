"use client";

import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { SheetGrabber, useSheetDragDismiss } from "@/components/ui/sheet-drag";

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
      // Solid rgba first so Chrome 109 / Win7 always get a visible scrim.
      // Soft blur is progressive enhancement only (can look invisible when
      // `color-mix` / translucent utilities fail on legacy Chromium).
      "fixed inset-0 z-50 bg-[rgba(18,26,22,0.38)]",
      "supports-[backdrop-filter]:bg-[rgba(18,26,22,0.28)] supports-[backdrop-filter]:backdrop-blur-[3px]",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

const dialogContentVariants = cva(
  "premium-portal fixed z-50 flex flex-col gap-4 bg-[var(--op-surface,var(--background))] outline-none focus:outline-none",
  {
    variants: {
      side: {
        center:
          "left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-[var(--op-rule,var(--border))] p-5 shadow-[0_24px_64px_-24px_rgba(18,26,22,0.3)] " +
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        right:
          "inset-y-0 right-0 h-[100dvh] max-h-[100dvh] w-[min(100%,28rem)] max-w-full overflow-hidden border-l border-[var(--op-rule,var(--border))] " +
          // Solid background — older Chromium on Windows 10 (and any setup
          // without `backdrop-filter` support) would otherwise let page text
          // bleed through the panel.
          "bg-[var(--op-surface,var(--background))] shadow-[-20px_0_56px_-28px_rgba(18,26,22,0.22)] " +
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] " +
          "dark:border-border/80 dark:bg-background dark:shadow-[-20px_0_56px_-28px_rgba(0,0,0,0.5)] " +
          "sm:rounded-l-[2px] " +
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right " +
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right " +
          "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        left:
          "inset-y-0 left-0 h-[100dvh] max-h-[100dvh] w-[min(100%,24.5rem)] max-w-full overflow-hidden border-r border-[var(--op-rule,var(--border))] " +
          "bg-[var(--op-surface,var(--background))] shadow-[20px_0_56px_-28px_rgba(18,26,22,0.22)] " +
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] " +
          "dark:border-border/80 dark:bg-background dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),24px_0_80px_-24px_rgba(0,0,0,0.45)] " +
          "sm:rounded-r-[2px] " +
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-left " +
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left " +
          "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        bottom:
          "bottom-0 left-0 right-0 flex max-h-[min(92dvh,40rem)] w-full flex-col overflow-hidden " +
          "rounded-t-[2px] border border-[var(--op-rule,var(--border))] border-b-0 bg-[var(--op-surface,var(--background))] " +
          "pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_-24px_rgba(18,26,22,0.22)] " +
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom " +
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom " +
          "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
      },
    },
    defaultVariants: {
      side: "center",
    },
  },
);

/**
 * Phone bottom-sheet override for a centred dialog. Append to a `DialogContent`
 * `className` so that below `sm` the panel docks to the bottom of the screen
 * instead of floating centred. Desktop (`sm`+) is unchanged.
 */
export const PHONE_BOTTOM_SHEET =
  "max-sm:!bottom-0 max-sm:!left-0 max-sm:!right-0 max-sm:!top-auto " +
  "max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!w-full max-sm:!max-w-none " +
  "max-sm:!max-h-[92dvh] max-sm:!pb-[env(safe-area-inset-bottom)]";

type DialogContentProps = React.ComponentPropsWithoutRef<typeof RadixDialog.Content> &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
    /** Merged into `DialogOverlay` (e.g. lighter scrim for right-edge sheets). */
    overlayClassName?: string;
    /**
     * Phone sheet behaviour for `side="bottom"`: renders a draggable grabber
     * handle and lets the guest swipe the sheet away. Opt in from the phone
     * branch of a drawer so edge/center panels are unaffected.
     */
    sheetDrag?: boolean;
  };

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      side = "center",
      showCloseButton = true,
      overlayClassName,
      sheetDrag = false,
      ...props
    },
    ref,
  ) => {
    const dragEnabled = side === "bottom" && sheetDrag;
    const pathname = usePathname();
    const cashierModal = pathname.startsWith("/cashier");
    const closeRef = React.useRef<HTMLButtonElement | null>(null);
    const { panelRef, grabberProps, dragging } = useSheetDragDismiss({
      enabled: dragEnabled,
      onDismiss: () => closeRef.current?.click(),
    });
    const setPanelRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        panelRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [panelRef, ref],
    );

    return (
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <RadixDialog.Content
          ref={setPanelRef}
          {...(dragEnabled ? { "data-phone-sheet": "" } : {})}
          className={cn(
            dialogContentVariants({ side }),
            cashierModal && "cashier-premium-modal",
            className,
          )}
          {...props}
        >
          {dragEnabled ? (
            <>
              <SheetGrabber {...grabberProps} dragging={dragging} />
              {/* Lets the drag gesture use Radix's own close path. */}
              <RadixDialog.Close
                ref={closeRef}
                tabIndex={-1}
                aria-hidden
                className="hidden"
              />
            </>
          ) : null}
          {children}
          {showCloseButton ? (
            <RadixDialog.Close
              aria-label="Close"
              className="absolute right-3 top-3 z-50 inline-flex size-8 items-center justify-center rounded-[2px] border border-[var(--op-rule,var(--border))] bg-[var(--op-surface,var(--background))] text-[var(--op-muted,var(--muted-foreground))] transition-colors hover:border-[var(--op-accent,#1D4B3B)] hover:text-[var(--op-accent,#1D4B3B)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--op-accent,#1D4B3B)]/30"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          ) : null}
        </RadixDialog.Content>
      </DialogPortal>
    );
  },
);
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
>(({ className, style, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn(
      "text-[1.5rem] font-normal leading-tight tracking-[-0.02em] text-[var(--op-ink,var(--foreground))]",
      className,
    )}
    style={{
      fontFamily:
        'var(--font-cormorant), Georgia, "Times New Roman", serif',
      ...style,
    }}
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
    className={cn(
      "text-[13px] leading-relaxed text-[var(--op-muted,var(--muted-foreground))]",
      className,
    )}
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

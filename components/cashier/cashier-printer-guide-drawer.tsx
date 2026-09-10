"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import { helpHostUrl } from "@/lib/help/help-url";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Plug the thermal printer in",
    body: "Power on, seat the roll shiny-side to the head, data USB into this till PC. Hold FEED while powering on for a self-test.",
    src: "/help/printer-pick-and-connect.svg",
    alt: "Thermal receipt printer with USB as the default connection",
  },
  {
    title: "Device Manager is a peephole",
    body: "USB Printing Support, POS-80, or a COM port only proves the cable woke the printer. Detect never looks there. It only lists Settings → Printers & scanners.",
    src: "/help/printer-device-manager-vs-queue.svg",
    alt: "Device Manager versus Printers and scanners — Detect only reads the queue list",
  },
  {
    title: "Hire the Xprinter as a queue",
    body: "If Detect is empty: Add a printer → isn’t listed → USB001 or the COM port → Generic / Text Only → name it Xprinter, set Online.",
    src: "/help/printer-windows-add-queue.svg",
    alt: "Windows Add printer wizard for a Generic Text Only queue named Xprinter",
  },
  {
    title: "Download the helper from Cashier",
    body: "The Print Bridge lives on this till chip — not Settings, not WhatsApp. Tap Receipts on screen → Connect a printer → Download, then run it on this PC.",
    src: "/help/printer-cashier-connect.svg",
    alt: "Cashier till strip showing Download for Windows as the only Print Bridge doorway",
  },
  {
    title: "Read the Detect toast once",
    body: "Helper not running → open http://127.0.0.1:19500/health, then install from Cashier. No print queues found → add the Windows queue first. Until Xprinter sits under Printers & scanners, Detect is blind.",
    src: "/help/printer-detect-toasts.svg",
    alt: "Two Detect toasts: printer helper not running versus no print queues found",
  },
  {
    title: "Print a test slip",
    body: "The chip should show the printer name. Ring a cheap item. Paper should feed and cut. Blank grey usually means the roll is backwards.",
    src: "/help/printer-first-receipt.svg",
    alt: "Thermal printer with a first test receipt hanging",
  },
] as const;

type CashierPrinterGuideDrawerProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close the guide and open the till’s Connect a printer tools. */
  onStartSetup?: () => void;
};

/**
 * Owner/admin walkthrough for connecting a receipt printer. Opens a right-edge
 * drawer on the till so they never leave Cashier. Full article lives on the
 * host help site.
 */
export function CashierPrinterGuideDrawer({
  trigger,
  open: openProp,
  onOpenChange,
  onStartSetup,
}: CashierPrinterGuideDrawerProps) {
  const guideUrl = helpHostUrl(APP_ROUTES.helpInstallPrinter);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [index, setIndex] = useState(0);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 640px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = STEPS[index]!;
  const last = index >= STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={desktop}
        className={cn(
          "gap-0 p-0",
          !desktop && "max-h-[min(92dvh,44rem)] rounded-t-[1.25rem] bg-[#FBF9F5]",
        )}
      >
        {!desktop ? (
          <div className="flex shrink-0 justify-center pt-2" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-[#D1D5DB]" />
          </div>
        ) : null}
        <div className="flex min-h-0 flex-col overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DialogHeader className={desktop ? "pr-10" : undefined}>
            <DialogTitle className="text-lg">
              Install a receipt printer
            </DialogTitle>
            <DialogDescription>
              Step {index + 1} of {STEPS.length} — from the box to a cut slip,
              without leaving the till.
            </DialogDescription>
          </DialogHeader>

          <figure className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- help SVGs are static public assets */}
            <img
              src={step.src}
              alt={step.alt}
              className="h-auto w-full"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <p className="mt-4 text-[13px] font-semibold tracking-tight text-foreground">
            {step.title}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {step.body}
          </p>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="mr-1 size-3.5" aria-hidden />
              Back
            </Button>
            <div className="flex items-center gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s.title}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    i === index ? "bg-primary" : "bg-muted-foreground/25",
                  )}
                />
              ))}
            </div>
            {last ? (
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => {
                  setOpen(false);
                  onStartSetup?.();
                }}
              >
                Connect on this till
                <ArrowRight className="ml-1 size-3.5" aria-hidden />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() =>
                  setIndex((i) => Math.min(STEPS.length - 1, i + 1))
                }
              >
                Next
                <ChevronRight className="ml-1 size-3.5" aria-hidden />
              </Button>
            )}
          </div>

          <Link
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 text-sm font-medium text-foreground transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-auto sm:rounded-lg sm:py-2.5"
          >
            <BookOpen className="size-4" aria-hidden />
            Full guide with every screenshot
            <ArrowRight
              className="size-4 transition group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            Opens on kiosk.ke — cashiers never see this drawer.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

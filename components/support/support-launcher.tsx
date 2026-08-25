"use client";

import * as React from "react";
import { Headset } from "lucide-react";
import { usePathname } from "next/navigation";

import { useOptionalRealtime } from "@/components/realtime-provider";
import { SupportChat } from "@/components/support/support-chat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSupportUnread } from "@/hooks/use-support-unread";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Floating support launcher — always-visible chat button in the dashboard.
 * Opens Kiosk Support as a left-edge drawer so the conversation feels like a
 * real help-desk thread without leaving the page.
 */
export function SupportLauncher() {
  const pathname = usePathname();
  const unread = useSupportUnread();
  const realtime = useOptionalRealtime();
  const [open, setOpen] = React.useState(false);

  // Close the drawer when navigating away (the page-level chat takes over).
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // The full chat page is already open — the launcher would be redundant.
  if (pathname === APP_ROUTES.support) {
    return null;
  }

  const live = realtime?.connectionState === "connected";
  const busy =
    realtime?.connectionState === "connecting" ||
    realtime?.connectionState === "reconnecting";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          side="left"
          showCloseButton={false}
          overlayClassName="bg-black/35 supports-[backdrop-filter]:bg-black/25 supports-[backdrop-filter]:backdrop-blur-[3px]"
          className="gap-0 overflow-hidden border-border/50 p-0 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[min(100%,25rem)] sm:rounded-r-2xl"
        >
          <DialogTitle className="sr-only">Kiosk Support</DialogTitle>
          <DialogDescription className="sr-only">
            Live chat with the Kiosk platform team.
          </DialogDescription>
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <SupportChat variant="drawer" onClose={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        title={open ? "Close support" : "Chat with Kiosk Support"}
        className={cn(
          "group fixed z-40 flex size-[3.6rem] items-center justify-center rounded-full text-primary-foreground outline-none transition-[transform,box-shadow,background-color] duration-200",
          "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-4 2xl:bottom-6 2xl:left-6",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open
            ? "bg-foreground shadow-[0_10px_28px_-12px_rgba(15,23,42,0.55)] hover:scale-[1.03]"
            : "bg-primary shadow-[0_14px_36px_-12px_rgba(40,167,69,0.65)] hover:scale-[1.06] hover:shadow-[0_18px_40px_-12px_rgba(40,167,69,0.7)]",
        )}
      >
        {unread > 0 && !open ? (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-primary opacity-30"
            aria-hidden
          />
        ) : null}

        <Headset
          className={cn("size-6", open ? "rotate-90 transition-transform" : "")}
          aria-hidden
        />

        <span
          className={cn(
            "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background",
            live ? "bg-emerald-400" : busy ? "bg-amber-400" : "bg-muted-foreground",
          )}
          title={live ? "Connected" : busy ? "Connecting…" : "Offline — updates automatically"}
          aria-hidden
        />

        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold leading-none text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </>
  );
}

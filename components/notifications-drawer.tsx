"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  HandCoins,
  MessageCircle,
  Package,
  ShoppingCart,
  X,
} from "lucide-react";

import { useOptionalRealtime } from "@/components/realtime-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSupportUnreadBreakdown } from "@/hooks/use-support-unread";
import {
  getNotificationPresentation,
  toClientNavigationHref,
} from "@/lib/notification-display";
import {
  CLOSE_NOTIFICATIONS_EVENT,
  OPEN_NOTIFICATIONS_EVENT,
  TOGGLE_NOTIFICATIONS_EVENT,
  requestCloseNotifications,
} from "@/lib/notifications-open";
import {
  isSupportChatAction,
  requestOpenSupportChat,
  supportPageHref,
} from "@/lib/support-open";
import { cn } from "@/lib/utils";

function notificationIcon(type: string) {
  if (type.startsWith("drawout.")) return HandCoins;
  if (type.startsWith("stock.") || type.startsWith("batch.") || type.startsWith("inventory."))
    return Package;
  if (type.includes("cart") || type.startsWith("storefront.") || type.startsWith("order."))
    return ShoppingCart;
  if (type.includes("variance") || type.includes("overdue") || type.includes("approval"))
    return AlertTriangle;
  if (type.startsWith("account.") || type.includes("support")) return MessageCircle;
  return Bell;
}

function isUnread(data: Record<string, unknown>): boolean {
  const readAt = data.readAt;
  return readAt == null || readAt === "";
}

/**
 * Single portaled notifications drawer for the tenant shell.
 * Bell buttons elsewhere only toggle this via window events — avoids the
 * fragile absolute popover that flickered inside sticky headers.
 */
export function NotificationsDrawer() {
  const rt = useOptionalRealtime();
  const support = useSupportUnreadBreakdown();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const notifications = rt?.notifications ?? [];
  const markAllRead = rt?.markAllRead;
  const markRead = rt?.markRead;
  const notificationUnread = rt?.unreadCount ?? 0;

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onToggle = () => setOpen((value) => !value);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
    window.addEventListener(CLOSE_NOTIFICATIONS_EVENT, onClose);
    window.addEventListener(TOGGLE_NOTIFICATIONS_EVENT, onToggle);
    return () => {
      window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen);
      window.removeEventListener(CLOSE_NOTIFICATIONS_EVENT, onClose);
      window.removeEventListener(TOGGLE_NOTIFICATIONS_EVENT, onToggle);
    };
  }, []);

  function openDestination(actionUrl: string) {
    if (isSupportChatAction(actionUrl)) {
      const href = toClientNavigationHref(actionUrl);
      if (href.startsWith("/support")) {
        router.push(href);
        return;
      }
      requestOpenSupportChat();
      return;
    }
    const href = toClientNavigationHref(actionUrl);
    if (!href) return;
    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href);
      return;
    }
    router.push(href);
  }

  function handleItemActivate(actionUrl: string, notificationId?: string) {
    requestCloseNotifications();
    if (notificationId) markRead?.(notificationId);
    // Let the dialog start closing before navigation / chat open.
    window.setTimeout(() => openDestination(actionUrl), 0);
  }

  const staffRows = notifications
    .filter((n) => n.type === "notification.created")
    .slice(0, 40);

  const hasSupportRows = support.platform > 0 || support.storefront > 0;
  const empty = staffRows.length === 0 && !hasSupportRows;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-black/30 supports-[backdrop-filter]:bg-black/20 supports-[backdrop-filter]:backdrop-blur-[2px]"
        className="gap-0 overflow-hidden border-border/50 p-0 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] sm:w-[min(100%,24rem)]"
      >
        <DialogTitle className="sr-only">Notifications</DialogTitle>
        <DialogDescription className="sr-only">
          Inbox of recent alerts for this shop.
        </DialogDescription>

        <div className="flex h-full min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Notifications</p>
              {notificationUnread + support.total > 0 ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {notificationUnread + support.total} unread
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">All caught up</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {notificationUnread > 0 && markAllRead ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <CheckCheck className="size-3.5" aria-hidden />
                  Mark all read
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {empty ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-muted-foreground">
                  Drawouts, stock alerts, and chats will land here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {support.platform > 0 ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        requestCloseNotifications();
                        window.setTimeout(() => requestOpenSupportChat({ tab: "platform" }), 0);
                      }}
                      className="flex w-full items-start gap-3 bg-primary/[0.06] px-4 py-3.5 text-left transition-colors hover:bg-primary/10"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <MessageCircle className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-snug">
                            New support message{support.platform > 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {support.platform > 9 ? "9+" : support.platform}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Open chat to reply to Kiosk
                        </span>
                      </span>
                    </button>
                  </li>
                ) : null}

                {support.storefront > 0 ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        requestCloseNotifications();
                        window.setTimeout(() => {
                          router.push(supportPageHref({ tab: "storefront" }));
                        }, 0);
                      }}
                      className="flex w-full items-start gap-3 bg-primary/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        <ShoppingCart className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-snug">
                            Storefront buyer chat{support.storefront > 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {support.storefront > 9 ? "9+" : support.storefront}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Open inbox to reply to shoppers
                        </span>
                      </span>
                    </button>
                  </li>
                ) : null}

                {staffRows.map((n) => {
                  const data = n.data as Record<string, unknown>;
                  const { title, body, actionUrl } = getNotificationPresentation(data);
                  const notificationType =
                    String(data.notificationType ?? data.type ?? "").trim();
                  const Icon = notificationIcon(notificationType);
                  const unread = isUnread(data);
                  const id = String(data.id ?? n.eventId ?? "");
                  const time = n.at
                    ? new Date(n.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <li key={n.eventId}>
                      <button
                        type="button"
                        onClick={() => handleItemActivate(actionUrl, id || undefined)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50",
                          unread && "bg-primary/[0.03]",
                          n.priority === "HIGH" && "bg-red-50/40 dark:bg-red-950/15",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                            unread
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm leading-snug line-clamp-2",
                                unread ? "font-semibold" : "font-medium text-foreground/90",
                              )}
                            >
                              {title}
                            </span>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {time}
                            </span>
                          </span>
                          {body ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                              {body}
                            </span>
                          ) : null}
                          {n.priority === "HIGH" ? (
                            <span className="mt-1.5 inline-block rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              High priority
                            </span>
                          ) : null}
                        </span>
                        {unread ? (
                          <span
                            className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

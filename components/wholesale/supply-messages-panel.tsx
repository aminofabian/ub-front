"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchSupplyMessageShops,
  fetchSupplyMessages,
  markSupplyMessageRead,
  sendSupplyMessage,
  type SupplyMessage,
  type SupplyMessageShop,
} from "@/lib/api";

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Messages between the supplier and the shops it supplies, one shop at a time. Choosing a shop shows what was
 * said, newest last, and marks what that shop sent as read. A message goes to the shop's own inbox.
 */
export function SupplyMessagesPanel() {
  const [shops, setShops] = useState<SupplyMessageShop[] | null>(null);
  const [messages, setMessages] = useState<SupplyMessage[]>([]);
  const [shopId, setShopId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([fetchSupplyMessageShops(), fetchSupplyMessages()])
      .then(([shopRows, messageRows]) => {
        setShops(shopRows);
        setMessages(messageRows);
        // Start on the shop with something unread, otherwise the first one.
        setShopId((current) => {
          if (current) return current;
          const unread = messageRows.find((m) => m.direction === "from_shop" && !m.readAt && m.localSupplierId);
          return unread?.localSupplierId ?? shopRows[0]?.localSupplierId ?? "";
        });
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const thread = messages
    .filter((m) => m.localSupplierId === shopId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Reading a shop's thread is what marks its messages read.
  useEffect(() => {
    const unread = messages.filter((m) => m.localSupplierId === shopId && m.direction === "from_shop" && !m.readAt);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    setMessages((all) => all.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, readAt: now } : m)));
    unread.forEach((m) => void markSupplyMessageRead(m.id).catch(() => undefined));
  }, [shopId, messages]);

  const unreadFor = (id: string) =>
    messages.filter((m) => m.localSupplierId === id && m.direction === "from_shop" && !m.readAt).length;

  const send = async () => {
    const body = draft.trim();
    if (!shopId || body === "") return;
    setBusy(true);
    try {
      const sent = await sendSupplyMessage(shopId, body);
      setMessages((all) => [...all, sent]);
      setDraft("");
      toast.success("Message sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The message was not sent");
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <p className="mt-6 text-[14px] text-foreground">
        Could not load messages.{" "}
        <button type="button" className="font-medium underline underline-offset-4" onClick={load}>
          Try again
        </button>
      </p>
    );
  }
  if (!shops) {
    return <p className="mt-6 text-[14px] text-muted-foreground">Loading…</p>;
  }
  if (shops.length === 0) {
    return (
      <p className="mt-6 max-w-prose text-[14px] text-muted-foreground">
        There is nobody to message yet. A shop appears here once it has added you as a supplier.
      </p>
    );
  }

  const shopName = shops.find((s) => s.localSupplierId === shopId)?.shopName ?? "this shop";
  return (
    <section aria-label="Messages" className="mt-4">
      <label className="block text-[13px] text-muted-foreground" htmlFor="supply-message-shop">
        Shop
      </label>
      <select
        id="supply-message-shop"
        className="mt-1 h-11 w-full max-w-sm border border-foreground/15 bg-background px-2 text-[14px] sm:h-9"
        value={shopId}
        onChange={(event) => setShopId(event.target.value)}
      >
        {shops.map((shop) => {
          const unread = unreadFor(shop.localSupplierId);
          return (
            <option key={shop.localSupplierId} value={shop.localSupplierId}>
              {shop.shopName}
              {unread > 0 ? ` (${unread} new)` : ""}
            </option>
          );
        })}
      </select>

      {thread.length === 0 ? (
        <p className="mt-4 text-[14px] text-muted-foreground">Nothing has been said with {shopName} yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {thread.map((message) => (
            <li key={message.id} className="py-3">
              <p className="text-[12px] text-muted-foreground">
                {message.direction === "from_shop" ? message.authorName || shopName : `You (${message.authorName})`},{" "}
                {when(message.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">{message.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={4000}
          rows={3}
          aria-label={`Message to ${shopName}`}
          placeholder={`Write to ${shopName}`}
        />
        <Button type="submit" disabled={busy || draft.trim() === ""}>
          Send message
        </Button>
      </form>
    </section>
  );
}

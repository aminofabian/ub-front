"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircle, Search, ShoppingBag } from "lucide-react";

import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type FloatAction = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  external?: boolean;
};

export function ComilmartFloats({
  whatsappDigits,
  storeName,
}: {
  whatsappDigits: string | null;
  storeName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const {
    itemCount,
    checkoutOpen,
    checkoutChoiceOpen,
    whatsAppSheetOpen,
    toggleDrawer,
  } = useShopCart();

  const hidden =
    pathname === APP_ROUTES.shopCheckout ||
    checkoutOpen ||
    checkoutChoiceOpen ||
    whatsAppSheetOpen;

  if (hidden) return null;

  const waHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hi ${storeName}, I have a question about your shop.`,
      )}`
    : null;

  const focusSearch = () => {
    setOpen(false);
    const input = document.getElementById("cm-search-q");
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const actions: FloatAction[] = [
    waHref
      ? {
          id: "chat",
          label: "Chat on WhatsApp",
          icon: <MessageCircle size={18} strokeWidth={1.85} />,
          href: waHref,
          external: true,
        }
      : {
          id: "shop",
          label: "Browse catalog",
          icon: <LayoutGrid size={18} strokeWidth={1.85} />,
          href: "#catalog",
        },
    {
      id: "search",
      label: "Search products",
      icon: <Search size={18} strokeWidth={1.85} />,
      onClick: focusSearch,
    },
    {
      id: "cart",
      label: itemCount > 0 ? `Open cart (${itemCount})` : "Open cart",
      icon: <ShoppingBag size={18} strokeWidth={1.85} />,
      onClick: () => {
        setOpen(false);
        toggleDrawer();
      },
      active: itemCount > 0,
    },
  ];

  return (
    <aside
      className={styles.floatDock}
      data-open={open ? "true" : "false"}
      aria-label="Quick actions"
    >
      <div className={styles.floatTools}>
        {actions.map((action) => {
          const className = cn(
            styles.floatBtn,
            action.active && styles.floatBtnActive,
          );

          if (action.href) {
            return (
              <a
                key={action.id}
                href={action.href}
                className={className}
                aria-label={action.label}
                title={action.label}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
              >
                {action.icon}
                {action.id === "cart" && itemCount > 0 ? (
                  <span className={styles.floatBadge}>
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </a>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              className={className}
              aria-label={action.label}
              title={action.label}
              onClick={action.onClick}
            >
              {action.icon}
              {action.id === "cart" && itemCount > 0 ? (
                <span className={styles.floatBadge}>
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={cn(styles.floatBtn, styles.floatToggle)}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "×" : "⋯"}
      </button>
    </aside>
  );
}

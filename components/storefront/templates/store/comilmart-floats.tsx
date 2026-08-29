"use client";

import { usePathname } from "next/navigation";

import styles from "@/components/storefront/templates/store/comilmart.module.css";
import { useShopCart } from "@/hooks/use-shop-cart";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type FloatAction = {
  id: string;
  label: string;
  icon: string;
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
          icon: "💬",
          href: waHref,
          external: true,
        }
      : {
          id: "chat",
          label: "Browse catalog",
          icon: "💬",
          href: "#catalog",
        },
    {
      id: "search",
      label: "Search products",
      icon: "🔍",
      onClick: focusSearch,
    },
    {
      id: "categories",
      label: "Shop by category",
      icon: "📋",
      href: "#categories",
    },
    {
      id: "cart",
      label: itemCount > 0 ? `Open cart (${itemCount})` : "Open cart",
      icon: "🛍️",
      onClick: toggleDrawer,
      active: itemCount > 0,
    },
    {
      id: "shop",
      label: "View all products",
      icon: "🏪",
      href: "#catalog",
      active: true,
    },
  ];

  return (
    <aside className={styles.floatDock} aria-label="Quick actions">
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
            >
              <span aria-hidden>{action.icon}</span>
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
            <span aria-hidden>{action.icon}</span>
            {action.id === "cart" && itemCount > 0 ? (
              <span className={styles.floatBadge}>
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </aside>
  );
}

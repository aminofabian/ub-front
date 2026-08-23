import { cn } from "@/lib/utils";
import { normalizeWhatsApp } from "@/lib/whatsapp-order";

/** WhatsApp deep link with a prefilled message; `null` when the number is unusable. */
export function whatsappHref(
  rawNumber: string | null | undefined,
  message: string,
): string | null {
  const digits = normalizeWhatsApp(rawNumber);
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Consistent section width — matches the theme home's own container. */
export function sectionContainerClass(className?: string): string {
  return cn("mx-auto w-full max-w-7xl px-3 sm:px-6", className);
}

/** Cards inside sections honor the merchant's corner-radius token. */
export function sectionCardClass(className?: string): string {
  return cn(
    "rounded-[length:var(--sf-card-radius,1rem)] border border-border/70 bg-card shadow-sm",
    className,
  );
}

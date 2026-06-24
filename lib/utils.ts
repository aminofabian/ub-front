import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Category `icon` may store an HTTPS image URL (e.g. Cloudinary) for custom kiosk tiles. */
export function categoryIconImageUrl(icon: string | null | undefined): string | null {
  const t = icon?.trim()
  if (!t) {
    return null
  }
  return /^https?:\/\//i.test(t) ? t : null
}

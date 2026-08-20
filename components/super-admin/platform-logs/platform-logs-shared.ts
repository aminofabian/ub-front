import {
  Layers,
  Signal,
  ShoppingCart,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { PlatformRequestLogCategory } from "@/lib/super-admin-api";

export const CATEGORY_LABELS: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "Cashier",
  MPESA: "M-Pesa",
  AIRTIME: "Airtime",
  KPLC: "KPLC tokens",
  OTHER: "Other",
};

export const CATEGORY_ORDER: PlatformRequestLogCategory[] = [
  "CASHIER",
  "MPESA",
  "AIRTIME",
  "KPLC",
  "OTHER",
];

export const CATEGORY_ICONS: Record<PlatformRequestLogCategory, LucideIcon> = {
  CASHIER: ShoppingCart,
  MPESA: Smartphone,
  AIRTIME: Signal,
  KPLC: Zap,
  OTHER: Layers,
};

export const CATEGORY_BADGE: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MPESA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  AIRTIME: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  KPLC: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  OTHER: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
};

export const CATEGORY_BAR: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "bg-blue-500",
  MPESA: "bg-emerald-500",
  AIRTIME: "bg-violet-500",
  KPLC: "bg-amber-500",
  OTHER: "bg-slate-400",
};

export const CATEGORY_TILE: Record<PlatformRequestLogCategory, string> = {
  CASHIER: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  MPESA: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  AIRTIME: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
  KPLC: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  OTHER: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/25",
};

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function statusTone(status: number, success: boolean): string {
  if (success) return "text-emerald-600 dark:text-emerald-400";
  if (status >= 500) return "text-red-600 dark:text-red-400";
  if (status >= 400) return "text-amber-600 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}

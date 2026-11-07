"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock3,
  CreditCard,
  LockKeyhole,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSubscriptionBillingStatus } from "@/hooks/use-subscription-billing-status";
import {
  resolveSubscriptionBanner,
  type SubscriptionBannerIcon,
  type SubscriptionBannerTone,
} from "@/lib/subscription-banner";
import { IS_DESKTOP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ub.subscriptionBanner.dismissed";

const ICONS: Record<SubscriptionBannerIcon, LucideIcon> = {
  calendar: CalendarClock,
  clock: Clock3,
  lock: LockKeyhole,
  card: CreditCard,
  alert: AlertTriangle,
};

const TONES: Record<
  SubscriptionBannerTone,
  {
    shell: string;
    bar: string;
    eyebrow: string;
    chip: string;
    cta: string;
    dismiss: string;
  }
> = {
  notice: {
    shell:
      "border-emerald-200/80 bg-emerald-50/85 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-950/35 dark:text-emerald-50",
    bar: "bg-emerald-600/70",
    eyebrow: "text-emerald-800/75 dark:text-emerald-200/75",
    chip:
      "border-emerald-800/15 bg-white/55 text-emerald-900/75 dark:border-emerald-200/15 dark:bg-emerald-950/30 dark:text-emerald-100/75",
    cta:
      "border border-emerald-800/20 bg-white/75 text-emerald-950 hover:bg-white dark:border-emerald-200/20 dark:bg-emerald-950/30 dark:text-emerald-50 dark:hover:bg-emerald-950/50",
    dismiss:
      "text-emerald-900/45 hover:bg-emerald-900/5 hover:text-emerald-900 dark:text-emerald-100/50 dark:hover:bg-emerald-100/10",
  },
  warning: {
    shell:
      "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-50",
    bar: "bg-amber-500",
    eyebrow: "text-amber-800/75 dark:text-amber-200/75",
    chip:
      "border-amber-800/15 bg-white/55 text-amber-900/75 dark:border-amber-200/15 dark:bg-amber-950/30 dark:text-amber-100/75",
    cta:
      "border border-amber-800/15 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-300/20 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400",
    dismiss:
      "text-amber-900/45 hover:bg-amber-900/5 hover:text-amber-900 dark:text-amber-100/50 dark:hover:bg-amber-100/10",
  },
  critical: {
    shell:
      "border-rose-300/80 bg-rose-50 text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/40 dark:text-rose-50",
    bar: "bg-rose-600",
    eyebrow: "text-rose-800/75 dark:text-rose-200/75",
    chip:
      "border-rose-800/15 bg-white/55 text-rose-900/75 dark:border-rose-200/15 dark:bg-rose-950/30 dark:text-rose-100/75",
    cta:
      "border border-rose-800/15 bg-rose-700 text-white hover:bg-rose-800 dark:border-rose-300/20 dark:bg-rose-500 dark:text-rose-950 dark:hover:bg-rose-400",
    dismiss:
      "text-rose-900/45 hover:bg-rose-900/5 hover:text-rose-900 dark:text-rose-100/50 dark:hover:bg-rose-100/10",
  },
  payment: {
    shell:
      "border-orange-300/80 bg-orange-50 text-orange-950 dark:border-orange-500/25 dark:bg-orange-950/40 dark:text-orange-50",
    bar: "bg-orange-500",
    eyebrow: "text-orange-800/75 dark:text-orange-200/75",
    chip:
      "border-orange-800/15 bg-white/55 text-orange-900/75 dark:border-orange-200/15 dark:bg-orange-950/30 dark:text-orange-100/75",
    cta:
      "border border-orange-800/15 bg-orange-700 text-white hover:bg-orange-800 dark:border-orange-300/20 dark:bg-orange-500 dark:text-orange-950 dark:hover:bg-orange-400",
    dismiss:
      "text-orange-900/45 hover:bg-orange-900/5 hover:text-orange-900 dark:text-orange-100/50 dark:hover:bg-orange-100/10",
  },
};

/**
 * Single source of truth for subscription notices in the shell. Renders at most
 * one state as a single slim strip, hides itself on the billing page, and lets
 * the renewal reminder and failed-payment notice (not a block) be hidden.
 */
export function SubscriptionStatusBanner() {
  const pathname = usePathname();
  const { status } = useSubscriptionBillingStatus();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedKey(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      /* private mode */
    }
  }, []);

  const banner = useMemo(() => resolveSubscriptionBanner(status), [status]);

  if (IS_DESKTOP) return null;
  if (!banner) return null;
  if (pathname?.startsWith("/business/billing")) return null;
  if (banner.dismissible && dismissedKey === banner.key) return null;

  const tone = TONES[banner.tone];
  const Icon = ICONS[banner.icon];

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, banner.key);
    } catch {
      /* ignore */
    }
    setDismissedKey(banner.key);
  };

  // One slim strip on every screen: the short label on a phone, label and title on a
  // laptop, the full explanation on hover. It must not push the work area down.
  return (
    <div
      role="status"
      aria-live="polite"
      title={`${banner.title}. ${banner.description}`}
      className={cn("relative shrink-0 overflow-hidden border-b", tone.shell)}
    >
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", tone.bar)}
        aria-hidden
      />
      <div className="mx-auto flex h-10 w-full max-w-[1440px] items-center gap-2 pl-3 pr-1.5 sm:gap-3 sm:px-5">
        <Icon
          className={cn("size-4 shrink-0", tone.eyebrow)}
          strokeWidth={2.1}
          aria-hidden
        />
        <p className="flex min-w-0 flex-1 items-baseline gap-2 truncate text-[12.5px] leading-none">
          <span className="shrink-0 font-semibold tracking-[-0.01em]">
            {banner.eyebrow}
          </span>
          <span className="hidden truncate opacity-75 sm:inline">
            {banner.title}
          </span>
          {banner.meta.map((item) => (
            <span
              key={item}
              className={cn(
                "hidden shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold md:inline-flex",
                tone.chip,
              )}
            >
              {item}
            </span>
          ))}
          <span className="sr-only">{`${banner.title}. ${banner.description}`}</span>
        </p>
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-7 shrink-0 gap-1 rounded-md px-2.5 text-[11.5px] font-semibold tracking-[-0.01em] shadow-none active:scale-[0.98]",
            tone.cta,
          )}
          asChild
        >
          <Link href={banner.href}>
            {banner.cta}
            <ArrowRight className="size-3.5 opacity-80" aria-hidden />
          </Link>
        </Button>
        {banner.dismissible ? (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide this notice"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              tone.dismiss,
            )}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

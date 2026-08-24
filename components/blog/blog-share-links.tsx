"use client";

import { useCallback, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Network = {
  key: string;
  label: string;
  /** Share URL builder — receives the article URL and pre-filled text. */
  href: (url: string, text: string) => string;
  path: string;
};

const WHATSAPP_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";
const X_PATH =
  "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
const FACEBOOK_PATH =
  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";
const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

const NETWORKS: Network[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: (url, text) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    path: WHATSAPP_PATH,
  },
  {
    key: "x",
    label: "X",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text,
      )}&url=${encodeURIComponent(url)}`,
    path: X_PATH,
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: FACEBOOK_PATH,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    href: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url,
      )}`,
    path: LINKEDIN_PATH,
  },
];

/**
 * Shareable social links for a blog article — WhatsApp, X, Facebook, LinkedIn,
 * plus a copy-link button. WhatsApp leads because that's how Kenya shares.
 */
export function BlogShareLinks({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }, [url]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3 py-2",
        className,
      )}
    >
      <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
        Share
      </span>

      {NETWORKS.map((network) => (
        <a
          key={network.key}
          href={network.href(url, `${title} — a guide from Kiosk`)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${network.label}`}
          title={`Share on ${network.label}`}
          className="flex size-8 items-center justify-center rounded-full border border-[var(--kiosk-border)] text-[var(--kiosk-text-muted)] transition hover:border-[var(--kiosk-gold-border)] hover:bg-[var(--kiosk-gold-soft)] hover:text-[var(--kiosk-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kiosk-gold)]/40"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="currentColor"
            aria-hidden
          >
            <path d={network.path} />
          </svg>
        </a>
      ))}

      <button
        type="button"
        onClick={() => void copyLink()}
        aria-label="Copy link"
        title="Copy link"
        className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--kiosk-border)] px-3 text-[11px] font-medium text-[var(--kiosk-text-muted)] transition hover:border-[var(--kiosk-gold-border)] hover:bg-[var(--kiosk-gold-soft)] hover:text-[var(--kiosk-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kiosk-gold)]/40"
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

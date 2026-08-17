"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Signal, Zap } from "lucide-react";

import { ShopAirtimeFlow } from "@/components/storefront/shop-airtime-flow";
import { APP_ROUTES } from "@/lib/config";

const PROMISES = [
  {
    icon: Zap,
    title: "Delivered in seconds",
    body: "Straight from the telco to the line you enter — no vouchers to scratch.",
  },
  {
    icon: ShieldCheck,
    title: "One M-Pesa prompt",
    body: "Approve on your phone. Nothing is charged until you enter your PIN.",
  },
  {
    icon: Signal,
    title: "Every network",
    body: "Safaricom, Airtel, Telkom, Equitel and JTL lines all supported.",
  },
];

/** Standalone airtime page — shareable, and the fallback when the pill is hidden. */
export default function ShopAirtimeView({
  slug,
  storeName,
  accentHex,
}: {
  slug: string;
  storeName?: string | null;
  accentHex?: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={APP_ROUTES.shop}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to shopping
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_22rem] md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Airtime
          </p>
          <h1 className="mt-1.5 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Top up any line, right here.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {storeName?.trim()
              ? `${storeName.trim()} sends the airtime for you.`
              : "This shop sends the airtime for you."}{" "}
            Enter the number, pick an amount, and approve the M-Pesa prompt — the credit
            arrives on the line straight away.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li
                key={p.title}
                className="rounded-xl border border-border/60 bg-card/60 px-3.5 py-3"
              >
                <p.icon className="size-4 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-semibold">{p.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <ShopAirtimeFlow slug={slug} accentHex={accentHex} />
        </div>
      </div>
    </div>
  );
}

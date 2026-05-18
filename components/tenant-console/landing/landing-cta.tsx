"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";

import { goldCtaClass } from "./landing-styles";

type LandingCtaProps = {
  onCreateShop: () => void;
};

export function LandingCta({ onCreateShop }: LandingCtaProps) {
  return (
    <section className="mx-auto max-w-[74rem] px-5 pb-20 sm:px-8 sm:pb-28">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--landing-ink)] px-6 py-14 sm:px-14 sm:py-16">
        {/* ── Decorative blobs ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[15%] -top-[30%] h-[320px] w-[320px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--landing-gold-bright), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[30%] -left-[5%] h-[200px] w-[260px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--landing-gold-soft), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-white/45">
            Get started today
          </p>
          <h2 className="font-heading mt-4 text-2xl font-bold tracking-[-0.03em] text-[#faf9f7] sm:text-3xl xl:text-[2.4rem]">
            Open your shop in minutes, not weeks
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
            Claim your free subdomain, stock your catalog, and start selling
            in-store and online. Upgrade to a custom domain whenever you&apos;re
            ready — no interruptions.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className={goldCtaClass}
              onClick={onCreateShop}
            >
              Create your shop
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <Link
              href={APP_ROUTES.login}
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-3.5 text-[15px] font-medium text-white/80 transition-all duration-300 hover:border-white/30 hover:text-white hover:-translate-y-0.5"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-6 text-[13px] text-white/35">
            No credit card required · Free subdomain included · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

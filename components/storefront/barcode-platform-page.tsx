"use client";

import Link from "next/link";
import {
  ArrowRight,
  ScanBarcode,
  Smartphone,
  Store,
  WifiOff,
} from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { BarcodeLookup } from "@/components/storefront/barcode-lookup";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

import {
  ghostCtaClass,
  goldCtaClass,
  landingCardClass,
  landingRootStyle,
  sectionLabelClass,
} from "../tenant-console/landing/landing-styles";

const FEATURES = [
  {
    icon: ScanBarcode,
    title: "GTIN & retail codes",
    body: "EAN-13, UPC, and local product IDs — type or scan from your phone.",
  },
  {
    icon: Smartphone,
    title: "Camera scan",
    body: "Point your camera at the label. No app install required.",
  },
  {
    icon: WifiOff,
    title: "Built for the counter",
    body: "This lookup powers the same barcode engine inside Kiosk POS.",
  },
] as const;

export function BarcodePlatformPage() {
  return (
    <div
      className="landing-page min-h-screen antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <BarcodePlatformNav />

      <main className="relative isolate overflow-x-hidden">
        <BarcodeAtmosphere />

        <div className="relative z-10 mx-auto w-full max-w-[1120px] px-5 pb-24 pt-[7.5rem] sm:px-10 sm:pb-28 sm:pt-[8.5rem] lg:px-14">
          <header className="landing-reveal mb-12 max-w-[40rem]">
            <p className={`${sectionLabelClass} mb-5`}>Free barcode lookup</p>
            <h1 className="font-heading text-[clamp(2.25rem,5.8vw,3.75rem)] leading-[1.06] tracking-[-0.04em] text-[var(--kiosk-text)]">
              Know what&apos;s on the shelf
              <span className="mt-2 block bg-gradient-to-r from-[#20863B] via-[var(--kiosk-gold)] to-[#32B85A] bg-clip-text text-transparent">
                before you ring it up.
              </span>
            </h1>
            <p className="mt-6 max-w-[32rem] text-[15px] leading-[1.75] text-[var(--kiosk-text-muted)] sm:text-[17px]">
              Enter or scan a barcode to see product details, price, and
              availability — the same lookup your till uses at checkout.
            </p>
          </header>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14 xl:gap-16">
            <div className="landing-reveal landing-reveal-delay-1 min-w-0">
              <BarcodeLookup theme="platform" variant="page" />
            </div>

            <aside className="landing-reveal landing-reveal-delay-2 flex flex-col gap-5">
              <PosPromoCard />
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className={cn(landingCardClass, "p-5")}>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)]">
                    <Icon
                      className="h-[18px] w-[18px] text-[var(--kiosk-gold)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
                    {body}
                  </p>
                </div>
              ))}
            </aside>
          </div>

          <section className="landing-reveal landing-reveal-delay-3 mt-20 rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-8 sm:p-10">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className={`${sectionLabelClass} mb-3`}>Point of sale</p>
                <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)]">
                  Want this at your counter every day?
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--kiosk-text-muted)]">
                  Set up Kiosk POS in minutes — scan barcodes, take M-Pesa STK,
                  print receipts, and keep selling when Wi‑Fi drops. No card
                  needed to start.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                <Link href="/" className={`${goldCtaClass} w-full justify-center sm:w-auto`}>
                  Set up your POS
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
                <Link
                  href="/#how"
                  className={`${ghostCtaClass} w-full justify-center sm:w-auto`}
                >
                  See how it works
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--kiosk-border-soft)] px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <KioskLogo href="/" size="sm" variant="landing" layout="badge" />
          <p className="text-sm text-[var(--kiosk-text-dim)]">
            © {new Date().getFullYear()} Kiosk · Barcode lookup is free for
            everyone.
          </p>
        </div>
      </footer>
    </div>
  );
}

function BarcodePlatformNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[4.25rem] items-center justify-between border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-nav-blur-bg)] px-5 backdrop-blur-xl sm:h-[4.5rem] sm:px-10">
      <KioskLogo href="/" size="lg" variant="landing" layout="badge" />

      <div className="hidden items-center gap-8 md:flex">
        <Link
          href="/"
          className="text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)]"
        >
          Home
        </Link>
        <span className="text-sm font-medium text-[var(--kiosk-text)]">
          Barcode lookup
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={APP_ROUTES.login}
          className="hidden text-sm text-[var(--kiosk-text-muted)] transition-colors hover:text-[var(--kiosk-text)] sm:inline"
        >
          Sign in
        </Link>
        <Link href="/" className={`${goldCtaClass} !px-4 !py-2 !text-[13px]`}>
          Get Kiosk free
        </Link>
      </div>
    </nav>
  );
}

function PosPromoCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--kiosk-gold-border)] bg-gradient-to-br from-[var(--kiosk-gold-surface)] via-[var(--kiosk-elevated)] to-[var(--kiosk-elevated)] p-6 shadow-[0_8px_32px_-12px_var(--kiosk-success-shadow)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, var(--kiosk-gold-soft) 0%, transparent 70%)",
        }}
      />
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)]">
        <Store
          className="h-5 w-5 text-[var(--kiosk-gold)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
        Run your own till
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-muted)]">
        Turn this lookup into a full POS — shifts, M-Pesa, receipts, and stock
        in one place.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold-hover)]"
      >
        Set up Kiosk POS
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
      </Link>
    </div>
  );
}

function BarcodeAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            var(--kiosk-grid-line) 11px,
            var(--kiosk-grid-line) 12px
          )`,
          maskImage:
            "linear-gradient(180deg, var(--kiosk-bg) 0%, transparent 85%)",
          WebkitMaskImage:
            "linear-gradient(180deg, var(--kiosk-bg) 0%, transparent 85%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-24 h-[min(50vh,420px)] w-[min(55%,480px)] opacity-[0.14]"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 70% 30%, var(--kiosk-gold) 0%, transparent 65%)",
        }}
      />
    </>
  );
}

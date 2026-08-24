import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Clock3,
  Gift,
  Gauge,
  KeyRound,
  MapPin,
  MessageCircle,
  Package,
  Route,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { LandingFooter } from "@/components/tenant-console/landing/landing-footer";
import {
  goldCtaClass,
  ghostCtaClass,
  landingCardClass,
  landingRootStyle,
  landingSectionAltClass,
  landingSectionHeaderMb,
  landingSectionHeadingClass,
  sectionLabelClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { cn } from "@/lib/utils";

const OLD_DOMAIN = "kiosk.co.ke";
const NEW_DOMAIN = PLATFORM_DOMAIN; // kiosk.ke

const STAYS_SAME = [
  { icon: Package, title: "Products", body: "Every item, variant, and package." },
  { icon: Boxes, title: "Stock & reports", body: "Counts, history, and sales records." },
  { icon: Gift, title: "Prices", body: "Buying and selling, margins intact." },
  { icon: MessageCircle, title: "M-Pesa payments", body: "History, settlements, STK flows." },
  { icon: Users, title: "Team & roles", body: "Staff, PINs, permissions, branches." },
  { icon: Store, title: "Storefront design", body: "Logo, colours, your shop's look." },
  { icon: Route, title: "Suppliers & credit", body: "Vendors, orders, what you owe." },
  { icon: KeyRound, title: "Your access", body: "Accounts, permissions, sign-in." },
];

const WHY_MOVE = [
  {
    icon: Gauge,
    title: "Faster at the counter",
    body: "A till that responds to the rush, not one that thinks about it.",
  },
  {
    icon: ShieldCheck,
    title: "Steadier, fewer surprises",
    body: "Infrastructure sized for the traffic your shop actually brings.",
  },
  {
    icon: Boxes,
    title: "Room for the roadmap",
    body: "Multi-branch, supplier portals, and the features your growth earns.",
  },
  {
    icon: Clock3,
    title: "Built to keep up",
    body: "A foundation that scales with every new shop — not against them.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Update your store link",
    body: "Grab the new address — yourshop.kiosk.ke — and update bookmarks, WhatsApp, and social links.",
  },
  {
    step: "02",
    title: "Sign in once on kiosk.ke",
    body: "One sign-in confirms everything is where you left it. Your data was never in the address.",
  },
  {
    step: "03",
    title: "Tell your customers",
    body: "A WhatsApp status, a group post, a sign by the counter. New address, same shop, same welcome.",
  },
];

const FAQS = [
  {
    q: "What is actually changing?",
    a: "The platform's home address: kiosk.co.ke becomes kiosk.ke, and every storefront moves from yourshop.kiosk.co.ke to yourshop.kiosk.ke. Your products, stock, prices, M-Pesa history, team, and storefront design all stay exactly as they are.",
  },
  {
    q: "Why is the move necessary?",
    a: "The previous structure was built for the platform's first phase and couldn't scale with the traffic, multi-branch shops, and supplier features our merchants now need. kiosk.ke runs on infrastructure built for that scale — faster tills, steadier service, and room for the roadmap.",
  },
  {
    q: "What do I need to do?",
    a: "Three small things: update saved links and bookmarks to the new address, sign in once on kiosk.ke so everything confirms, and share your new storefront URL with customers. Old kiosk.co.ke links keep redirecting for a while, but the new address is the one to share.",
  },
  {
    q: "Will my old links still work?",
    a: "For a grace period, yes — old kiosk.co.ke links redirect so nobody loses the way. But redirects are a courtesy, not a home: update your bookmarks and WhatsApp links to the new address so customers always land on the real store.",
  },
  {
    q: "Is my data safe during the migration?",
    a: "Yes. Nothing is rebuilt or re-entered — your data moves with you. Products, stock counts, prices, M-Pesa payments, staff roles, supplier records, and reports all carry over.",
  },
  {
    q: "When should I move?",
    a: "Now. Updating your links takes minutes, and the sooner customers learn the new address, the sooner the old one can retire. Sign in on kiosk.ke today and you're home.",
  },
];

const TIMELINE = [
  { year: "Then", label: `${OLD_DOMAIN} — built for the first thousand shops` },
  { year: "Grew", label: "Traffic, multi-branch shops, and supplier features outgrew the house" },
  { year: "Now", label: `${NEW_DOMAIN} — infrastructure built for the next hundred thousand` },
];

export function MigrationPage() {
  return (
    <div
      className="landing-page min-h-screen antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <MigrationNav />

      <main className="relative isolate overflow-x-hidden">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-[#0c1512] text-[#F0EDE6]">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] [background-size:28px_28px]" />
          <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#28A745]/20 blur-[120px]" />
          <div className="relative z-10 mx-auto max-w-[1120px] px-5 pb-20 pt-[7.5rem] sm:px-10 sm:pb-28 sm:pt-[9rem] lg:px-14">
            <span className={`${sectionLabelPillClass} !border-white/15 !bg-white/5 !text-[#6ee7a0]`}>
              A note from the team
            </span>
            <h1 className="mt-6 max-w-[46rem] font-heading text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.05] tracking-[-0.03em]">
              We moved to <span className="text-[#6ee7a0]">kiosk.ke</span>.
              <span className="mt-3 block text-[clamp(1.2rem,3vw,1.8rem)] font-medium tracking-[-0.02em] text-[#A5A29D]">
                The house got too small, so we built a bigger one — and
                everything you own came with us.
              </span>
            </h1>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#story"
                className={`${goldCtaClass} !bg-[#28A745] !text-white hover:!bg-[#32B85A]`}
              >
                Read the story
                <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
              </a>
              <Link href={APP_ROUTES.login} className={ghostCtaClass}>
                Sign in on kiosk.ke
              </Link>
            </div>

            <div className="mt-14 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element -- static illustration */}
              <img
                src="/migration/migration-moving-day.svg"
                alt="A moving truck carries products, stock, prices, reports, and team from the old kiosk.co.ke house to the new taller kiosk.ke building"
                className="h-auto w-full"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* ── The story ── */}
        <section id="story" className="landingSectionClass scroll-mt-28">
          <div className="mx-auto max-w-[1120px]">
            <div className={cn("grid gap-12 lg:grid-cols-2 lg:gap-16")}>
              <div>
                <p className={sectionLabelClass}>The story</p>
                <h2
                  className={cn(
                    landingSectionHeadingClass,
                    "mt-4 max-w-xl !text-[clamp(1.8rem,4vw,2.8rem)]",
                  )}
                >
                  Why we packed up and moved
                </h2>
                <div className="mt-6 space-y-5 text-[15px] leading-[1.75] text-[var(--kiosk-text-soft)]">
                  <p>
                    Kiosk grew up on kiosk.co.ke. It was a good home for the
                    platform&apos;s first phase — the first shops, the first
                    tills, the first M-Pesa rings. But every house has a
                    ceiling, and we hit ours.
                  </p>
                  <p>
                    The old structure couldn&apos;t scale the way our shops
                    needed: heavier mobile-money traffic at the counter,
                    multi-branch retailers, supplier portals, and storefronts
                    that share one honest stock count. Every new feature meant
                    another workaround bolted onto a foundation never built for
                    that weight.
                  </p>
                  <p>
                    So we did what any landlord would advise: we built a new
                    house before the old one gave out —{" "}
                    <span className="font-semibold text-[var(--kiosk-text)]">
                      kiosk.ke
                    </span>
                    , on infrastructure designed for the next hundred thousand
                    shops, not the first thousand.
                  </p>
                </div>

                <div className="mt-8 space-y-0 border-t border-[var(--kiosk-border-soft)]">
                  {TIMELINE.map((item) => (
                    <div
                      key={item.year}
                      className="flex items-baseline gap-4 border-b border-[var(--kiosk-border-soft)] py-3.5"
                    >
                      <span className="w-14 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                        {item.year}
                      </span>
                      <span className="text-[14px] leading-relaxed text-[var(--kiosk-text-soft)]">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static illustration */}
                  <img
                    src="/migration/migration-why-move.svg"
                    alt="The old street capped growth while the new street is built for scale — with three promises: nothing lost, simple to follow, worth the move"
                    className="h-auto w-full"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── What changes / what stays ── */}
        <section className={landingSectionAltClass}>
          <div className="mx-auto max-w-[1120px]">
            <div className={landingSectionHeaderMb}>
              <p className={sectionLabelClass}>Moving day, unpacked</p>
              <h2
                className={cn(
                  landingSectionHeadingClass,
                  "mt-4 !text-[clamp(1.8rem,4vw,2.8rem)]",
                )}
              >
                One address changes. Everything else moves with you.
              </h2>
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static illustration */}
                <img
                  src="/migration/migration-what-changes.svg"
                  alt="The storefront address changes from yourshop.kiosk.co.ke to yourshop.kiosk.ke; bookmarks, WhatsApp links, and one sign-in are all that need updating"
                  className="h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div>
                <h3 className="font-heading text-xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                  What stays the same
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--kiosk-text-soft)]">
                  Your data isn&apos;t rebuilt — it moves. These boxes are
                  packed and travelling with you:
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {STAYS_SAME.map(({ icon: Icon, title, body }) => (
                    <div
                      key={title}
                      className={cn(landingCardClass, "flex items-start gap-3 p-4")}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)]">
                        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-[var(--kiosk-text)]">
                          {title}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--kiosk-text-soft)]">
                          {body}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why move with us ── */}
        <section className="landingSectionClass">
          <div className="mx-auto max-w-[1120px]">
            <div className="max-w-2xl">
              <p className={sectionLabelClass}>What you get on the other side</p>
              <h2
                className={cn(
                  landingSectionHeadingClass,
                  "mt-4 !text-[clamp(1.8rem,4vw,2.8rem)]",
                )}
              >
                Why the move is worth making with us
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WHY_MOVE.map(({ icon: Icon, title, body }) => (
                <div key={title} className={cn(landingCardClass, "p-6")}>
                  <span className="flex size-10 items-center justify-center rounded-xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)]">
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How to move ── */}
        <section className="landingSectionAltClass">
          <div className="mx-auto max-w-[1120px]">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
              <div>
                <p className={sectionLabelClass}>How to move with us</p>
                <h2
                  className={cn(
                    landingSectionHeadingClass,
                    "mt-4 !text-[clamp(1.8rem,4vw,2.8rem)]",
                  )}
                >
                  Three steps, one afternoon
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
                  The address changed; your work didn&apos;t. This is the whole
                  moving checklist — shorter than unpacking a single box.
                </p>
                <div className="mt-8 space-y-4">
                  {STEPS.map(({ step, title, body }) => (
                    <div
                      key={step}
                      className="flex items-start gap-4 rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)] font-mono text-[13px] font-bold text-[var(--kiosk-gold)]">
                        {step}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-heading text-[15px] font-semibold tracking-[-0.01em] text-[var(--kiosk-text)]">
                          {title}
                        </span>
                        <span className="mt-1 block text-[13.5px] leading-relaxed text-[var(--kiosk-text-soft)]">
                          {body}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="rounded-2xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] p-7 sm:p-9">
                  <MapPin className="size-8 text-[var(--kiosk-gold)]" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-4 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
                    Your new address
                  </h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--kiosk-text-soft)]">
                    Every store now lives at{" "}
                    <span className="font-mono text-[13px] font-semibold text-[var(--kiosk-text)]">
                      yourshop.kiosk.ke
                    </span>
                    . Same products, same stock, same M-Pesa — a new front
                    door, on a street built to hold your growth.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={APP_ROUTES.login} className={goldCtaClass}>
                      Sign in on kiosk.ke
                      <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                    </Link>
                    <Link href="/" className={ghostCtaClass}>
                      Back to the homepage
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="landingSectionClass">
          <div className="mx-auto max-w-[820px]">
            <div className="text-center">
              <p className={sectionLabelClass}>Questions, answered</p>
              <h2
                className={cn(
                  landingSectionHeadingClass,
                  "mt-4 !text-[clamp(1.7rem,4vw,2.5rem)]",
                )}
              >
                The move, in plain language
              </h2>
            </div>
            <div className="mt-10 border-t border-[var(--kiosk-border-soft)]">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="border-b border-[var(--kiosk-border-soft)]"
                >
                  <summary className="cursor-pointer list-none py-5 pr-6 font-heading text-[15.5px] font-semibold tracking-[-0.01em] text-[var(--kiosk-text)] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                  </summary>
                  <p className="pb-5 pr-6 text-[14.5px] leading-[1.7] text-[var(--kiosk-text-soft)]">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function MigrationNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[4.25rem] items-center justify-between border-b border-white/10 bg-[#0c1512]/90 px-5 backdrop-blur-xl sm:h-[4.5rem] sm:px-10">
      <KioskLogo href="/" size="lg" variant="landing" layout="badge" />

      <div className="hidden items-center gap-8 md:flex">
        <a
          href="#story"
          className="text-sm text-[#A5A29D] transition-colors hover:text-white"
        >
          Why we moved
        </a>
        <a
          href="#story"
          className="text-sm text-[#A5A29D] transition-colors hover:text-white"
        >
          What changes
        </a>
        <Link
          href={APP_ROUTES.login}
          className="text-sm text-[#A5A29D] transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </div>
      <Link
        href={APP_ROUTES.login}
        className={`${goldCtaClass} !px-4 !py-2 !text-[13px] !bg-[#28A745] !text-white hover:!bg-[#32B85A]`}
      >
        Move with us
      </Link>
    </nav>
  );
}

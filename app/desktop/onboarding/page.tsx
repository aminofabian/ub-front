import type { Metadata } from "next";
import Link from "next/link";

import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Globe,
  HardDrive,
  Package,
  RefreshCw,
  Rocket,
  ShoppingCart,
  Store,
  UserPlus,
  Wrench,
} from "lucide-react";

import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import {
  Bullets,
  Callout,
  DataTable,
  Faq,
  H2,
  H3,
  InlineCode,
  Lead,
  P,
  SectionHeader,
  Steps,
  Strong,
} from "@/components/desktop-guide/guide-blocks";
import { GuideToc, type TocItem } from "@/components/desktop-guide/guide-toc";
import {
  ghostCtaClass,
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kiosk Desktop onboarding — from download to first sale | Kiosk",
  description:
    "The full walkthrough for a brand-new till: install Kiosk Desktop, get through the one-time setup, ready the counter, and make your first sale.",
  openGraph: {
    title: "Kiosk Desktop onboarding",
    description:
      "Download, install, set up the counter, and ring up your first sale — a complete walkthrough for a brand-new till.",
    type: "website",
  },
};

/* Page                                                                */
/* ------------------------------------------------------------------ */

const TOC: TocItem[] = [
  { id: "intro", label: "1 · What you'll do today" },
  { id: "before-you-start", label: "2 · Before you start" },
  { id: "install", label: "3 · Install the app" },
  { id: "first-launch", label: "4 · First launch" },
  { id: "setup-wizard", label: "5 · The setup wizard" },
  { id: "first-checklist", label: "6 · Ready the counter" },
  {
    id: "daily-rhythm",
    label: "7 · Open for business",
    children: [
      { id: "rhythm-open", label: "Open the shift" },
      { id: "rhythm-tender", label: "Take payment" },
      { id: "rhythm-close", label: "Close the shift" },
    ],
  },
  { id: "backup-habit", label: "8 · The backup habit" },
  {
    id: "troubleshooting",
    label: "9 · If something goes wrong",
    children: [
      { id: "trouble-boot", label: "The “couldn't start” dialog" },
      { id: "trouble-ports", label: "Ports & log files" },
      { id: "trouble-reset", label: "Full reset" },
    ],
  },
  { id: "faq", label: "Frequently asked questions" },
];

export default function DesktopOnboardingPage() {
  return (
    <div className={cn(landingSectionClass, "!pb-16 sm:!pb-24")}>
      <div className="mx-auto max-w-[1120px]">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header>
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Download", href: "/download" },
              { label: "Desktop onboarding" },
            ]}
            className="mb-8"
          />
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)]">
              <Rocket className="h-5 w-5 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
            </span>
            <p className={sectionLabelPillClass}>Onboarding walkthrough</p>
          </div>
          <h1 className="mt-5 max-w-[20ch] font-heading text-[clamp(2rem,6vw,3.4rem)] leading-[1.06] tracking-[-0.035em] text-[var(--kiosk-text)]">
            From blank PC to first sale, in one afternoon
          </h1>
          <Lead>
            A step-by-step walkthrough for a brand-new till. You&apos;ll install
            Kiosk Desktop, survive the one-time first launch, set up your
            counter, and ring up a real sale — no internet, no extra programs,
            no account to reach.
          </Lead>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> ~18 min read
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Updated 20 Aug 2026
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" aria-hidden /> Windows · macOS
            </span>
          </div>
        </header>

        {/* ── "Your path today" jump strip ─────────────────────────── */}
        <nav aria-label="Jump to a stage" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "#install",
              icon: <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "Install",
              text: "Download, run the installer, launch the app.",
            },
            {
              href: "#first-launch",
              icon: <HardDrive className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "First launch",
              text: "The one-minute database build. Happens once.",
            },
            {
              href: "#first-checklist",
              icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "Ready the counter",
              text: "Products, float, printer, cashier PIN.",
            },
            {
              href: "#daily-rhythm",
              icon: <ShoppingCart className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "First sale",
              text: "Open a shift, sell, close the day.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-4 transition-colors hover:border-[var(--kiosk-gold-border)]"
            >
              <span className="flex items-center justify-between text-[var(--kiosk-gold)]">
                {card.icon}
                <ArrowRight
                  className="h-4 w-4 text-[var(--kiosk-text-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--kiosk-gold)]"
                  aria-hidden
                />
              </span>
              <span className="mt-3 block font-heading text-[15px] font-semibold text-[var(--kiosk-text)]">
                {card.title}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[var(--kiosk-text-faint)]">
                {card.text}
              </span>
            </Link>
          ))}
        </nav>

        {/* ── Body: TOC + prose ───────────────────────────────────── */}
        <div className="mt-14 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <GuideToc items={TOC} />
          </aside>

          <div className="min-w-0 max-w-[68ch] space-y-14">
            {/* ══ 1 · What you'll do today ══ */}
            <section id="intro" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Rocket className="h-4 w-4" aria-hidden />}
                step="Part 01"
                title="What you'll do today"
                id="intro"
              >
                Four parts: install, first launch, ready the counter, first
                sale. By the end you&apos;ll have a till that takes cash, tracks
                stock, and closes the day with a number you can trust.
              </SectionHeader>

              <P>
                This walkthrough follows the path of a brand-new install, in
                the order you&apos;ll actually do it. Each part tells you what
                should appear on the screen, what it means, and what to do if
                it doesn&apos;t. It&apos;s written for a <Strong>single
                cashier on a single till</Strong> — the setup most shops start
                with. Adding a second till later is covered at the end.
              </P>

              <H3 id="what-you-end-with">What you&apos;ll have when you finish</H3>
              <Bullets
                items={[
                  <>
                    <Strong>A till that sells offline.</Strong> No internet, no
                    account to reach — the shop runs even when the network
                    doesn&apos;t.
                  </>,
                  <>
                    <Strong>Your products in stock, with prices.</Strong> Add
                    them by hand or import from a spreadsheet.
                  </>,
                  <>
                    <Strong>A drawer that balances.</Strong> Open a shift with
                    the opening float, sell all day, close with the exact
                    expected cash.
                  </>,
                  <>
                    <Strong>The backup habit.</Strong> Two minutes a day that
                    make a dead PC an inconvenience instead of a disaster.
                  </>,
                ]}
              />
              <Callout tone="note" title="Prefer the reference version?">
                This is the getting-started walkthrough. The{" "}
                <Link
                  href="/desktop/guide"
                  className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                >
                  complete desktop guide
                </Link>{" "}
                covers the same app as a reference — LAN tills, suppliers,
                credit tabs, and when to move to the cloud.
              </Callout>
            </section>

            {/* ══ 2 · Before you start ══ */}
            <section id="before-you-start" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Package className="h-4 w-4" aria-hidden />}
                step="Part 02"
                title="Before you start"
                id="before-you-start"
              >
                Nothing exotic — a PC, a few minutes, and (optionally) the
                printer that will live on the counter.
              </SectionHeader>

              <H3 id="what-you-need">What you need</H3>
              <DataTable
                head={["Item", "Need it?", "Why"]}
                rows={[
                  [
                    "A 64-bit PC — Windows 10/11 or macOS",
                    "Yes",
                    "Runs the whole system: the app, the database, and the printer bridge.",
                  ],
                  [
                    "About 2 GB of free disk space",
                    "Yes",
                    "The installer plus the data folder that will hold your shop.",
                  ],
                  [
                    "4 GB of RAM (8 GB better)",
                    "Recommended",
                    "Smooth selling now, and headroom for browser tills on the LAN later.",
                  ],
                  [
                    "Receipt printer (ESC/POS, network)",
                    "Optional",
                    "Paper receipts and the cash-drawer kick. You can start without one.",
                  ],
                  [
                    "Barcode scanner or scale",
                    "Optional",
                    "Speed up the counter. Plug them in whenever they arrive.",
                  ],
                  [
                    "Internet connection",
                    "No",
                    "Selling, stock, tabs, shifts, and reports are all local. Only cloud features (M-Pesa STK, SMS) need the internet — Desktop doesn&apos;t use those.",
                  ],
                ]}
              />

              <Callout tone="tip" title="One file does everything">
                The installer carries the app, its own database engine, and a
                bundled Java runtime — there&apos;s nothing else to download or
                configure. Setup works fully offline, right out of the box.
              </Callout>
            </section>

            {/* ══ 3 · Install the app ══ */}
            <section id="install" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Download className="h-4 w-4" aria-hidden />}
                step="Part 03"
                title="Install the app"
                id="install"
              >
                Grab the installer from the download page and run it. The
                exact clicks differ slightly between Windows and macOS.
              </SectionHeader>

              <H3 id="install-windows">Windows</H3>
              <Steps
                items={[
                  <>
                    Open the{" "}
                    <Link
                      href="/download"
                      className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                    >
                      download page
                    </Link>{" "}
                    on the till PC and download the{" "}
                    <Strong>Windows 64-bit installer</Strong> (about 400&nbsp;MB).
                  </>,
                  <>
                    Run the installer. It copies the app, the bundled database,
                    and the runtimes into place — a couple of minutes, no
                    decisions needed.
                  </>,
                  <>
                    If SmartScreen shows{" "}
                    <InlineCode>Windows protected your PC</InlineCode>, click{" "}
                    <InlineCode>More info → Run anyway</InlineCode>. This is
                    expected until the installer is code-signed; the file is
                    the one you just downloaded from the site.
                  </>,
                  <>
                    Launch <Strong>Kiosk Desktop</Strong> from the Start menu
                    or the desktop shortcut.
                  </>,
                ]}
              />

              <H3 id="install-macos">macOS</H3>
              <Steps
                items={[
                  <>
                    Download the <Strong>macOS</Strong> app from the download
                    page.
                  </>,
                  <>
                    Open the downloaded file and drag <Strong>Kiosk</Strong>{" "}
                    into <Strong>Applications</Strong>.
                  </>,
                  <>
                    First launch only: if Gatekeeper says the app is from an
                    unidentified developer, right-click the app →{" "}
                    <InlineCode>Open</InlineCode> → <InlineCode>Open</InlineCode>{" "}
                    again in the confirmation dialog.
                  </>,
                  <>
                    Launch Kiosk from Applications.
                  </>,
                ]}
              />

              <Callout tone="warning" title="Antivirus may ask">
                The installer bundles a database engine and a Java runtime, and
                some scanners treat unfamiliar bundled runtimes as suspicious.
                If your antivirus quarantines part of the app, allow the Kiosk
                Desktop folder as a trusted app and reinstall. Kiosk Desktop is
                fully offline and makes no network calls of its own.
              </Callout>
            </section>

            {/* ══ 4 · First launch ══ */}
            <section id="first-launch" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<HardDrive className="h-4 w-4" aria-hidden />}
                step="Part 04"
                title="First launch"
                id="first-launch"
              >
                The only slow moment in the whole setup — and it never happens
                again.
              </SectionHeader>

              <P>
                The first time you launch Kiosk Desktop you&apos;ll see a splash
                screen with a message like{" "}
                <InlineCode>Starting your till…</InlineCode>. Behind that
                message the app is doing something important:{" "}
                <Strong>building your private database from scratch</Strong>.
                It creates the local database engine, generates a secure
                password for it, and applies the full schema — 220+ steps.
              </P>

              <Steps
                items={[
                  <>
                    <Strong>Splash appears.</Strong> &ldquo;Starting your
                    till…&rdquo; — the app is initializing the database.
                  </>,
                  <>
                    <Strong>Wait about a minute.</Strong> On a slow PC or with
                    antivirus scanning the new files it can take a few. This is
                    normal — it only happens once.
                  </>,
                  <>
                    <Strong>Don&apos;t close the window.</Strong> Closing
                    mid-setup leaves the database half-built. If it happens,
                    just relaunch — and since you have no data yet, the worst
                    case is a clean reinstall (Part 9).
                  </>,
                  <>
                    <Strong>The setup wizard appears.</Strong> That&apos;s the
                    signal the database is ready — Part 5.
                  </>,
                ]}
              />
              <Callout tone="tip" title="Every later launch is seconds">
                From now on Kiosk starts its database and the app in a few
                seconds. The long first launch is a one-time cost of having a
                real database that belongs to this PC.
              </Callout>
            </section>

            {/* ══ 5 · The setup wizard ══ */}
            <section id="setup-wizard" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<UserPlus className="h-4 w-4" aria-hidden />}
                step="Part 05"
                title="The setup wizard"
                id="setup-wizard"
              >
                A handful of fields and you&apos;re on the dashboard. Everything
                you enter here can be changed later.
              </SectionHeader>

              <Steps
                items={[
                  <>
                    <Strong>Create the owner account.</Strong> Your name, an
                    email, and a password. The owner runs the whole shop —
                    staff, settings, licenses. Don&apos;t forget the password;
                    it&apos;s the keys to the building.
                  </>,
                  <>
                    <Strong>Set a PIN.</Strong> You&apos;ll use it to unlock the
                    till when it&apos;s locked and to identify yourself at the
                    counter.
                  </>,
                  <>
                    <Strong>Name your business.</Strong> This appears on
                    receipts and reports — pick the name customers will
                    recognize.
                  </>,
                  <>
                    <Strong>Done.</Strong> Kiosk opens the dashboard. Your
                    shop is alive — with zero products, zero sales, and a
                    fresh ledger.
                  </>,
                ]}
              />

              <Callout tone="note" title="Your 30-day trial starts now">
                Every install begins with a full 30-day trial — nothing is
                locked. When the trial ends you apply a license key from your
                vendor under Settings → Desktop → License. If it ever expires,
                sales and stock changes pause but your reports and history stay
                readable, and backups keep working.
              </Callout>
            </section>

            {/* ══ 6 · Ready the counter ══ */}
            <section id="first-checklist" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
                step="Part 06"
                title="Ready the counter"
                id="first-checklist"
              >
                Five small jobs before your first real customer. Do them in
                order and the first sale is a formality.
              </SectionHeader>

              <Steps
                items={[
                  <>
                    <Strong>Add your products.</Strong> Inventory → add items
                    with a price. Add barcodes if you have them, or print
                    labels; you can also import a whole list from a
                    spreadsheet. Start with the ten things you sell most — the
                    rest can trickle in later.
                  </>,
                  <>
                    <Strong>Set your opening float.</Strong> The notes and
                    coins you&apos;ll put in the drawer at the start of the day.
                    This is the baseline the shift counts against.
                  </>,
                  <>
                    <Strong>Set up the receipt printer</Strong> (Settings →
                    Desktop → Receipt printer) if you have one — the three
                    modes are below.
                  </>,
                  <>
                    <Strong>Create a cashier PIN</Strong> (Settings → Staff) so
                    sales are attributed to the person at the counter — or just
                    sell as the owner for now. You can add staff any time.
                  </>,
                  <>
                    <Strong>Make a test sale.</Strong> Cash, then a credit tab.
                    Check the receipt prints (or the file appears) and the
                    drawer kicks on a cash sale.
                  </>,
                ]}
              />

              <H3 id="printer-modes">The three printer modes</H3>
              <DataTable
                head={["Mode", "When to use it"]}
                rows={[
                  [
                    "File",
                    "Testing — receipts append to a file instead of paper.",
                  ],
                  [
                    "Network (RAW 9100)",
                    "Real shops — point it at the printer&apos;s IP and receipts print directly. The cash-drawer kick uses the same connection.",
                  ],
                  [
                    "Disabled",
                    "No printer attached; the POS falls back to normal browser printing.",
                  ],
                ]}
              />
              <Callout tone="tip" title="Sell a real item, not a test one">
                Ring up an actual product, tender it as cash, and print the
                receipt. You now know the drawer, the printer, and the ledger
                agree with each other — that&apos;s the whole shop working.
              </Callout>
            </section>

            {/* ══ 7 · Open for business ══ */}
            <section id="daily-rhythm" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<ShoppingCart className="h-4 w-4" aria-hidden />}
                step="Part 07"
                title="Open for business"
                id="daily-rhythm"
              >
                A till day has a shape: open, sell, close. Follow it and the
                cash in the drawer always matches the ledger — that&apos;s the
                whole trick of a shop.
              </SectionHeader>

              <H3 id="rhythm-open">Open the shift</H3>
              <P>
                From the cashier screen, open a new shift and enter the opening
                float. From this moment, every sale, drawout, and refund is
                recorded against this shift. If your counter has several
                cashiers, only one shift is open at a time — handovers happen
                at close.
              </P>

              <H3 id="rhythm-sell">Sell</H3>
              <Bullets
                items={[
                  <>
                    <Strong>Scan a barcode</Strong> — it lands in the cart
                    instantly.
                  </>,
                  <>
                    <Strong>Search by name</Strong> if there&apos;s no barcode —
                    the shelf updates as you type.
                  </>,
                  <>
                    <Strong>Weighed items</Strong> — plug in a scale and sell
                    by weight; the price follows the weight.
                  </>,
                  <>
                    <Strong>Apply a discount</Strong> per line or to the whole
                    cart where you&apos;ve allowed it.
                  </>,
                ]}
              />

              <H3 id="rhythm-tender">Take payment</H3>
              <Bullets
                items={[
                  <>
                    <Strong>Cash</Strong> — key the amount given; the app shows
                    the change to return. Split payment lets you take part
                    cash, part tab, or part wallet in one sale.
                  </>,
                  <>
                    <Strong>Credit tab</Strong> — attach the sale to a customer
                    who owes you; their tab balance updates immediately.
                  </>,
                  <>
                    <Strong>Customer wallet</Strong> — deduct from money the
                    customer has deposited with you in advance.
                  </>,
                  <>
                    <Strong>Loyalty</Strong> — let the customer redeem points
                    toward the bill.
                  </>,
                ]}
              />

              <H3 id="rhythm-receipt">Print the receipt</H3>
              <P>
                On Desktop, receipts go through the built-in device bridge to
                your ESC/POS printer — no browser print dialog. The same bridge
                fires the cash-drawer kick when a cash sale completes.
              </P>

              <H3 id="rhythm-close">Close the shift</H3>
              <P>
                At the end of the day (or when the cashier hands over), close
                the shift and count the drawer. Kiosk totals the expected cash
                from the ledger; the difference between expected and counted is
                your <Strong>variance</Strong> — zero is a perfect day.
                Drawouts (cash removed mid-shift) are tracked separately so
                they never look like shortages.
              </P>
              <Callout tone="tip" title="Step away? Lock the till">
                The cashier can lock the screen with their PIN when they leave
                the counter. Nobody touches the drawer while they&apos;re gone,
                and half-finished carts survive a restart — a power blip
                doesn&apos;t lose a customer&apos;s basket.
              </Callout>
            </section>

            {/* ══ 8 · The backup habit ══ */}
            <section id="backup-habit" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Archive className="h-4 w-4" aria-hidden />}
                step="Part 08"
                title="The backup habit"
                id="backup-habit"
              >
                A desktop shop has one copy of everything, on one disk. A
                backup is not optional — it&apos;s the difference between
                &ldquo;lost an afternoon&rdquo; and &ldquo;lost the
                ledger.&rdquo;
              </SectionHeader>

              <Steps
                items={[
                  <>
                    <Strong>Settings → Desktop → Backups → Backup now.</Strong>{" "}
                    The file lands in the <InlineCode>backups/</InlineCode>{" "}
                    folder of your data directory.
                  </>,
                  <>
                    <Strong>Back up at least daily</Strong> — the evening
                    habit: close the shift, run the backup. Two minutes.
                  </>,
                  <>
                    <Strong>Copy the backup off the PC</Strong> — a flash
                    drive, another machine, anywhere. A backup on the same disk
                    as the shop is not a backup.
                  </>,
                  <>
                    <Strong>To restore:</Strong> Settings → Desktop → Backups →
                    Restore next to the file. It overwrites the database and
                    asks you to restart Kiosk.
                  </>,
                ]}
              />
              <Callout tone="warning" title="When to back up extra">
                Besides the daily habit, run a backup before anything risky:
                a big stocktake, a version upgrade, or — especially — before
                restoring an older backup. Restoring is safe and reversible by
                restoring again, but only if the file you&apos;d want exists.
              </Callout>
            </section>

            {/* ══ 9 · If something goes wrong ══ */}
            <section id="troubleshooting" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Wrench className="h-4 w-4" aria-hidden />}
                step="Part 09"
                title="If something goes wrong"
                id="troubleshooting"
              >
                Kiosk writes a detailed log for everything it does. Most
                problems announce themselves there long before they reach your
                eyes.
              </SectionHeader>

              <H3 id="trouble-boot">The &ldquo;Kiosk couldn&apos;t start&rdquo; dialog</H3>
              <P>
                On Windows, if the app doesn&apos;t come up, the launcher can
                show a dialog that looks like this:
              </P>
              <div className="rounded-xl border border-[var(--kiosk-danger)]/30 bg-[var(--kiosk-danger-bg)] p-4 font-mono text-[12.5px] leading-relaxed text-[var(--kiosk-text-soft)]">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-danger)]">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  You might see this dialog
                </p>
                <p>Kiosk couldn&apos;t start</p>
                <p className="mt-1">
                  Backend never reported healthy: /actuator/health never
                  returned 200 within 90s (last error:
                  http://127.0.0.1:5050/actuator/health: Connection Failed:
                  Connect error: No connection could be made because the target
                  machine actively refused it. (os error 10061))
                </p>
                <p className="mt-1">
                  Log file: C:\Users\Fabian\AppData\Roaming\Palmart\kiosk.log
                </p>
              </div>

              <P>
                Here&apos;s what it means. The launcher starts the app&apos;s
                backend, then waits for a health check on port 5050 before
                opening the window. <Strong>&ldquo;Actively refused it (os
                error 10061)&rdquo;</Strong> is Windows&apos; way of saying
                nothing is listening on 5050 yet — either the backend is still
                booting, or it stopped while booting.
              </P>
              <Steps
                items={[
                  <>
                    <Strong>Reinstall with the latest installer.</Strong>{" "}
                    Downloads published after this message was written wait up
                    to five minutes instead of ninety seconds — a slow first
                    launch on a modest PC is no longer a false alarm. If the
                    backend really does crash, the newer dialog names the exact
                    log file instead of waiting silently.
                  </>,
                  <>
                    <Strong>Read kiosk.log.</Strong> Its path is printed in the
                    dialog. Open it and look at the last lines — they say
                    exactly what happened. On Windows it lives at{" "}
                    <InlineCode>C:\Users\&lt;you&gt;\AppData\Roaming\Palmart\kiosk.log</InlineCode>.
                  </>,
                  <>
                    <Strong>If the dialog names backend.out.log or
                    backend.err.log</Strong>, open those too — they hold the
                    backend&apos;s own story, including any crash.
                  </>,
                  <>
                    <Strong>Make sure nothing else holds the ports.</Strong>{" "}
                    Another program on port 5050 or 33306 will stop Kiosk
                    from starting. Close the other program (or uninstall it)
                    and launch Kiosk again.
                  </>,
                  <>
                    <Strong>Antivirus again?</Strong> If your scanner quarantined
                    part of the app on install, allow the Kiosk folder and
                    reinstall.
                  </>,
                  <>
                    <Strong>Still stuck?</Strong> Send the kiosk.log file to
                    support. That one file is the whole story.
                  </>,
                ]}
              />

              <H3 id="trouble-ports">Ports &amp; log files</H3>
              <P>
                Kiosk Desktop uses three local ports. They belong to this PC —
                you shouldn&apos;t need to touch them, but they explain almost
                every startup error:
              </P>
              <DataTable
                head={["Port", "What runs there", "Purpose"]}
                rows={[
                  [
                    "5050",
                    <>
                      The app (HTTP). Open{" "}
                      <InlineCode>http://127.0.0.1:5050</InlineCode> on this PC.
                    </>,
                    "The POS itself — the UI and the API.",
                  ],
                  [
                    "33306",
                    "The bundled database",
                    "Where sales, stock, and customers live. Internal — you shouldn't need to touch it.",
                  ],
                  [
                    "19500",
                    "The device bridge",
                    "Receives ESC/POS print jobs and drawer kicks from the app.",
                  ],
                ]}
              />
              <div className="mt-6">
                <P>
                  Everything — data, media, backups, logs — lives in one
                  per-user folder:
                </P>
              </div>
              <DataTable
                head={["OS", "Data folder"]}
                rows={[
                  [
                    "Windows",
                    <InlineCode key="w">
                      %APPDATA%\Palmart (C:\Users\&lt;you&gt;\AppData\Roaming\Palmart)
                    </InlineCode>,
                  ],
                  [
                    "macOS",
                    <InlineCode key="m">~/Library/Application Support/Palmart</InlineCode>,
                  ],
                ]}
              />
              <Bullets
                items={[
                  <>
                    <InlineCode>kiosk.log</InlineCode> — the launcher&apos;s
                    diary; start here.
                  </>,
                  <>
                    <InlineCode>backend.out.log</InlineCode> /{" "}
                    <InlineCode>backend.err.log</InlineCode> — the backend
                    itself.
                  </>,
                  <>
                    <InlineCode>mariadb.log</InlineCode> — the database.
                  </>,
                  <>
                    <InlineCode>backups/</InlineCode> — backups you create.
                  </>,
                ]}
              />

              <H3 id="trouble-symptoms">Common symptoms, quick fixes</H3>
              <DataTable
                head={["Symptom", "Likely cause", "What to do"]}
                rows={[
                  [
                    "App opens but shows nothing",
                    "A background component failed to start.",
                    "Open kiosk.log in the data folder — the last lines say exactly what failed. If in doubt, send the file to support.",
                  ],
                  [
                    "First launch takes over a minute",
                    "The database is being created for the first time.",
                    "Wait — it only happens once. Don't close the window mid-setup.",
                  ],
                  [
                    "“Port 5050 (or 33306) is already in use”",
                    "Another program holds the port.",
                    "Close the other program, or uninstall it, then launch Kiosk again.",
                  ],
                  [
                    "Antivirus quarantines part of the app",
                    "Bundled runtimes look unfamiliar to some scanners.",
                    "Allow the Kiosk Desktop folder as a trusted app, then reinstall. The app is fully offline and makes no network calls of its own.",
                  ],
                  [
                    "After a restore the app won't start",
                    "The restore interrupted the running database.",
                    "Restart the PC, then launch Kiosk again. If it still won't start, restore from the most recent backup before the bad one.",
                  ],
                ]}
              />

              <H3 id="trouble-reset">Full reset</H3>
              <P>
                To start completely fresh: uninstall Kiosk Desktop, then delete
                the data folder for your OS (above). This removes the database,
                media, and logs — keep a backup file somewhere safe first,
                because nothing survives a reset. Reinstall and the first
                launch builds a brand-new database (Part 4, again).
              </P>
            </section>

            {/* ══ FAQ ══ */}
            <section id="faq" className="scroll-mt-24 space-y-5">
              <H2 id="faq">Frequently asked questions</H2>
              <Faq
                items={[
                  {
                    q: "Does the shop need internet to sell?",
                    a: (
                      <>
                        No. Selling, stock, tabs, shifts, and reports run
                        entirely on the PC. Only M-Pesa STK and outbound SMS
                        (cloud features) need the internet, and Desktop doesn&apos;t
                        use those.
                      </>
                    ),
                  },
                  {
                    q: "The first launch is slow — is that normal?",
                    a: (
                      <>
                        Yes. The first launch builds the entire database from
                        scratch (220+ schema steps) and can take a minute or
                        two on a modest PC. It happens exactly once; every
                        later launch is seconds.
                      </>
                    ),
                  },
                  {
                    q: "I closed the window during first launch. Now what?",
                    a: (
                      <>
                        Just launch Kiosk again. Because you have no data yet,
                        the worst case is a clean start: uninstall, delete the
                        data folder, reinstall. Nothing is lost before your
                        first sale.
                      </>
                    ),
                  },
                  {
                    q: "Can I add a second till later?",
                    a: (
                      <>
                        Yes — enable Share on LAN (Settings → Desktop) and any
                        device on the same Wi-Fi opens the till in its browser,
                        writing to the same database. The{" "}
                        <Link
                          href="/desktop/guide#many-cashiers"
                          className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                        >
                          complete guide
                        </Link>{" "}
                        walks through it.
                      </>
                    ),
                  },
                  {
                    q: "What happens to my data if the PC dies?",
                    a: (
                      <>
                        That&apos;s what backups are for. Run one daily and copy
                        it off the PC; restore it onto the replacement machine
                        and the shop comes back. Without a backup, the data is
                        on that disk only.
                      </>
                    ),
                  },
                  {
                    q: "Is there a monthly fee?",
                    a: (
                      <>
                        Desktop starts with a 30-day trial, then runs on a
                        license key from your vendor — one license per machine.
                        There&apos;s no usage metering; it&apos;s a flat offline
                        subscription.
                      </>
                    ),
                  },
                  {
                    q: "Can I take M-Pesa on Desktop?",
                    a: (
                      <>
                        Not STK push — that&apos;s a cloud feature. On Desktop
                        you take cash, credit tabs, wallet, and loyalty
                        offline. When the shop outgrows one PC, the{" "}
                        <Link
                          href="/desktop/guide#outgrow"
                          className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                        >
                          guide explains the move to the cloud
                        </Link>
                        .
                      </>
                    ),
                  },
                ]}
              />
            </section>

            {/* ── Closing CTA ─────────────────────────────────────── */}
            <footer className="rounded-2xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-6 py-8 text-center sm:px-10">
              <p className="mx-auto flex items-center justify-center gap-2 font-heading text-xl tracking-[-0.01em] text-[var(--kiosk-text)]">
                <Store className="h-5 w-5 text-[var(--kiosk-gold)]" aria-hidden />
                You&apos;re one download from your first sale
              </p>
              <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
                Install Kiosk Desktop, run the checklist, and sell today. When
                the shop grows past one PC, we&apos;ll carry the books with
                you.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/download" className={ghostCtaClass}>
                  <Download className="h-4 w-4 text-[var(--kiosk-gold)]" aria-hidden />
                  Download Kiosk Desktop
                </Link>
                <Link
                  href="/desktop/guide"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--kiosk-border)] px-4 py-3 text-sm font-medium text-[var(--kiosk-text-soft)] transition-colors hover:border-[var(--kiosk-border-strong)] hover:text-[var(--kiosk-text)]"
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Read the complete guide
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

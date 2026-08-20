import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  Download,
  Globe,
  HardDrive,
  LifeBuoy,
  Monitor,
  Package,
  RefreshCw,
  Server,
  Shield,
  Store,
  Users,
  Wifi,
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
  title: "Kiosk Desktop — the complete guide | Kiosk",
  description:
    "How to install, run, and grow the Kiosk Desktop POS: one cashier on one till, many cashiers on one LAN, and when to move to Kiosk Cloud.",
  openGraph: {
    title: "Kiosk Desktop — the complete guide",
    description:
      "Install it, open the till, sell, close the shift. Then add cashiers on the LAN — and know exactly when you've outgrown one PC.",
    type: "website",
  },
};

/* Page                                                                */
/* ------------------------------------------------------------------ */

const TOC: TocItem[] = [
  { id: "what-it-is", label: "1 · What Kiosk Desktop is" },
  { id: "one-cashier", label: "2 · One cashier, one shop" },
  { id: "many-cashiers", label: "3 · Many cashiers, one shop" },
  { id: "running-the-shop", label: "4 · Running the shop" },
  { id: "keeping-healthy", label: "5 · Keeping it healthy" },
  { id: "outgrow", label: "6 · When you outgrow one PC" },
  { id: "faq", label: "Frequently asked questions" },
];

export default function DesktopGuidePage() {
  return (
    <div className={cn(landingSectionClass, "!pb-16 sm:!pb-24")}>
      <div className="mx-auto max-w-[1120px]">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header>
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Download", href: "/download" },
              { label: "Desktop guide" },
            ]}
            className="mb-8"
          />
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)]">
              <Monitor className="h-5 w-5 text-[var(--kiosk-gold)]" strokeWidth={1.75} aria-hidden />
            </span>
            <p className={sectionLabelPillClass}>Desktop guide</p>
          </div>
          <h1 className="mt-5 max-w-[20ch] font-heading text-[clamp(2rem,6vw,3.4rem)] leading-[1.06] tracking-[-0.035em] text-[var(--kiosk-text)]">
            Run your shop on one PC. Offline-first.
          </h1>
          <Lead>
            Kiosk Desktop turns a single computer into your whole shop system —
            the till, the stock ledger, the customer tabs, the printer bridge,
            and the database, all local. This guide walks you from your first
            sale to a counter with several cashiers, and tells you exactly when
            it&apos;s time to move up.
          </Lead>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> ~14 min read
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Updated 20 Aug 2026
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" aria-hidden /> Windows · macOS
            </span>
          </div>
        </header>

        {/* ── "Which setup are you?" jump strip ───────────────────── */}
        <nav aria-label="Jump to your setup" className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "#one-cashier",
              icon: <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "One till",
              text: "You and the counter. Start here.",
            },
            {
              href: "#many-cashiers",
              icon: <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "Many cashiers",
              text: "Two or more tills on one shop.",
            },
            {
              href: "#outgrow",
              icon: <Globe className="h-4 w-4" strokeWidth={1.75} aria-hidden />,
              title: "Outgrew one PC",
              text: "Branches, uptime, online payments.",
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
            {/* ══ 1 · What it is ══ */}
            <section id="what-it-is" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<HardDrive className="h-4 w-4" aria-hidden />}
                step="Part 01"
                title="What Kiosk Desktop is"
                id="what-it-is"
              >
                One computer, everything local. No account to reach, no server
                to depend on — the shop runs even when the internet doesn&apos;t.
              </SectionHeader>

              <P>
                Kiosk Desktop installs the complete point-of-sale on the till
                computer. The <Strong>same app you use in the cloud</Strong> —
                same cashier screen, same inventory, same customer tabs — but
                instead of talking to our servers, it talks to a database that
                lives on the PC itself. Sales, stock, and shifts keep working
                with the internet cable unplugged.
              </P>

              <H3 id="whats-in-the-box">What&apos;s in the box</H3>
              <Bullets
                items={[
                  <>
                    <Strong>The POS app</Strong> — cashier screen, inventory,
                    suppliers, reports, settings. The same Kiosk you&apos;d use
                    online.
                  </>,
                  <>
                    <Strong>A bundled database</Strong> — a private MariaDB
                    instance that belongs to this install. Your data never
                    leaves the PC unless you share it on the LAN.
                  </>,
                  <>
                    <Strong>A bundled Java runtime and WebView</Strong> — nothing
                    else to install on the machine. Windows installs also carry
                    the WebView2 runtime, so setup works fully offline.
                  </>,
                  <>
                    <Strong>A printer &amp; cash-drawer bridge</Strong> — ESC/POS
                    receipts go straight to a network receipt printer, and the
                    drawer kick fires from the till.
                  </>,
                ]}
              />

              <H3 id="ports">Ports the app uses</H3>
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
              <Callout tone="note" title="Ports in use">
                If another program is already holding 5050 or 33306, Kiosk
                Desktop won&apos;t start and shows a clear error. Close the
                other program (or uninstall it) and launch Kiosk again.
              </Callout>

              <H3 id="where-data-lives">Where your data lives</H3>
              <P>
                Everything is under one per-user folder. Deleting it is
                effectively a factory reset, so treat it with care:
              </P>
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
                    <InlineCode>db/</InlineCode> — the database files.
                  </>,
                  <>
                    <InlineCode>backups/</InlineCode> — backups you create from
                    Settings → Desktop.
                  </>,
                  <>
                    <InlineCode>media/</InlineCode> — product photos you upload
                    locally.
                  </>,
                  <>
                    <InlineCode>kiosk.log</InlineCode>, <InlineCode>mariadb.log</InlineCode>,{" "}
                    <InlineCode>backend.out.log</InlineCode> — diagnostic logs.
                    If something ever looks wrong, these are the first place
                    support will ask you to look.
                  </>,
                ]}
              />

              <Callout tone="warning" title="What needs the internet">
                <Strong>M-Pesa STK push is an online feature.</Strong> On
                Desktop you take cash, credit tabs, wallet, and loyalty
                offline. There&apos;s also no outbound SMS or WhatsApp from a
                desktop install — payment reminders and phone-verification
                texts belong to the cloud. Everything else — selling, stock,
                suppliers, shifts, reports, backups — is fully local.
              </Callout>
            </section>

            {/* ══ 2 · One cashier, one shop ══ */}
            <section id="one-cashier" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Store className="h-4 w-4" aria-hidden />}
                step="Part 02"
                title="One cashier, one shop"
                id="one-cashier"
              >
                The whole system, one person, one counter. This is the setup
                most shops start with — and it covers you for a long time.
              </SectionHeader>

              <H3 id="install">Install the app</H3>
              <Steps
                items={[
                  <>
                    Download the installer for your machine from the{" "}
                    <Link href="/download" className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline">
                      download page
                    </Link>{" "}
                    — Windows 64-bit or macOS.
                  </>,
                  <>
                    <Strong>Windows:</Strong> run the installer. If SmartScreen
                    warns about an unknown publisher, choose{" "}
                    <InlineCode>More info → Run anyway</InlineCode> until the
                    installer is signed. <Strong>macOS:</Strong> drag the app
                    into Applications; if Gatekeeper complains, right-click →
                    Open → Open.
                  </>,
                  <>
                    Launch <Strong>Kiosk Desktop</Strong>. A splash screen
                    appears with the message &ldquo;Starting your till&hellip;&rdquo; —
                    the first launch initializes the local database and applies
                    the schema, which takes about a minute. This only happens
                    once.
                  </>,
                  <>
                    The app opens the <Strong>setup wizard</Strong>. Create the
                    shop owner account, name your business, and you land in the
                    dashboard.
                  </>,
                ]}
              />
              <Callout tone="tip" title="First launch is slow on purpose">
                A fresh install builds the whole database from scratch (220+
                schema steps). It&apos;s a minute, once. Every later launch is
                seconds.
              </Callout>

              <H3 id="day-one">Your first day — the checklist</H3>
              <Steps
                items={[
                  <>
                    <Strong>Add your products.</Strong> Inventory → add items
                    with a price; print or apply barcodes if you have a label
                    printer. You can also import from a spreadsheet.
                  </>,
                  <>
                    <Strong>Set your opening float</Strong> — the cash you start
                    the day with in the drawer.
                  </>,
                  <>
                    <Strong>Set up the receipt printer</Strong> (Settings →
                    Desktop → Receipt printer) if you have one — see{" "}
                    <a href="#keeping-healthy" className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline">
                      Part 5
                    </a>
                    .
                  </>,
                  <>
                    <Strong>Invite your cashier</Strong> (Settings → Staff) with
                    a PIN, or just sell as the owner for now.
                  </>,
                  <>
                    <Strong>Make a test sale</Strong> — cash, then a credit tab
                    — and check the receipt prints correctly.
                  </>,
                ]}
              />

              <H3 id="daily-rhythm">The daily rhythm</H3>
              <P>
                A till day has a shape: open, sell, close. If you follow it, the
                cash in the drawer always matches the ledger — that&apos;s the
                whole trick of a shop.
              </P>

              <H3 id="rhythm-open">Open the shift</H3>
              <P>
                From the cashier screen, open a new shift and enter the opening
                float — the notes and coins you put in the drawer. From this
                moment, every sale, drawout, and refund is recorded against this
                shift.
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
                    <Strong>Weighed items</Strong> — plug in a scale and sell by
                    weight; the price follows the weight.
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
                    the change to return. Split payment lets you take part cash,
                    part tab, or part wallet in one sale.
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
                On Desktop, receipts go through the device bridge to your
                ESC/POS printer — no browser print dialog. The same bridge fires
                the cash-drawer kick when a cash sale completes.
              </P>

              <H3 id="rhythm-close">Close the shift</H3>
              <P>
                At the end of the day (or when the cashier hands over), close
                the shift and count the drawer. Kiosk totals the expected cash
                from the ledger; the difference between expected and counted is
                your <Strong>variance</Strong> — zero is a perfect day. Drawouts
                (cash removed mid-shift) are tracked separately so they never
                look like shortages.
              </P>
              <Callout tone="tip" title="The evening habit">
                Close the shift, then run a backup (Settings → Desktop →
                Backups). Two minutes, and tomorrow starts clean.
              </Callout>
            </section>

            {/* ══ 3 · Many cashiers ══ */}
            <section id="many-cashiers" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Users className="h-4 w-4" aria-hidden />}
                step="Part 03"
                title="Two, three… many cashiers"
                id="many-cashiers"
              >
                One shop, one database, several tills. The host PC becomes your
                server — every other till is a browser tab on the same Wi-Fi.
              </SectionHeader>

              <P>
                Kiosk Desktop doesn&apos;t need a second install for a second
                cashier. The PC that runs the app also <Strong>hosts</Strong>{" "}
                it: switch on LAN sharing and any device on the same network —
                another computer, a tablet, a phone in a stand — opens the till
                in its browser. No installs, no licenses per till, one stock
                count, one ledger.
              </P>

              <H3 id="lan-enable">Turn on LAN sharing</H3>
              <Steps
                items={[
                  <>
                    On the host PC, open <Strong>Settings → Desktop → Share on
                    LAN</Strong>.
                  </>,
                  <>
                    Choose <Strong>Enable LAN sharing</Strong>. Kiosk shows the
                    address other devices will use, the local IPs it detected,
                    and a QR code you can point a phone camera at.
                  </>,
                  <>
                    <Strong>Restart Kiosk Desktop</Strong> — the bind change
                    applies on the next launch.
                  </>,
                ]}
              />

              <H3 id="lan-diagram">What the shop looks like</H3>
              <div
                aria-label="LAN layout diagram"
                className="rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-panel)] p-5"
              >
                <div className="mx-auto max-w-[460px] space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-3">
                    <Server className="h-4 w-4 text-[var(--kiosk-gold)]" aria-hidden />
                    <span className="text-sm font-medium text-[var(--kiosk-text)]">
                      Host PC — Kiosk Desktop (app + database)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[var(--kiosk-text-faint)]">
                    <Wifi className="h-4 w-4" aria-hidden />
                    <span className="font-mono text-[11px]">same Wi-Fi network</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Till 1", "Till 2", "Till 3"].map((till) => (
                      <div
                        key={till}
                        className="rounded-lg border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3 py-2.5 text-center"
                      >
                        <Monitor className="mx-auto h-4 w-4 text-[var(--kiosk-text-dim)]" aria-hidden />
                        <p className="mt-1.5 text-[12px] font-medium text-[var(--kiosk-text)]">{till}</p>
                        <p className="text-[10px] text-[var(--kiosk-text-faint)]">browser till</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <H3 id="lan-connect">Add a till</H3>
              <Steps
                items={[
                  <>
                    On the new device, open a browser and go to the LAN address
                    shown in Settings (for example{" "}
                    <InlineCode>http://192.168.1.20:5050</InlineCode>) — or scan
                    the QR code.
                  </>,
                  <>
                    Sign in with a <Strong>cashier account</Strong> (create one
                    under Settings → Staff). Each cashier gets their own PIN
                    login and their sales are attributed to them.
                  </>,
                  <>
                    Open the till, start a shift, and sell — the sale lands in
                    the same database the host uses, so stock and tabs stay in
                    one place.
                  </>,
                ]}
              />

              <H3 id="lan-tips">Setting it up properly</H3>
              <Bullets
                items={[
                  <>
                    <Strong>Give the host PC a fixed IP</Strong> (DHCP
                    reservation in the router) so the till address never
                    changes.
                  </>,
                  <>
                    <Strong>Put the host on a UPS.</Strong> It&apos;s the only
                    machine that holds the database — a clean power supply is
                    cheaper than a restore.
                  </>,
                  <>
                    <Strong>Keep tills off the guest Wi-Fi</Strong> — guest
                    networks often block device-to-device traffic, which is
                    exactly what LAN sharing needs.
                  </>,
                  <>
                    <Strong>A decent router handles 5–10 tills comfortably.</Strong>{" "}
                    The bottleneck is the host PC, not the router: a few dozen
                    browser tills are far beyond a shop&apos;s counter.
                  </>,
                ]}
              />

              <Callout tone="warning" title="One honest limitation">
                The host PC <Strong>is</Strong> the shop. If it&apos;s off or
                its database is down, every till stops — that&apos;s the price
                of having everything on one machine. If your shop needs to sell
                at 2&nbsp;AM on a day the host is in the repair shop, skip to{" "}
                <a href="#outgrow" className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline">
                  Part 6
                </a>
                .
              </Callout>
            </section>

            {/* ══ 4 · Running the shop ══ */}
            <section id="running-the-shop" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Package className="h-4 w-4" aria-hidden />}
                step="Part 04"
                title="Running the shop"
                id="running-the-shop"
              >
                The features that keep a counter honest day after day — stock,
                suppliers, and the people who owe you money.
              </SectionHeader>

              <H3 id="inventory">Inventory &amp; stock</H3>
              <P>
                Products carry prices, barcodes, units, reorder levels, and
                optional expiry dates. Stock moves in three ways:{" "}
                <Strong>receiving</Strong> (stock arrives from a supplier),{" "}
                <Strong>selling</Strong> (leaves the shelf), and{" "}
                <Strong>stocktakes</Strong> (you count what&apos;s actually
                there and adjust). Every movement is recorded, so &ldquo;what
                should be on the shelf&rdquo; is always one screen away.
              </P>

              <H3 id="suppliers">Suppliers &amp; supplies</H3>
              <P>
                Keep a supplier directory, record what you order, and post the
                bill when stock arrives — the cost lands on the product and on
                what-you-owe. Purchases flow into the ledger like everything
                else, so profit reports count real costs, not guesses.
              </P>

              <H3 id="credit-tabs">Credit tabs</H3>
              <P>
                Many shops run a &ldquo;book&rdquo; — customers take goods and
                pay later. In Kiosk that&apos;s a <Strong>credit tab</Strong>:
              </P>
              <Steps
                items={[
                  <>
                    <Strong>Register the customer</Strong> — name and phone
                    number from the cashier screen. The customer appears in the
                    directory with a tab balance.
                  </>,
                  <>
                    <Strong>Sell on tab</Strong> — attach the cart to the
                    customer instead of taking cash. Their balance grows, and
                    the shop&apos;s outstanding total updates.
                  </>,
                  <>
                    <Strong>Collect</Strong> — when they pay, record the
                    payment against their tab. It clears what they owe.
                  </>,
                ]}
              />
              <Callout tone="note" title="A note on verification">
                In the cloud, registering a new tab customer can ask for a phone
                verification text. Desktop has no outbound SMS, so verification
                is handled in person — the cashier (or manager) confirms the
                number at the counter. It&apos;s the same book-keeping; the
                ceremony is just offline.
              </Callout>

              <H3 id="wallet-loyalty">Wallet &amp; loyalty</H3>
              <P>
                Customers can pre-deposit money into a <Strong>wallet</Strong>{" "}
                (pay for it in cash at the counter) and spend from it later.
                Loyalty points accrue on purchases and can be redeemed toward a
                bill — a simple way to keep regulars coming back without a paper
                card.
              </P>

              <H3 id="weighed">Weighed items &amp; the scale</H3>
              <P>
                For vegetables, meat, and anything sold per kilo: attach the
                scale, pick the product, weigh — the cart line follows the
                weight. Prices can be set per unit or per kilo.
              </P>

              <H3 id="offline-till">The till&apos;s safety nets</H3>
              <Bullets
                items={[
                  <>
                    <Strong>Draft carts</Strong> — a half-finished sale survives
                    a restart, so a power blip doesn&apos;t lose a customer&apos;s
                    basket.
                  </>,
                  <>
                    <Strong>Till lock</Strong> — the cashier can lock the screen
                    with a PIN when they step away; nobody touches the drawer
                    while they&apos;re gone.
                  </>,
                  <>
                    <Strong>Split payments</Strong> — cash plus tab, or cash
                    plus wallet, in one transaction, recorded line by line.
                  </>,
                ]}
              />
            </section>

            {/* ══ 5 · Keeping it healthy ══ */}
            <section id="keeping-healthy" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Shield className="h-4 w-4" aria-hidden />}
                step="Part 05"
                title="Keeping it healthy"
                id="keeping-healthy"
              >
                Backups, the license, the printer, and what to do when
                something looks wrong.
              </SectionHeader>

              <H3 id="backups">Backups — the golden rule</H3>
              <P>
                A desktop shop has one copy of everything, on one disk. A backup
                is not optional; it&apos;s the difference between &ldquo;lost an
                afternoon&rdquo; and &ldquo;lost the ledger.&rdquo;
              </P>
              <Steps
                items={[
                  <>
                    <Strong>Settings → Desktop → Backups → Backup now</Strong>.
                    The file lands in the <InlineCode>backups/</InlineCode>
                    folder of your data directory.
                  </>,
                  <>
                    <Strong>Back up at least daily</Strong> — the evening
                    habit: close the shift, run the backup.
                  </>,
                  <>
                    <Strong>Copy the backup off the PC</Strong> — a flash drive,
                    another machine, anywhere. A backup on the same disk as the
                    shop is not a backup.
                  </>,
                  <>
                    <Strong>To restore:</Strong> Settings → Desktop → Backups →
                    Restore next to the file. It overwrites the database and
                    asks you to restart Kiosk.
                  </>,
                ]}
              />

              <H3 id="license">License &amp; trial</H3>
              <P>
                Every install starts with a <Strong>30-day trial</Strong> — the
                full app, nothing locked. After the trial you need a license
                key from your vendor, applied under Settings → Desktop →
                License.
              </P>
              <Callout tone="warning" title="If the license expires">
                Sales and stock changes are blocked; the reports and history
                stay readable, and backups still work. Apply the new key and
                the shop resumes — nothing is lost.
              </Callout>

              <H3 id="printer">Receipt printer setup</H3>
              <P>
                Settings → Desktop → Receipt printer gives you three modes:
              </P>
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
                    "No printer attached; POS falls back to normal browser printing.",
                  ],
                ]}
              />

              <H3 id="troubleshoot">When something looks wrong</H3>
              <P>
                Kiosk writes a detailed log to <InlineCode>kiosk.log</InlineCode>{" "}
                in the data folder. Most problems announce themselves there long
                before they reach your eyes. Here are the common ones:
              </P>
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
                    "Wait — it only happens once. Don&apos;t close the window mid-setup.",
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
                    "A console window flashes and closes",
                    "A helper process started in a visible window.",
                    "Cosmetic — newer builds run helpers hidden. Update to the latest installer.",
                  ],
                  [
                    "After a restore the app won&apos;t start",
                    "The restore interrupted the running database.",
                    "Restart the PC, then launch Kiosk again. If it still won&apos;t start, restore from the most recent backup before the bad one.",
                  ],
                ]}
              />

              <H3 id="reset">Full reset</H3>
              <P>
                To start completely fresh: uninstall Kiosk Desktop, then delete
                the data folder for your OS (see{" "}
                <a href="#where-data-lives" className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline">
                  Part 1
                </a>
                ). This removes the database, media, and logs — keep a backup
                file somewhere safe first, because nothing survives a reset.
              </P>
            </section>

            {/* ══ 6 · Outgrow ══ */}
            <section id="outgrow" className="scroll-mt-24 space-y-5">
              <SectionHeader
                icon={<Globe className="h-4 w-4" aria-hidden />}
                step="Part 06"
                title="When you outgrow one PC"
                id="outgrow"
              >
                Desktop is the right answer for one shop on one network. Here
                are the signs it&apos;s time to move to Kiosk Cloud.
              </SectionHeader>

              <H3 id="outgrow-signs">Signs you&apos;ve outgrown it</H3>
              <Bullets
                items={[
                  <>
                    <Strong>More than one shop</Strong> — a second branch needs
                    its own books under one business, and one manager watching
                    both.
                  </>,
                  <>
                    <Strong>You need to sell when the shop PC isn&apos;t
                    running</Strong> — uptime you can&apos;t get from a single
                    machine.
                  </>,
                  <>
                    <Strong>M-Pesa STK on the counter</Strong> — online payments
                    are a cloud feature; Desktop takes cash and tabs.
                  </>,
                  <>
                    <Strong>You want to watch the shop from home</Strong> —
                    live sales and stock from any device, not just the counter.
                  </>,
                ]}
              />

              <H3 id="desktop-vs-cloud">Desktop vs Cloud at a glance</H3>
              <DataTable
                head={["", "Kiosk Desktop", "Kiosk Cloud"]}
                rows={[
                  [
                    "Internet",
                    "Not needed — runs fully offline",
                    "Required — everything syncs live",
                  ],
                  [
                    "Shops / branches",
                    "One shop, one network",
                    "Many branches under one business",
                  ],
                  [
                    "M-Pesa STK & SMS",
                    "Not available",
                    "STK push, payment reminders, verifications",
                  ],
                  [
                    "Tills",
                    "Browser tills on the same Wi-Fi",
                    "Any device, anywhere",
                  ],
                  [
                    "Oversight",
                    "At the counter",
                    "Reports from any phone or laptop",
                  ],
                  [
                    "Data home",
                    "One PC (back it up!)",
                    "Managed for you",
                  ],
                ]}
              />

              <H3 id="moving">Moving without losing the books</H3>
              <P>
                Your backup file is the bridge: contact your vendor with the
                latest backup and they&apos;ll carry the data — products, stock
                on hand, customers and their tabs, sales history — into your
                cloud business. From then on the same cashier screen runs
                online, with STK and branches on top. You keep Desktop on the
                counter until the switch is done; nothing stops selling while
                you move.
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
                    q: "Can two cashiers sell at the same time?",
                    a: (
                      <>
                        Yes — enable Share on LAN and open a second till in a
                        browser on the same Wi-Fi. Both write to the same
                        database, so stock and tabs stay consistent.
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
                    q: "Can I use Desktop and Cloud at the same time?",
                    a: (
                      <>
                        Not for the same shop — pick one home for the books.
                        Moving between them is done deliberately, via a backup
                        and vendor assistance, not by running both at once.
                      </>
                    ),
                  },
                  {
                    q: "Where do receipts print from on Desktop?",
                    a: (
                      <>
                        Through the built-in ESC/POS bridge — point Settings →
                        Desktop → Receipt printer at your network printer
                        (RAW 9100) and receipts print directly, with the cash
                        drawer kick on cash sales.
                      </>
                    ),
                  },
                ]}
              />
            </section>

            {/* ── Closing CTA ─────────────────────────────────────── */}
            <footer className="rounded-2xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-6 py-8 text-center sm:px-10">
              <p className="mx-auto flex items-center justify-center gap-2 font-heading text-xl tracking-[-0.01em] text-[var(--kiosk-text)]">
                <LifeBuoy className="h-5 w-5 text-[var(--kiosk-gold)]" aria-hidden />
                Ready when you are
              </p>
              <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.7] text-[var(--kiosk-text-soft)]">
                Download Kiosk Desktop, sell your first item today, and grow
                till by till. When the shop outgrows the PC, we&apos;ll carry
                the books with you.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/download" className={ghostCtaClass}>
                  <Download className="h-4 w-4 text-[var(--kiosk-gold)]" aria-hidden />
                  Download Kiosk Desktop
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--kiosk-border)] px-4 py-3 text-sm font-medium text-[var(--kiosk-text-soft)] transition-colors hover:border-[var(--kiosk-border-strong)] hover:text-[var(--kiosk-text)]"
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Browse the help center
                </Link>
              </div>
              <p className="mt-5 text-[13px] text-[var(--kiosk-text-faint)]">
                Brand-new to the till? Start with the{" "}
                <Link
                  href="/desktop/onboarding"
                  className="text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                >
                  onboarding walkthrough
                </Link>{" "}
                instead.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

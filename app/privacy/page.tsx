import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { PLATFORM_DOMAIN } from "@/lib/config";
import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

export const metadata: Metadata = {
  title: `Privacy Notice — Kiosk POS Kenya | ${PLATFORM_DOMAIN}`,
  description: `How ${PLATFORM_DOMAIN} collects, uses, and protects business, staff, and transaction data for shops in Kenya.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Notice"
      updated="28 September 2026"
      intro={`This notice explains what ${PLATFORM_DOMAIN} collects when you run a shop on the platform, why we collect it, and the choices you have. It is written to be read by shop owners, not lawyers.`}
    >
      <LegalSection heading="Who we are">
        <p>
          {KIOSK_PLATFORM_CONTACT.legalName} (&ldquo;Kiosk&rdquo;, &ldquo;we&rdquo;)
          operates {PLATFORM_DOMAIN}, a point-of-sale, inventory, and storefront
          platform for shops in Kenya. For the purposes of the Kenya Data
          Protection Act, 2019, we are the data controller for the account and
          business data described below.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          <strong className="font-semibold text-[var(--kiosk-text)]">
            Account and business details.
          </strong>{" "}
          The business name, the shop address you choose (your
          {" "}yourshop.{PLATFORM_DOMAIN} subdomain), your country, and the owner
          email address used to create and verify the account.
        </p>
        <p>
          <strong className="font-semibold text-[var(--kiosk-text)]">
            Shop operating data.
          </strong>{" "}
          Your catalogue, prices, stock levels, suppliers, staff accounts and
          roles, sales, shifts, and receipts. This is the data you enter to run
          the shop, and it belongs to you.
        </p>
        <p>
          <strong className="font-semibold text-[var(--kiosk-text)]">
            Transaction records.
          </strong>{" "}
          For M-Pesa sales we record the amount, the transaction reference, the
          time, and the till and cashier involved, so your receipts and daily
          reconciliation are accurate.
        </p>
        <p>
          <strong className="font-semibold text-[var(--kiosk-text)]">
            Support and lookup details.
          </strong>{" "}
          When you contact us, or when you use the shop lookup to reach a
          storefront, we process the phone number or email you provide.
        </p>
        <p>
          <strong className="font-semibold text-[var(--kiosk-text)]">
            Technical data.
          </strong>{" "}
          IP address, device and browser type, and pages visited, collected to
          keep the service secure and to understand how the site is used.
        </p>
      </LegalSection>

      <LegalSection heading="Why we use it">
        <p>
          To provide the point of sale, inventory, and storefront you signed up
          for; to instruct and confirm M-Pesa payments at your counter; to sync
          sales made while you were offline; to provide support; to keep the
          platform secure and prevent fraud; and to meet our legal, tax, and
          accounting obligations in Kenya.
        </p>
        <p>
          Where the Act requires a lawful basis, we rely on performance of our
          contract with you, our legitimate interests in running and securing
          the service, your consent for analytics and marketing, and our legal
          obligations.
        </p>
      </LegalSection>

      <LegalSection heading="M-Pesa and payments">
        <p>
          M-Pesa payments are processed through Safaricom&rsquo;s M-Pesa service.
          We send a payment instruction (an STK push) to the customer&rsquo;s
          phone and receive confirmation of the result. We never see or store a
          customer&rsquo;s M-Pesa PIN.
        </p>
        <p>
          We store the transaction reference and amount so that your till,
          receipts, and daily totals reconcile. Safaricom processes that
          transaction under its own terms and privacy notice.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          We do not sell personal data. We share it only with providers who help
          us run the platform: Safaricom for M-Pesa payments, our cloud hosting
          and content delivery provider, our email delivery provider for account
          verification and notices, and analytics providers for aggregate usage
          measurement. Each is bound to use the data only for the service they
          provide to us.
        </p>
        <p>
          We may also disclose data where the law requires it, or to protect the
          rights and safety of the platform, our merchants, or the public.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Account and shop data is kept for as long as your shop is active. If
          you close your account we delete or anonymise it, except where we must
          retain transaction and tax records to comply with Kenyan law, and
          except for backups which expire on a rolling cycle.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Under the Data Protection Act, 2019 you may ask to access your data,
          correct it, delete it, restrict or object to certain processing, and
          request a portable copy. You may withdraw consent for analytics or
          marketing at any time.
        </p>
        <p>
          To exercise any of these rights, write to{" "}
          <a
            href={`mailto:${KIOSK_PLATFORM_CONTACT.email}`}
            className="inline-flex min-h-6 items-center font-medium text-[var(--kiosk-gold)] underline underline-offset-2"
          >
            {KIOSK_PLATFORM_CONTACT.email}
          </a>
          . We will respond within the period the Act allows. If you are not
          satisfied, you may complain to the Office of the Data Protection
          Commissioner (ODPC).
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Data is encrypted in transit, access is limited to staff who need it,
          and each shop&rsquo;s data is separated from every other shop&rsquo;s.
          No system is perfect, so if a breach affecting your data occurs we
          will notify you and the ODPC as the Act requires.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this notice">
        <p>
          If we change this notice we will update the date at the top and, where
          the change is significant, tell account owners by email or in the
          dashboard.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

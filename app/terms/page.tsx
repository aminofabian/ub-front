import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { PLATFORM_DOMAIN } from "@/lib/config";
import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

export const metadata: Metadata = {
  title: `Terms of Service — Kiosk POS Kenya | ${PLATFORM_DOMAIN}`,
  description: `The terms on which ${PLATFORM_DOMAIN} provides point of sale, inventory, and storefront software to shops in Kenya.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="28 September 2026"
      intro={`These terms govern your use of ${PLATFORM_DOMAIN}. By creating a shop or using the platform on behalf of a shop, you agree to them.`}
    >
      <LegalSection heading="The agreement">
        <p>
          This is an agreement between you (the shop owner or the person
          operating the shop) and {KIOSK_PLATFORM_CONTACT.legalName}. It covers
          the point of sale, inventory, storefront, and related services we
          provide under the Kiosk name.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You must give accurate business details, keep your login credentials
          secure, and make sure anyone you give access to the till is authorised
          by you. Staff accounts, roles, and permissions are your
          responsibility. You must be able to enter into a binding contract to
          use the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Plans and payment">
        <p>
          The Free plan covers up to 300 products and one cashier at no charge
          and needs no card. Paid plans are billed monthly in Kenyan Shillings
          at the prices shown on our pricing page. We will tell you before a
          price changes.
        </p>
        <p>
          Where a plan is billed, you authorise us or our payment provider to
          charge the agreed amount each month until you cancel. If a payment
          fails we may suspend paid features, but your data is not deleted for
          that reason alone.
        </p>
      </LegalSection>

      <LegalSection heading="Selling and payments">
        <p>
          Kiosk is the software you sell through. You are the seller: pricing,
          stock, tax, licences, and the goods and services you offer are your
          responsibility.
        </p>
        <p>
          M-Pesa payments are processed by Safaricom. We pass the payment
          instruction and record the result, but receipt of funds depends on
          Safaricom&rsquo;s service and the customer completing the payment.
        </p>
      </LegalSection>

      <LegalSection heading="Offline mode">
        <p>
          The platform is designed to keep selling when your connection drops.
          Sales taken offline are queued and synchronised when you reconnect. We
          work hard to make that reliable, but you should keep your own record
          of takings for any period you trade offline.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Do not use the platform to break the law, to sell prohibited goods, to
          infringe anyone&rsquo;s rights, to attempt to access another
          shop&rsquo;s data, to probe or disrupt the service, or to resell the
          platform without our written agreement. We may suspend a shop that
          puts other merchants or the platform at risk.
        </p>
      </LegalSection>

      <LegalSection heading="Your data and our software">
        <p>
          Your shop data — catalogue, prices, stock, sales, and customers —
          belongs to you. You can export it, and you can ask us for a copy. We
          hold and process it as described in our Privacy Notice.
        </p>
        <p>
          The platform itself, including its software, design, and
          documentation, remains ours. These terms give you the right to use it
          for your shop; they do not transfer ownership of it.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and support">
        <p>
          We aim to keep the platform available at all times and to support you
          by phone, email, and on-site in Nairobi where arranged. We do not
          promise uninterrupted service: maintenance, network conditions, and
          third-party services such as M-Pesa can affect availability.
        </p>
      </LegalSection>

      <LegalSection heading="Ending this agreement">
        <p>
          You may stop using the platform and close your shop at any time. We
          may suspend or end your access if you materially breach these terms,
          if we are required to by law, or if we discontinue the service with
          reasonable notice.
        </p>
        <p>
          On closure we handle your data as set out in our Privacy Notice. If we
          discontinue the platform we will give you a reasonable opportunity to
          export your data.
        </p>
      </LegalSection>

      <LegalSection heading="Limits on our liability">
        <p>
          To the extent Kenyan law allows, we are not liable for lost profits,
          lost sales, or indirect losses, and our total liability for any claim
          is limited to the greater of the fees you paid us in the three months
          before the claim or KES 10,000. Nothing here limits liability that
          cannot lawfully be limited.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of Kenya, and the courts of Kenya
          have jurisdiction over any dispute. If a provision is found
          unenforceable, the rest of these terms continue to apply.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

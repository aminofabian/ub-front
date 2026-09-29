import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/legal/legal-document";
import { PLATFORM_DOMAIN } from "@/lib/config";
import { KIOSK_PLATFORM_CONTACT } from "@/lib/platform-contact";

export const metadata: Metadata = {
  title: `Cookie Notice — Kiosk POS Kenya | ${PLATFORM_DOMAIN}`,
  description: `The cookies and similar technologies ${PLATFORM_DOMAIN} uses, what they do, and how to control them.`,
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Notice"
      updated="28 September 2026"
      intro={`This notice explains the cookies and similar technologies ${PLATFORM_DOMAIN} uses on the marketing site and in the shop dashboard, and how you can control them.`}
    >
      <LegalSection heading="What cookies are">
        <p>
          Cookies are small text files a site stores in your browser. They let a
          site remember you between pages and visits — for example, that you are
          signed in, or that a shop session belongs to you.
        </p>
      </LegalSection>

      <LegalSection heading="Strictly necessary cookies">
        <p>
          These are required for the platform to work and cannot be switched
          off. They cover signing in and keeping you signed in, protecting forms
          against cross-site request forgery, load balancing, and remembering
          which shop you are operating. Without them the till and dashboard
          cannot function.
        </p>
      </LegalSection>

      <LegalSection heading="Analytics cookies">
        <p>
          We use Google Analytics, loaded through Google Tag Manager, to
          understand how visitors reach and move through the site — which pages
          are read, where people drop off, and roughly where in the world
          traffic comes from. We use this in aggregate to improve the product
          and our pages; it is not used to identify you personally.
        </p>
        <p>
          These cookies are set by Google as a third party. We ask for your
          consent before analytics cookies are set where consent is required.
        </p>
      </LegalSection>

      <LegalSection heading="What we do not use">
        <p>
          We do not use advertising or cross-site tracking cookies on{" "}
          {PLATFORM_DOMAIN}, and we do not sell cookie data.
        </p>
      </LegalSection>

      <LegalSection heading="Managing cookies">
        <p>
          You can block or delete cookies in your browser settings, and you can
          set most browsers to warn you before accepting one. If you block the
          strictly necessary cookies, signing in and running the till will stop
          working. Blocking analytics cookies does not affect your ability to
          use the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          If you have a question about cookies or about your data generally, see
          our Privacy Notice or write to{" "}
          <a
            href={`mailto:${KIOSK_PLATFORM_CONTACT.email}`}
            className="inline-flex min-h-6 items-center font-medium text-[var(--kiosk-gold)] underline underline-offset-2"
          >
            {KIOSK_PLATFORM_CONTACT.email}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}

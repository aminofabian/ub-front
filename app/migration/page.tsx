import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MigrationPage } from "@/components/migration/migration-page";
import { APP_BASE_URL, PLATFORM_DOMAIN } from "@/lib/config";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

const TITLE = `We moved to ${PLATFORM_DOMAIN} — the Kiosk domain migration`;
const DESCRIPTION =
  "Why Kiosk moved from kiosk.co.ke to kiosk.ke, what changes for your store, and how to move with us — your products, stock, payments, and team come along.";
const KEYWORDS = [
  "kiosk.ke",
  "kiosk.co.ke",
  "domain migration",
  "move to kiosk.ke",
  "new kiosk domain",
  "storefront new address",
  "kiosk platform move",
];

const FAQS = [
  {
    question: "What is actually changing?",
    answer:
      "The platform's home address: kiosk.co.ke becomes kiosk.ke, and every storefront moves from yourshop.kiosk.co.ke to yourshop.kiosk.ke. Your products, stock, prices, M-Pesa history, team, and storefront design all stay exactly as they are.",
  },
  {
    question: "Why is the move necessary?",
    answer:
      "The previous structure was built for the platform's first phase and couldn't scale with the traffic, multi-branch shops, and supplier features our merchants now need. kiosk.ke runs on infrastructure built for that scale — faster tills, steadier service, and room for the roadmap.",
  },
  {
    question: "What do I need to do?",
    answer:
      "Three small things: update saved links and bookmarks to the new address, sign in once on kiosk.ke so everything confirms, and share your new storefront URL with customers. Old kiosk.co.ke links keep redirecting for a while, but the new address is the one to share.",
  },
  {
    question: "Will my old links still work?",
    answer:
      "For a grace period, yes — old kiosk.co.ke links redirect so nobody loses the way. But redirects are a courtesy, not a home: update your bookmarks and WhatsApp links to the new address so customers always land on the real store.",
  },
  {
    question: "Is my data safe during the migration?",
    answer:
      "Yes. Nothing is rebuilt or re-entered — your data moves with you. Products, stock counts, prices, M-Pesa payments, staff roles, supplier records, and reports all carry over.",
  },
  {
    question: "When should I move?",
    answer:
      "Now. Updating your links takes minutes, and the sooner customers learn the new address, the sooner the old one can retire. Sign in on kiosk.ke today and you're home.",
  },
];

function migrationJsonLd(canonical: string) {
  const home = canonical.replace(/\/migration$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    url: canonical,
    description: DESCRIPTION,
    inLanguage: "en-KE",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: home },
        { "@type": "ListItem", position: 2, name: "Domain migration", item: canonical },
      ],
    },
    mainEntity: {
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonical = `${base}/migration`;

  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: KEYWORDS,
    alternates: { canonical },
    robots: { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "website",
      title: TITLE,
      description: DESCRIPTION,
      url: canonical,
      siteName: "Kiosk",
      locale: "en_KE",
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
    other: { "geo.region": "KE", "content-language": "en-KE" },
  };
}

export default async function MigrationRoute() {
  const base = APP_BASE_URL.replace(/\/+$/, "");
  const canonical = `${base}/migration`;
  const slug = await resolveStorefrontSlug();

  // Host-only — tenant visitors get their shop, not the platform announcement.
  if (slug) {
    redirect("/shop");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(migrationJsonLd(canonical)) }}
      />
      <MigrationPage />
    </>
  );
}

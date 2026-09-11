import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";

import { ShopperPwaInstall } from "@/components/storefront/shopper-pwa-install";
import { StorefrontPwaRuntime } from "@/components/storefront/storefront-pwa-runtime";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  shopperPwaHandoffUrl,
  shopperPwaIconPath,
  shopperPwaManifestPath,
} from "@/lib/shopper-pwa";
import { resolveShopperPwaProfile } from "@/lib/shopper-pwa-resolve";
import { getRequestHostname } from "@/lib/storefront-slug";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateViewport({
  params,
}: PageProps): Promise<Viewport> {
  const { slug: raw } = await params;
  const profile = await resolveShopperPwaProfile(decodeURIComponent(raw));
  return {
    themeColor: profile?.themeColor || "#28A745",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = sanitizeStorefrontSlug(decodeURIComponent(raw));
  const profile = slug ? await resolveShopperPwaProfile(slug) : null;
  if (!profile) {
    return { title: "Shop app" };
  }
  const title = `Add ${profile.name} to your phone`;
  return {
    title,
    description:
      profile.description ||
      `Install ${profile.name} on your home screen. Open this shop like an app.`,
    applicationName: profile.name,
    manifest: shopperPwaManifestPath(profile.slug),
    appleWebApp: {
      capable: true,
      title: profile.name,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        {
          url: shopperPwaIconPath(profile.slug, 192),
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: shopperPwaIconPath(profile.slug, 512),
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: shopperPwaIconPath(profile.slug, 180),
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}

export default async function ShopperPwaPage({ params }: PageProps) {
  if (IS_DESKTOP) notFound();

  const { slug: raw } = await params;
  const slug = sanitizeStorefrontSlug(decodeURIComponent(raw));
  if (!slug) notFound();

  const [profile, host] = await Promise.all([
    resolveShopperPwaProfile(slug),
    getRequestHostname(),
  ]);
  if (!profile) notFound();

  const handoff = shopperPwaHandoffUrl({
    slug: profile.slug,
    tenantHost: profile.tenantHost,
    currentHost: host ?? "",
  });
  if (handoff) {
    redirect(handoff);
  }

  return (
    <>
      <StorefrontPwaRuntime slug={profile.slug} />
      <ShopperPwaInstall
        slug={profile.slug}
        name={profile.name}
        primary={profile.themeColor || "#0D9488"}
        description={profile.description}
      />
    </>
  );
}

import Link from "next/link";

import { StorefrontCatalogHome } from "@/components/storefront/storefront-catalog-home";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { resolveStorefrontSlugFromHost } from "@/lib/storefront-slug";

type PageProps = {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const hostSlug = await resolveStorefrontSlugFromHost();

  // Tenant-mapped host → render the storefront in place at `/`.
  if (hostSlug) {
    const sp = await searchParams;
    return (
      <StorefrontShell>
        <StorefrontCatalogHome
          q={sp.q?.trim() || undefined}
          categoryId={sp.categoryId?.trim() || undefined}
        />
      </StorefrontShell>
    );
  }

  // Platform/admin host (no tenant mapping) → admin landing.
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Soft depth: token-based wash so light/dark stay cohesive (decorative only). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-25%,var(--color-muted)_0%,transparent_52%)] opacity-70 dark:opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/20 dark:from-muted/15 dark:to-muted/10"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24">
        <article className="w-full max-w-md rounded-2xl border border-border bg-card/95 p-8 text-center shadow-lg shadow-foreground/[0.04] ring-1 ring-foreground/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 dark:shadow-black/30 dark:ring-white/[0.06] sm:p-10">
          <header className="mx-auto flex max-w-[42ch] flex-col items-center">
            <p className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              UB Admin
            </p>
            <h1 className="mt-6 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2rem]">
              Phase 1 · Tenant console
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
              Manage business settings, users, and catalog. Sign in with an existing account or create one
              if your tenant allows self-registration.
            </p>
          </header>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-3">
            <Button asChild size="lg" className="h-11 w-full min-w-[9.5rem] px-6 text-base sm:w-auto">
              <Link href={APP_ROUTES.login}>Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 w-full min-w-[9.5rem] px-6 text-base sm:w-auto">
              <Link href={APP_ROUTES.signup}>Create account</Link>
            </Button>
          </div>

          <nav
            className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border-t border-border pt-8 text-sm text-muted-foreground"
            aria-label="Account and access links"
          >
            <Link
              href={APP_ROUTES.forgotPassword}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Forgot password
            </Link>
            <span className="select-none text-border" aria-hidden>
              ·
            </span>
            <Link
              href={APP_ROUTES.verifyEmail}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Verify email
            </Link>
            <span className="select-none text-border" aria-hidden>
              ·
            </span>
            <Link
              href={APP_ROUTES.superAdminLogin}
              className="rounded-md px-2 py-1 underline decoration-border underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:decoration-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              Super-admin
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-background to-muted/40 px-4 dark:from-slate-950 dark:via-background dark:to-slate-900/50">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card/90 p-10 text-center shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">UB Admin</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Phase 1 · Tenant console</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Manage business settings, users, and catalog. Sign in with an existing account or create one
          if your tenant allows self-registration.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href={APP_ROUTES.login}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={APP_ROUTES.signup}>Create account</Link>
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          <Link href={APP_ROUTES.forgotPassword} className="underline underline-offset-2">
            Forgot password
          </Link>
          {" · "}
          <Link href={APP_ROUTES.verifyEmail} className="underline underline-offset-2">
            Verify email
          </Link>
          {" · "}
          <Link href={APP_ROUTES.superAdminLogin} className="underline underline-offset-2">
            Super-admin
          </Link>
        </p>
      </div>
    </div>
  );
}

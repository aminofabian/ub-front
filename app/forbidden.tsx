import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";

export const metadata = {
  title: "Access Denied",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-10 text-center shadow-sm">
        {/* Icon */}
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="size-7 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          You don&apos;t have permission to access this page. If you believe this
          is a mistake, please sign in with an account that has the required
          access or contact your administrator.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href={APP_ROUTES.login}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">Go home</Link>
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Need help?{" "}
          <Link
            href={APP_ROUTES.superAdminLogin}
            className="underline underline-offset-2"
          >
            Super-admin sign-in
          </Link>
        </p>
      </div>
    </main>
  );
}

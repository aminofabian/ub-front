"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";

import { ShopAccountHub, fmtMoney } from "@/components/storefront/shop-account-hub";
import { Button } from "@/components/ui/button";
import { fetchBusiness, fetchMe, logoutRemote, type MeResponse } from "@/lib/api";
import { getSessionTokens } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";

type LoadState = "loading" | "guest" | "ready" | "error";

export default function ShopAccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [peekCurrency, setPeekCurrency] = useState<string | undefined>();

  const loadMe = useCallback(async () => {
    if (!getSessionTokens()) {
      setMe(null);
      setState("guest");
      return;
    }
    setState("loading");
    try {
      const [business, profile] = await Promise.all([
        fetchBusiness().catch(() => null),
        fetchMe(),
      ]);
      setPeekCurrency(business?.currency?.trim() || undefined);
      setMe(profile);
      setState("ready");
    } catch {
      setMe(null);
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const onLogout = async () => {
    await logoutRemote();
    setMe(null);
    setState("guest");
    router.refresh();
  };

  const loginHref = `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.shopAccount)}`;

  if (state === "guest") {
    return (
      <div className="relative mx-auto max-w-lg px-4 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-24 -top-10 h-[18rem] bg-[radial-gradient(circle,rgba(99,102,241,0.28),transparent_68%)] opacity-95 blur-3xl dark:opacity-60"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/65 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="size-3 text-amber-500" aria-hidden />
            Shop account
          </p>
          <h1 className="font-heading mt-5 text-3xl font-extrabold tracking-tight">
            Sign in to your account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Track pickup orders, wallet balance, loyalty points, and in-store tab from one place.
          </p>
          <dl className="mt-10 space-y-3 rounded-[1.4rem] border border-border/60 bg-card/80 p-6 text-sm shadow-sm backdrop-blur">
            <div className="flex justify-between gap-4 border-b border-dashed pb-4">
              <dt className="text-muted-foreground">Wallet preview</dt>
              <dd className="font-mono text-foreground">
                {fmtMoney(0, peekCurrency ?? "USD")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-dashed pb-4">
              <dt className="text-muted-foreground">Loyalty</dt>
              <dd className="font-semibold text-foreground">0 pts</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tab signal</dt>
              <dd className="font-mono text-foreground">
                {fmtMoney(0, peekCurrency ?? "USD")}
              </dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="h-11 rounded-2xl">
              <Link href={loginHref}>Sign in</Link>
            </Button>
            <Button variant="outline" asChild className="h-11 rounded-2xl border-2">
              <Link href={APP_ROUTES.signup}>Create shopper account</Link>
            </Button>
            <Button variant="ghost" asChild className="h-11 rounded-2xl">
              <Link href={APP_ROUTES.shop}>Browse shop</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        <div className="space-y-3">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading your account…
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Your account
        </h1>
        <p className="mt-3 text-sm text-destructive">
          We couldn&apos;t load your profile — your session may have expired.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="rounded-xl" onClick={() => void loadMe()}>
            Retry
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={loginHref}>Sign in again</Link>
          </Button>
          <Button
            variant="ghost"
            className="rounded-xl gap-2 text-destructive hover:text-destructive"
            onClick={() => void onLogout()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Clear session
          </Button>
        </div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return <ShopAccountHub me={me} />;
}

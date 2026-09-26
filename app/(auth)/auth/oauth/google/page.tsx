"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { APP_ROUTES } from "@/lib/config";

/**
 * Apex-only Google OAuth starter. Tenant hosts and custom domains bounce here
 * so the bind cookie and Google redirect_uri stay on kiosk.ke / localhost.
 */
function GoogleOAuthRelayInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const intentRaw = (searchParams.get("intent") || "sign_in").trim().toLowerCase();
      const intent = intentRaw === "sign_up" ? "sign_up" : "sign_in";
      const next = searchParams.get("next")?.trim() || "/";
      const businessId = searchParams.get("businessId")?.trim() || "";
      const returnHost = searchParams.get("returnHost")?.trim() || "";

      try {
        const res = await fetch("/api/v1/auth/oauth/google/start", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(businessId ? { "X-Tenant-Id": businessId } : {}),
          },
          body: JSON.stringify({
            intent,
            next: next.startsWith("/") && !next.startsWith("//") ? next : "/",
            ...(businessId ? { businessId } : {}),
            ...(returnHost ? { returnHost } : {}),
          }),
        });
        const payload = (await res.json().catch(() => null)) as {
          authorizeUrl?: string;
          detail?: string;
          title?: string;
        } | null;
        if (cancelled) {
          return;
        }
        if (!res.ok || !payload?.authorizeUrl) {
          throw new Error(
            payload?.detail ||
              payload?.title ||
              "Google Sign-In is not available right now.",
          );
        }
        window.location.assign(payload.authorizeUrl);
      } catch (e) {
        if (cancelled) {
          return;
        }
        setError(e instanceof Error ? e.message : "Could not open Google.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] text-[#9a2e16]">{error}</p>
        <a
          href={APP_ROUTES.login}
          className="text-[14px] font-semibold text-[#141412] underline underline-offset-4"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="size-6 animate-spin text-[#8A8782]" aria-hidden />
      <p className="text-[15px] text-[#666666]">Opening Google…</p>
    </div>
  );
}

export default function GoogleOAuthRelayPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
          <Loader2 className="size-6 animate-spin text-[#8A8782]" aria-hidden />
          <p className="text-[15px] text-[#666666]">Opening Google…</p>
        </div>
      }
    >
      <GoogleOAuthRelayInner />
    </Suspense>
  );
}

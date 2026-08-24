"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchSignInDestinationsByEmail,
  searchPublicShops,
  type PublicSignInDestination,
} from "@/lib/api";
import {
  fetchSignInDestinationsByPhone,
  sendShopperIdentifyCode,
  verifyShopperIdentifyCode,
} from "@/lib/apex-identify";
import {
  apexShopSearchQuery,
  buildApexForwardUrl,
} from "@/lib/apex-forward";
import { APP_ROUTES, PLATFORM_DOMAIN } from "@/lib/config";
import { loginSupplierPortal } from "@/lib/marketplace-api";
import { buildStorefrontSignInHref } from "@/components/storefront/storefront-sign-in-sheet";
import { cn } from "@/lib/utils";

import { landingRootStyle } from "./landing-styles";

type LandingSignInModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShop: () => void;
  /** @deprecated Mode is inferred from identity; kept for call-site compat. */
  initialMode?: "shopper" | "staff";
};

type IdentityKind = "unknown" | "email" | "phone";

type Step =
  | { status: "idle" }
  | { status: "looking" }
  | { status: "phone-sending" }
  | { status: "phone-code"; phone: string }
  | { status: "phone-verifying"; phone: string }
  | { status: "passes"; rows: PublicSignInDestination[]; identity: IdentityPayload }
  | { status: "miss"; hint: string; phone?: string }
  | { status: "shop-search" }
  | { status: "shop-loading" }
  | { status: "shop-results"; query: string; rows: PublicSignInDestination[] }
  | {
      status: "supplier-auth";
      identity: IdentityPayload;
      name: string;
    };

type IdentityPayload = {
  kind: "email" | "phone";
  email?: string;
  phone?: string;
};

const RESEND_SECONDS = 60;

function detectIdentityKind(raw: string): IdentityKind {
  const t = raw.trim();
  if (!t) return "unknown";
  if (t.includes("@")) return "email";
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9 && /^[\d\s+\-()]+$/.test(t)) return "phone";
  // Mostly digits with a bit of punctuation still counts as phone intent.
  if (digits.length >= 9 && digits.length / t.replace(/\s/g, "").length >= 0.7) {
    return "phone";
  }
  return "unknown";
}

function destinationKey(row: PublicSignInDestination): string {
  return `${row.door}:${row.slug ?? "portal"}`;
}

function doorStamp(door: PublicSignInDestination["door"]): string {
  if (door === "STAFF") return "Till";
  if (door === "SUPPLIER") return "Supply";
  if (door === "SUPPLIER_CLAIM") return "Claim";
  return "Shop";
}

function doorHint(row: PublicSignInDestination): string {
  if (row.hint) return row.hint;
  if (row.door === "SUPPLIER") return "PIN or password in this sheet";
  if (row.door === "SUPPLIER_CLAIM") return "Verify your phone by SMS to open it";
  return "PIN or password — opens in the shop";
}

function doorAddress(row: PublicSignInDestination): string {
  if (row.door === "SUPPLIER" || row.door === "SUPPLIER_CLAIM") {
    return "supplier portal";
  }
  return row.primaryHost ?? (row.slug ? `${row.slug}.${PLATFORM_DOMAIN}` : "");
}

/** Doors in the order a person expects to see them, with a group heading. */
const DOOR_GROUPS: { door: PublicSignInDestination["door"]; label: string }[] = [
  { door: "STAFF", label: "Tills you run" },
  { door: "SHOPPER", label: "Shops you buy from" },
  { door: "SUPPLIER", label: "Supply portal" },
  { door: "SUPPLIER_CLAIM", label: "Supply portal — not opened yet" },
];

function groupPasses(rows: PublicSignInDestination[]) {
  return DOOR_GROUPS.map(({ door, label }) => ({
    label,
    rows: rows.filter((row) => row.door === door),
  })).filter((group) => group.rows.length > 0);
}

function resolveIdentity(
  payload: IdentityPayload | undefined,
  kind: IdentityKind,
  raw: string,
): IdentityPayload | undefined {
  if (payload) return payload;
  if (kind === "email") {
    return { kind: "email", email: raw.trim().toLowerCase() };
  }
  if (kind === "phone") {
    return { kind: "phone", phone: raw.replace(/\D/g, "") };
  }
  return undefined;
}

export function LandingSignInModal({
  open,
  onOpenChange,
  onCreateShop,
}: LandingSignInModalProps) {
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [step, setStep] = useState<Step>({ status: "idle" });
  const [forwarding, setForwarding] = useState<PublicSignInDestination | null>(null);
  const [shopQuery, setShopQuery] = useState("");
  const [supplierPassword, setSupplierPassword] = useState("");
  const [supplierBusy, setSupplierBusy] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  const kind = detectIdentityKind(identity);

  useEffect(() => {
    if (!open) return;
    setIdentity("");
    setCode("");
    setCountdown(0);
    setStep({ status: "idle" });
    setForwarding(null);
    setShopQuery("");
    setSupplierPassword("");
    setSupplierBusy(false);
    setSupplierError("");
  }, [open]);

  useEffect(() => {
    if (step.status !== "phone-code" || countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 1 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step.status, countdown]);

  const go = (row: PublicSignInDestination, payload?: IdentityPayload) => {
    if (forwarding) return;
    const idPayload = resolveIdentity(payload, kind, identity);

    if (row.door === "SUPPLIER") {
      setSupplierPassword("");
      setSupplierError("");
      setStep({
        status: "supplier-auth",
        identity: idPayload ?? { kind: "email", email: "" },
        name: row.name,
      });
      return;
    }

    // A supplier the platform knows but who has no portal login yet: the claim
    // flow verifies the stall phone by SMS, so hand it a verified one when we
    // have it and let the claim page ask otherwise.
    if (row.door === "SUPPLIER_CLAIM") {
      setForwarding(row);
      window.setTimeout(() => {
        const phone = idPayload?.kind === "phone" ? idPayload.phone : undefined;
        window.location.assign(
          phone
            ? `${APP_ROUTES.supplierPortalClaim}?phone=${encodeURIComponent(phone)}`
            : APP_ROUTES.supplierPortalClaim,
        );
      }, 720);
      return;
    }

    if (!row.slug) {
      setStep({ status: "miss", hint: "That pass has no shop address." });
      return;
    }

    setForwarding(row);

    window.setTimeout(() => {
      const path = buildStorefrontSignInHref({
        path: APP_ROUTES.shop,
        email: idPayload?.email,
        phone: idPayload?.phone,
        door: row.door === "STAFF" ? "staff" : "shopper",
        next: row.door === "STAFF" ? APP_ROUTES.business : APP_ROUTES.shopAccount,
      });
      const url = buildApexForwardUrl(
        {
          slug: row.slug!,
          name: row.name,
          logoUrl: row.logoUrl,
          primaryHost: row.primaryHost,
        },
        path,
      );
      if (url) {
        window.location.assign(url);
      } else {
        setForwarding(null);
        setStep({ status: "miss", hint: "Could not open that shop." });
      }
    }, 720);
  };

  const onSupplierSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step.status !== "supplier-auth") return;
    const identifier =
      step.identity.email?.trim() ||
      step.identity.phone?.trim() ||
      identity.trim();
    if (!identifier || !supplierPassword) {
      setSupplierError("Enter your email or phone and password.");
      return;
    }
    setSupplierBusy(true);
    setSupplierError("");
    try {
      await loginSupplierPortal(identifier, supplierPassword);
      window.location.assign(APP_ROUTES.supplierPortalOverview);
    } catch (error) {
      setSupplierError(
        error instanceof Error ? error.message : "Could not sign in.",
      );
      setSupplierBusy(false);
    }
  };

  const onIdentitySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const detected = detectIdentityKind(identity);
    if (detected === "email") {
      const email = identity.trim().toLowerCase();
      setStep({ status: "looking" });
      const rows = await fetchSignInDestinationsByEmail(email);
      if (rows.length === 0) {
        setStep({
          status: "miss",
          hint: "No pass on that email. Suppliers usually sign in with the stall phone — try the number instead.",
        });
        return;
      }
      setStep({
        status: "passes",
        rows,
        identity: { kind: "email", email },
      });
      return;
    }
    if (detected === "phone") {
      const digits = identity.replace(/\D/g, "");
      setStep({ status: "phone-sending" });
      const result = await sendShopperIdentifyCode(digits);
      if (!result) {
        setStep({
          status: "miss",
          hint: "Could not send a code. Check the number and try again.",
        });
        return;
      }
      setCode("");
      setCountdown(RESEND_SECONDS);
      setStep({ status: "phone-code", phone: digits });
      return;
    }
    setStep({
      status: "miss",
      hint: "Enter an email or a phone number (e.g. 0714 282 874).",
    });
  };

  const onCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step.status !== "phone-code") return;
    const digits = code.replace(/\D/g, "");
    if (digits.length < 4) return;
    setStep({ status: "phone-verifying", phone: step.phone });
    const verified = await verifyShopperIdentifyCode(step.phone, digits);
    if (!verified?.phoneVerificationToken) {
      setCode("");
      setStep({ status: "phone-code", phone: step.phone });
      return;
    }
    const rows = await fetchSignInDestinationsByPhone(
      step.phone,
      verified.phoneVerificationToken,
    );
    if (rows.length === 0) {
      setStep({
        status: "miss",
        hint: "Nothing stamped on that number yet. Try your email, or open a supplier account below.",
        phone: step.phone,
      });
      return;
    }
    setStep({
      status: "passes",
      rows,
      identity: { kind: "phone", phone: step.phone },
    });
  };

  const onShopSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = apexShopSearchQuery(shopQuery);
    if (q.length < 2) {
      setStep({ status: "miss", hint: "Type at least two letters of the shop name." });
      return;
    }
    setStep({ status: "shop-loading" });
    const found = await searchPublicShops(q);
    const rows: PublicSignInDestination[] = found.flatMap((row) => [
      { ...row, door: "STAFF" as const },
      { ...row, door: "SHOPPER" as const },
    ]);
    if (rows.length === 0) {
      setStep({ status: "miss", hint: `No shop found for “${q}”.` });
      return;
    }
    setStep({ status: "shop-results", query: q, rows });
  };

  const startCreate = () => {
    onOpenChange(false);
    onCreateShop();
  };

  const kindLabel =
    kind === "email" ? "Email" : kind === "phone" ? "Phone" : "Email or phone";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,640px)] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:size-8 [&>button]:rounded-none [&>button]:border [&>button]:border-[var(--kiosk-border)] [&>button]:bg-[var(--kiosk-elevated)] [&>button]:text-[var(--kiosk-text-muted)]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="landing-find-shop overflow-hidden border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div aria-hidden className="landing-find-shop-perf h-3 w-full" />

          <div className="px-5 pb-6 pt-4 sm:px-7">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-heading text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--kiosk-text)]">
                Your pass
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed text-[var(--kiosk-text-muted)]">
                Email or phone — we stamp every shop and portal tied to you, then
                open the right door for PIN or password.
              </DialogDescription>
            </DialogHeader>

            {step.status === "supplier-auth" ? (
              <form className="mt-6 space-y-4" onSubmit={(e) => void onSupplierSubmit(e)}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                  Supplier · {step.name}
                </p>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    Email or phone
                  </span>
                  <input
                    value={
                      step.identity.email ||
                      step.identity.phone ||
                      identity
                    }
                    readOnly
                    className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    PIN or password
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={supplierPassword}
                    onChange={(e) => setSupplierPassword(e.target.value)}
                    autoFocus
                    className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none focus:border-[var(--kiosk-gold)]"
                    required
                  />
                </label>
                {supplierError ? (
                  <p className="text-[13px] text-[var(--kiosk-danger)]">{supplierError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={supplierBusy}
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
                >
                  {supplierBusy ? "Signing in…" : "Sign in"}
                </button>
                <button
                  type="button"
                  className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={() => setStep({ status: "idle" })}
                >
                  ← Different pass
                </button>
              </form>
            ) : forwarding ? (
              <ForwardingPass row={forwarding} onBack={() => setForwarding(null)} />
            ) : step.status === "phone-code" || step.status === "phone-verifying" ? (
              <CodeForm
                phone={step.phone}
                code={code}
                busy={step.status === "phone-verifying"}
                countdown={countdown}
                onChange={setCode}
                onSubmit={onCodeSubmit}
                onResend={() =>
                  void sendShopperIdentifyCode(step.phone).then((result) => {
                    if (result) setCountdown(RESEND_SECONDS);
                  })
                }
                onBack={() => setStep({ status: "idle" })}
              />
            ) : step.status === "passes" || step.status === "shop-results" ? (
              <PassPicker
                rows={step.rows}
                onPick={(row) => {
                  if (step.status === "passes") {
                    go(row, step.identity);
                  } else {
                    go(row);
                  }
                }}
                onBack={() =>
                  setStep(
                    step.status === "shop-results"
                      ? { status: "shop-search" }
                      : { status: "idle" },
                  )
                }
                backLabel={
                  step.status === "shop-results" ? "← Different name" : "← Different identity"
                }
              />
            ) : step.status === "shop-search" || step.status === "shop-loading" ? (
              <form className="mt-6 space-y-4" onSubmit={(e) => void onShopSearch(e)}>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    Shop name
                  </span>
                  <input
                    value={shopQuery}
                    onChange={(event) => setShopQuery(event.target.value)}
                    autoFocus
                    autoComplete="organization"
                    placeholder="e.g. Mama Njeri Minimart"
                    className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={step.status === "shop-loading" || shopQuery.trim().length < 2}
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
                >
                  {step.status === "shop-loading" ? "Looking up…" : "Find shop"}
                </button>
                <button
                  type="button"
                  className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={() => setStep({ status: "idle" })}
                >
                  ← Back to email or phone
                </button>
              </form>
            ) : step.status === "miss" ? (
              <div className="mt-6 border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3.5 py-3">
                <p className="text-[13px] text-[var(--kiosk-text)]">{step.hint}</p>
                <button
                  type="button"
                  className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
                  onClick={() => setStep({ status: "idle" })}
                >
                  ← Try again
                </button>
                <button
                  type="button"
                  className="mt-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={() => setStep({ status: "shop-search" })}
                >
                  Find by shop name →
                </button>
                <a
                  href={
                    step.phone
                      ? `${APP_ROUTES.supplierPortalClaim}?phone=${encodeURIComponent(step.phone)}`
                      : APP_ROUTES.supplierPortalClaim
                  }
                  className="mt-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                >
                  I supply shops — open a portal →
                </a>
                <button
                  type="button"
                  className="mt-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={startCreate}
                >
                  Start free instead →
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={(e) => void onIdentitySubmit(e)}>
                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                      {kindLabel}
                    </span>
                    <span
                      className={cn(
                        "landing-pass-kind font-mono text-[9px] font-semibold uppercase tracking-[0.16em]",
                        kind === "unknown"
                          ? "text-[var(--kiosk-text-faint)]"
                          : "text-[var(--kiosk-gold)]",
                      )}
                      aria-live="polite"
                    >
                      {kind === "email"
                        ? "→ Pass · email"
                        : kind === "phone"
                          ? "→ Pass · SMS code"
                          : "Waiting…"}
                    </span>
                  </span>
                  <div className="relative">
                    <input
                      value={identity}
                      onChange={(event) => {
                        setIdentity(event.target.value);
                      }}
                      autoFocus
                      autoComplete="username"
                      inputMode={kind === "phone" ? "tel" : "email"}
                      placeholder="you@shop.co or 0714 282 874"
                      className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3.5 pr-16 text-[15px] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
                        kind === "email" || kind === "phone"
                          ? "text-[var(--kiosk-gold)]"
                          : "text-[var(--kiosk-text-faint)]",
                      )}
                    >
                      {kind === "email" ? "@" : kind === "phone" ? "#" : "·"}
                    </span>
                  </div>
                </label>

                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                  {kind === "phone"
                    ? "We'll text a code, then stamp your shops."
                    : kind === "email"
                      ? "We'll list every till, shop, and portal on this email."
                      : "One field. We route you — no shopper / merchant toggle."}
                </p>

                <button
                  type="submit"
                  disabled={
                    step.status === "looking" ||
                    step.status === "phone-sending" ||
                    identity.trim().length < 3
                  }
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
                >
                  {step.status === "looking" || step.status === "phone-sending"
                    ? "Stamping…"
                    : kind === "phone"
                      ? "Send code"
                      : "Find my passes"}
                </button>

                <button
                  type="button"
                  className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
                  onClick={() => setStep({ status: "shop-search" })}
                >
                  Find by shop name instead
                </button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Prefer inferred doors; kept for existing imports. */
export type ApexSignInMode = "shopper" | "staff";

function ForwardingPass({
  row,
  onBack,
}: {
  row: PublicSignInDestination;
  onBack: () => void;
}) {
  return (
    <div className="landing-pass-stamp mt-6 border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
        Pass stamped · {doorStamp(row.door)}
      </p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
        {row.name}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
        {doorAddress(row)}
      </p>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
        Opening — {doorHint(row).toLowerCase()}…
      </p>
      <button
        type="button"
        className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
        onClick={onBack}
      >
        Wrong pass? Go back
      </button>
    </div>
  );
}

function PassPicker({
  rows,
  onPick,
  onBack,
  backLabel,
}: {
  rows: PublicSignInDestination[];
  onPick: (row: PublicSignInDestination) => void;
  onBack: () => void;
  backLabel: string;
}) {
  const groups = groupPasses(rows);
  const multi = rows.length > 1;

  return (
    <div className="mt-6 space-y-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
        {multi
          ? `${rows.length} passes on this identity — tap one`
          : "One pass stamped — tap to open"}
      </p>

      <div className="max-h-[42dvh] space-y-4 overflow-y-auto pr-0.5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            {groups.length > 1 ? (
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
                {group.label}
              </p>
            ) : null}
            {group.rows.map((row, index) => (
              <button
                key={destinationKey(row)}
                type="button"
                onClick={() => onPick(row)}
                style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
                className="landing-pass-card group relative block w-full overflow-hidden border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-3.5 text-left transition-colors duration-150 hover:border-[var(--kiosk-gold)] hover:bg-[color-mix(in_srgb,var(--kiosk-gold-soft)_70%,#fff)] focus-visible:border-[var(--kiosk-gold)] focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-2 -top-1 rotate-12 border border-[var(--kiosk-gold)] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--kiosk-gold)] opacity-80"
                >
                  {doorStamp(row.door)}
                </span>
                <span className="block pr-16 font-heading text-lg font-semibold tracking-[-0.02em] text-[var(--kiosk-text)]">
                  {row.name}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--kiosk-text-muted)]">
                  {doorAddress(row)}
                </span>
                <span className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-[var(--kiosk-text-muted)]">
                    {doorHint(row)}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-[12px] text-[var(--kiosk-gold)] transition-transform duration-150 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
        onClick={onBack}
      >
        {backLabel}
      </button>
    </div>
  );
}

function CodeForm({
  phone,
  code,
  busy,
  countdown,
  onChange,
  onSubmit,
  onResend,
  onBack,
}: {
  phone: string;
  code: string;
  busy: boolean;
  countdown: number;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const masked = phone.length >= 4 ? `••••${phone.slice(-4)}` : phone;
  return (
    <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          Code we texted {masked}
        </span>
        <input
          value={code}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
          autoFocus
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="1234"
          className="landing-find-shop-input w-full border border-[var(--kiosk-border-strong)] bg-white px-3.5 py-3 text-center text-lg font-semibold tracking-[0.35em] text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)] focus:border-[var(--kiosk-gold)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.replace(/\D/g, "").length < 4}
        className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center disabled:opacity-50"
      >
        {busy ? "Checking…" : "Verify & stamp passes"}
      </button>
      {countdown > 0 ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
          Resend in {countdown}s
        </p>
      ) : (
        <button
          type="button"
          onClick={onResend}
          className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)] underline-offset-2 hover:underline"
        >
          Resend code
        </button>
      )}
      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-muted)] underline-offset-2 hover:text-[var(--kiosk-text)] hover:underline"
      >
        ← Wrong number
      </button>
    </form>
  );
}

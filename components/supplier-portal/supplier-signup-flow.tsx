"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { APP_ROUTES } from "@/lib/config";
import {
  completeSupplierPortalClaim,
  fetchSupplierPortalClaimConfig,
  sendSupplierPortalClaimCode,
  verifySupplierPortalClaimCode,
  verifySupplierPortalInviteCode,
  type SupplierPortalClaimPublicConfig,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

type Step = "phone" | "code" | "invite" | "unlock";
type UnlockKind = "pin" | "password";

type Props = {
  initialPhone?: string;
  autoSendCode?: boolean;
};

const FOREST = "#1E3B26";
const MANGO = "#B9691A";
const CREAM = "#EFF2EC";

export function SupplierSignupFlow({ initialPhone, autoSendCode = false }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<SupplierPortalClaimPublicConfig | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone?.trim() ?? "");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [code, setCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [name, setName] = useState("");
  const [unlockKind, setUnlockKind] = useState<UnlockKind>("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [alreadyHasAccount, setAlreadyHasAccount] = useState(false);

  const codeLength = config?.codeLength ?? 6;
  const passwordMin = config?.passwordMinLength ?? 8;
  const claimMethod = config?.claimMethod ?? "phone_code";
  const inviteOnly = claimMethod === "code_only" || config?.allowSelfClaim === false;
  const unavailable = Boolean(config && (!config.portalEnabled || !config.claimEnabled));

  useEffect(() => {
    let cancelled = false;
    void fetchSupplierPortalClaimConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (!cfg.portalEnabled || !cfg.claimEnabled) {
          setError("Supplier portal sign-up is temporarily unavailable.");
          return;
        }
        if (cfg.claimMethod === "code_only" || !cfg.allowSelfClaim) {
          setStep("invite");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load sign-up settings");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config || inviteOnly || bootstrapped || !autoSendCode) return;
    const from = (initialPhone ?? phone).trim();
    if (!from) {
      setBootstrapped(true);
      return;
    }
    setBootstrapped(true);
    setPhone(from);
    setBusy(true);
    void sendSupplierPortalClaimCode(from)
      .then((res) => applySendResult(res))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not send code");
      })
      .finally(() => setBusy(false));
  }, [config, inviteOnly, bootstrapped, autoSendCode, initialPhone, phone]);

  const applySendResult = (res: {
    phone: string;
    maskedPhone: string;
    alreadyRegistered: boolean;
    devCode?: string | null;
  }) => {
    if (res.alreadyRegistered) {
      setAlreadyHasAccount(true);
      setPhone(res.phone);
      setMaskedPhone(res.maskedPhone);
      setError("This number already has a portal. Sign in with your PIN or password.");
      return;
    }
    setAlreadyHasAccount(false);
    setPhone(res.phone);
    setMaskedPhone(res.maskedPhone);
    setDevCodeHint(res.devCode?.trim() || "");
    if (res.devCode?.trim()) setCode(res.devCode.trim());
    setStep("code");
  };

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setDevCodeHint("");
    setAlreadyHasAccount(false);
    setBusy(true);
    try {
      applySendResult(await sendSupplierPortalClaimCode(phone));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const goToUnlock = (token: string, suggested: string) => {
    setSetupToken(token);
    setSuggestedName(suggested);
    setName(suggested);
    setStep("unlock");
  };

  const onVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await verifySupplierPortalClaimCode(phone, code);
      goToUnlock(res.setupToken, res.suggestedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  };

  const onVerifyInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await verifySupplierPortalInviteCode(code, phone || undefined);
      goToUnlock(res.setupToken, res.suggestedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify invitation");
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (unlockKind === "pin") {
      if (!/^\d{4,6}$/.test(pin)) {
        setError("PIN must be 4 to 6 digits.");
        return;
      }
      if (pin !== confirmPin) {
        setError("PINs do not match.");
        return;
      }
    } else {
      if (password.length < passwordMin) {
        setError(`Password must be at least ${passwordMin} characters.`);
        return;
      }
      if (config?.passwordRequireNumber && !/\d/.test(password)) {
        setError("Password must include a number.");
        return;
      }
      if (config?.passwordRequireUppercase && !/[A-Z]/.test(password)) {
        setError("Password must include an uppercase letter.");
        return;
      }
      if (config?.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
        setError("Password must include a special character.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      const result = await completeSupplierPortalClaim({
        phone,
        setupToken,
        pin: unlockKind === "pin" ? pin : undefined,
        password: unlockKind === "password" ? password : undefined,
        name: name.trim() || suggestedName,
        email: email.trim() || undefined,
        altPhone: altPhone.trim() || undefined,
        location: location.trim() || undefined,
      });
      if (result.accessToken) {
        router.replace(APP_ROUTES.supplierPortalOverview);
      } else {
        router.replace(`${APP_ROUTES.supplierPortalLogin}?claimed=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the portal");
    } finally {
      setBusy(false);
    }
  };

  const progress = step === "unlock" ? 3 : step === "code" || step === "invite" ? 2 : 1;
  const listingLabel = formatListingPhone(maskedPhone || phone);

  return (
    <div
      className="relative flex min-h-dvh flex-col lg:flex-row"
      style={{ background: CREAM, color: "#1c1915" }}
    >
      <aside
        className="relative overflow-hidden px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:px-10 lg:pb-12 lg:pt-10"
        style={{ background: FOREST, color: CREAM }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #3d7a4e 0%, transparent 70%)" }}
        />
        <div className="relative">
          <Link
            href="/"
            className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#EFF2EC]"
          >
            Kiosk
          </Link>
          <h1 className="mt-8 max-w-[14ch] font-[family-name:var(--font-heading)] text-[2.35rem] leading-[0.95] font-semibold tracking-[-0.03em] lg:text-[3.15rem]">
            The number on the list is the key.
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#d7e4d6]">
            We text a code to the stall phone. You set a PIN — or a password — and walk
            straight into orders, shops, and payouts.
          </p>
        </div>
        <div className="relative mt-8 lg:mt-0">
          <p className="text-[12px] leading-snug text-[#b7cbb6]">Listing line</p>
          <p
            className="mt-1 font-[family-name:var(--font-heading)] text-[2rem] leading-none tracking-tight lg:text-[2.4rem]"
            style={{ color: MANGO }}
          >
            {listingLabel || "Your stall number"}
          </p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#b7cbb6]">
            Tied to this supplier. Add email and a second WhatsApp after the code, if you
            want shops to reach you another way.
          </p>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-8 lg:justify-center lg:px-14 lg:pt-10">
        <div className="mb-6 flex items-center gap-2" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="h-1 flex-1 max-w-16"
              style={{
                background: n <= progress ? FOREST : "color-mix(in srgb, #1E3B26 18%, transparent)",
              }}
            />
          ))}
        </div>

        {unavailable ? (
          <Alert tone="error">Supplier portal sign-up is temporarily unavailable.</Alert>
        ) : null}

        {!unavailable && step === "invite" ? (
          <form className="max-w-md space-y-5" onSubmit={onVerifyInvite}>
            <Header
              title="Invitation"
              body="Paste the code you were sent. If it asked for a phone, use the number on the listing."
            />
            <Field label="Invitation code">
              <input
                className={inputClass}
                value={code}
                onChange={(ev) =>
                  setCode(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))
                }
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </Field>
            <Field label="Phone on the listing" hint="If the invite needs it">
              <input
                type="tel"
                inputMode="tel"
                className={inputClass}
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                placeholder="07… or 2547…"
                autoComplete="tel"
              />
            </Field>
            <Submit busy={busy} disabled={busy || code.length < 4} label="Continue" waiting="Checking…" />
            {config?.allowSelfClaim && claimMethod === "phone_code" ? (
              <button type="button" className={ghostLink} onClick={() => setStep("phone")}>
                Use the stall phone instead
              </button>
            ) : null}
          </form>
        ) : null}

        {!unavailable && step === "phone" ? (
          <form className="max-w-md space-y-5" onSubmit={onSendCode}>
            <Header
              title="Confirm the stall phone"
              body="This should be the WhatsApp or call number shops already use. The code lands there."
            />
            <Field label="Phone number">
              <input
                type="tel"
                inputMode="tel"
                className={inputClass}
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                placeholder="07… or 2547…"
                autoComplete="tel"
                required
                autoFocus
              />
            </Field>
            <Submit
              busy={busy}
              disabled={busy || !phone.trim()}
              label="Text me a code"
              waiting="Sending…"
            />
            <button type="button" className={ghostLink} onClick={() => setStep("invite")}>
              I have an invitation code
            </button>
          </form>
        ) : null}

        {!unavailable && step === "code" ? (
          <form className="max-w-md space-y-5" onSubmit={onVerifyCode}>
            <Header
              title="Enter the code"
              body={`Sent to ${maskedPhone || listingLabel}. Check SMS first; WhatsApp if that is how this line is set up.`}
            />
            {devCodeHint ? (
              <Alert tone="ok">
                No live SMS here. Use {devCodeHint}.
              </Alert>
            ) : null}
            <DigitRow
              length={codeLength}
              value={code}
              onChange={setCode}
              labelledBy="signup-code"
            />
            <span id="signup-code" className="sr-only">
              Verification code
            </span>
            <Submit
              busy={busy}
              disabled={busy || code.length !== codeLength}
              label="Unlock"
              waiting="Checking…"
            />
            <button
              type="button"
              className={ghostLink}
              disabled={busy}
              onClick={() => {
                setStep("phone");
                setCode("");
                setDevCodeHint("");
              }}
            >
              Use a different number
            </button>
          </form>
        ) : null}

        {!unavailable && step === "unlock" ? (
          <form className="max-w-md space-y-5" onSubmit={onComplete}>
            <Header
              title="Set how you’ll come back"
              body="A short PIN is easier at the market. A password is better if you also sign in by email."
            />
            <Field label="Display name">
              <input
                className={inputClass}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                required
              />
            </Field>

            <div
              className="grid grid-cols-2 gap-px p-px"
              style={{ background: "color-mix(in srgb, #1E3B26 18%, transparent)" }}
              role="tablist"
              aria-label="Unlock method"
            >
              <KindTab
                active={unlockKind === "pin"}
                onClick={() => setUnlockKind("pin")}
                label="PIN"
              />
              <KindTab
                active={unlockKind === "password"}
                onClick={() => setUnlockKind("password")}
                label="Password"
              />
            </div>

            {unlockKind === "pin" ? (
              <>
                <Field label="PIN" hint="4 to 6 digits">
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    className={cn(inputClass, "tracking-[0.35em]")}
                    value={pin}
                    onChange={(ev) => setPin(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                    minLength={4}
                    maxLength={6}
                    required
                  />
                </Field>
                <Field label="Confirm PIN">
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    className={cn(inputClass, "tracking-[0.35em]")}
                    value={confirmPin}
                    onChange={(ev) =>
                      setConfirmPin(ev.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    minLength={4}
                    maxLength={6}
                    required
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Password">
                  <input
                    type="password"
                    className={inputClass}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    autoComplete="new-password"
                    minLength={passwordMin}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    type="password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    autoComplete="new-password"
                    minLength={passwordMin}
                    required
                  />
                </Field>
              </>
            )}

            <details className="group border-t pt-4" style={{ borderColor: "color-mix(in srgb, #1E3B26 14%, transparent)" }}>
              <summary className="cursor-pointer text-[14px] font-medium text-[#1c1915] marker:text-[#1E3B26]">
                Email and other contacts
              </summary>
              <div className="mt-4 space-y-4">
                <Field label="Email" hint="Optional — sign in with this later">
                  <input
                    type="email"
                    className={inputClass}
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="you@business.co.ke"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Second WhatsApp" hint="Optional — if the listing line is not the one you watch">
                  <input
                    type="tel"
                    inputMode="tel"
                    className={inputClass}
                    value={altPhone}
                    onChange={(ev) => setAltPhone(ev.target.value)}
                    placeholder="07…"
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Area or market" hint="Optional">
                  <input
                    className={inputClass}
                    value={location}
                    onChange={(ev) => setLocation(ev.target.value)}
                    placeholder="Githurai, Kawangware…"
                  />
                </Field>
              </div>
            </details>

            <Submit
              busy={busy}
              disabled={busy}
              label="Open the portal"
              waiting="Opening…"
            />
          </form>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}

        {alreadyHasAccount ? (
          <p className="mt-4 max-w-md text-sm">
            <Link
              href={`${APP_ROUTES.supplierPortalLogin}?phone=${encodeURIComponent(phone)}`}
              className="font-medium underline underline-offset-2"
              style={{ color: FOREST }}
            >
              Sign in
            </Link>
          </p>
        ) : (
          <p className="mt-8 max-w-md text-sm text-[#4a5c4c]">
            Already claimed?{" "}
            <Link
              href={APP_ROUTES.supplierPortalLogin}
              className="font-medium underline underline-offset-2"
              style={{ color: FOREST }}
            >
              Sign in
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

function Header({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-[family-name:var(--font-heading)] text-[1.85rem] leading-[1.05] font-semibold tracking-[-0.03em] text-[#1c1915]">
        {title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4a5c4c]">{body}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-[#1c1915]">{label}</span>
        {hint ? <span className="text-[12px] text-[#5c6f5e]">{hint}</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Submit({
  busy,
  disabled,
  label,
  waiting,
}: {
  busy: boolean;
  disabled: boolean;
  label: string;
  waiting: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-12 w-full text-[15px] font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-50"
      style={{ background: FOREST }}
    >
      {busy ? waiting : label}
    </button>
  );
}

function KindTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="h-11 text-[13px] font-semibold"
      style={{
        background: active ? FOREST : CREAM,
        color: active ? CREAM : "#1c1915",
      }}
    >
      {label}
    </button>
  );
}

function Alert({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role="status"
      className="mt-4 max-w-md px-3 py-2 text-sm"
      style={
        tone === "ok"
          ? { background: "#dce8dc", color: FOREST }
          : { background: "#f4ddd6", color: "#8a2e1a" }
      }
    >
      {children}
    </p>
  );
}

function DigitRow({
  length,
  value,
  onChange,
  numeric = true,
  labelledBy,
}: {
  length: number;
  value: string;
  onChange: (next: string) => void;
  numeric?: boolean;
  labelledBy: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const cells = useMemo(() => Array.from({ length }, (_, i) => value[i] ?? ""), [length, value]);

  const writeAt = (index: number, char: string) => {
    const next = cells.slice();
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
  };

  return (
    <div className="flex gap-2" role="group" aria-labelledby={labelledBy}>
      {cells.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={cn(
            "h-12 w-10 flex-1 max-w-12 text-center text-[1.15rem] font-semibold tabular-nums outline-none",
            "border bg-white focus-visible:ring-2",
          )}
          style={{
            borderColor: "color-mix(in srgb, #1E3B26 22%, transparent)",
            ["--tw-ring-color" as string]: "color-mix(in srgb, #1E3B26 35%, transparent)",
          }}
          inputMode={numeric ? "numeric" : "text"}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={ch}
          onChange={(ev) => {
            const raw = numeric
              ? ev.target.value.replace(/\D/g, "")
              : ev.target.value.replace(/[^A-Za-z0-9]/g, "");
            const char = raw.slice(-1);
            writeAt(i, char);
            if (char && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(ev) => {
            if (ev.key === "Backspace" && !cells[i] && i > 0) {
              writeAt(i - 1, "");
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(ev) => {
            ev.preventDefault();
            const pasted = ev.clipboardData.getData("text");
            const cleaned = (numeric ? pasted.replace(/\D/g, "") : pasted).slice(0, length);
            if (cleaned) onChange(cleaned);
          }}
        />
      ))}
    </div>
  );
}

const inputClass =
  "h-12 w-full border border-[color-mix(in_srgb,#1E3B26_22%,transparent)] bg-white px-3 text-[16px] outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,#1E3B26_35%,transparent)]";

const ghostLink =
  "block w-full py-1 text-center text-sm font-medium text-[#1E3B26] underline-offset-2 hover:underline";

function formatListingPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("254") && d.length >= 12) {
    return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  }
  if (d.startsWith("0") && d.length >= 10) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  }
  return raw.trim();
}

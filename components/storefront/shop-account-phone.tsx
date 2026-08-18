"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Phone } from "lucide-react";

import styles from "@/components/storefront/shop-account.module.css";
import {
  linkShopperPhone,
  sendShopperPhoneCode,
  verifyShopperPhoneCode,
  type ShopperAccountOverview,
} from "@/lib/api";
import {
  customerTabPathFromPhone,
} from "@/lib/buyer-role";
import {
  detectKenyanNetwork,
  formatKenyanPhoneDisplay,
  toKenyanLocal07,
} from "@/lib/kenyan-phone";

type Props = {
  linkedPhone?: string | null;
  accountPhone?: string | null;
  onLinked: (overview: ShopperAccountOverview) => void;
};

export function ShopAccountPhone({ linkedPhone, accountPhone, onLinked }: Props) {
  const display = linkedPhone?.trim() || accountPhone?.trim() || "";
  const linked = Boolean(linkedPhone?.trim());
  const [editing, setEditing] = useState(!display);
  const [phone, setPhone] = useState(() => toKenyanLocal07(display) || display.replace(/\D/g, ""));
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const local = toKenyanLocal07(phone);
  const network = detectKenyanNetwork(phone);
  const tabHref = customerTabPathFromPhone(linkedPhone || display);

  const onSend = async () => {
    setError("");
    if (!local) {
      setError("Enter a Kenyan mobile like 0714 282 874.");
      return;
    }
    setBusy(true);
    try {
      const sent = await sendShopperPhoneCode(local);
      setHint(sent.maskedHint || formatKenyanPhoneDisplay(local));
      setStep("code");
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setError("");
    if (!local) {
      setError("Enter a Kenyan mobile like 0714 282 874.");
      return;
    }
    if (!/^\d{4}$/.test(code.trim())) {
      setError("Enter the 4-digit code we sent.");
      return;
    }
    setBusy(true);
    try {
      const verified = await verifyShopperPhoneCode(local, code.trim());
      const overview = await linkShopperPhone(local, verified.phoneVerificationToken);
      setEditing(false);
      setStep("phone");
      setCode("");
      onLinked(overview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not link this number.");
    } finally {
      setBusy(false);
    }
  };

  if (display && !editing) {
    return (
      <div className={styles.stamp}>
        <p className={styles.stampPhone}>{formatKenyanPhoneDisplay(display)}</p>
        <p className={styles.stampMeta}>
          {network ? <span>{labelNetwork(network)}</span> : null}
          {linked ? (
            <span className={styles.stampOk}>
              <Check className="size-3.5" aria-hidden />
              Linked to this shop
            </span>
          ) : (
            <span>Saved on your account — verify to pull till receipts.</span>
          )}
        </p>
        <div className={styles.stampActions}>
          {tabHref ? (
            <Link href={tabHref} className={styles.ghost}>
              Open tab
            </Link>
          ) : null}
          <button
            type="button"
            className={styles.quiet}
            onClick={() => {
              setPhone(toKenyanLocal07(display) || "");
              setEditing(true);
              setStep("phone");
              setError("");
            }}
          >
            {linked ? "Change number" : "Verify number"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stamp}>
      <h2 className={styles.linkLead}>Link your number</h2>
      <p className={styles.linkCopy}>
        We send a 4-digit code by SMS or WhatsApp. Linking pulls in-store receipts, wallet, and your
        tab onto this account.
      </p>

      {step === "phone" ? (
        <form
          className={styles.formRow}
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}
        >
          <label className={styles.field}>
            Kenyan mobile
            <span className={styles.fieldBox}>
              <Phone className="size-4 shrink-0" aria-hidden />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0714 282 874"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </span>
          </label>
          <button type="submit" disabled={busy} className={styles.ctaAccent}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onConfirm();
          }}
        >
          <p className={styles.linkCopy}>
            Enter the code sent to <strong>{hint || formatKenyanPhoneDisplay(local)}</strong>.
          </p>
          <div className={styles.formRow}>
            <label className={styles.field}>
              4-digit code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                placeholder="••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={styles.codeSolo}
              />
            </label>
            <button type="submit" disabled={busy} className={styles.ctaAccent}>
              {busy ? "Linking…" : "Confirm & link"}
            </button>
          </div>
          <button
            type="button"
            className={styles.textLink}
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
          >
            Use a different number
          </button>
        </form>
      )}

      {error ? <p className={styles.err}>{error}</p> : null}

      {display && editing ? (
        <button
          type="button"
          className={styles.textLink}
          onClick={() => {
            setEditing(false);
            setError("");
            setStep("phone");
          }}
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}

function labelNetwork(id: string): string {
  switch (id) {
    case "SAFARICOM":
      return "Safaricom";
    case "AIRTEL":
      return "Airtel";
    case "TELKOM":
      return "Telkom";
    case "EQUITEL":
      return "Equitel";
    case "JTL":
      return "JTL";
    default:
      return id;
  }
}

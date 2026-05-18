"use client";

import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Check,
  Loader2,
  ScanBarcode,
  Smartphone,
} from "lucide-react";

const POS_CART_LINES = [
  { name: "Bottled Water 500ml", qty: 2, price: 90 },
  { name: "White Bread 400g", qty: 1, price: 65 },
  { name: "Milk 1L", qty: 1, price: 75 },
] as const;

const POS_CART_TOTAL = POS_CART_LINES.reduce(
  (sum, line) => sum + line.price,
  0,
);

const DEMO_MPESA_PHONE = "0712 345 678";
const DEMO_MPESA_REF = "QGH72K9XPL";

type SalePhase =
  | "idle"
  | "scanning"
  | "ready"
  | "stk_send"
  | "stk_waiting"
  | "stk_confirm"
  | "paid";

/** Sale demo timing — calm pace with full STK flow */
const SALE_INITIAL_MS = 800;
const SALE_LINE_MS = 2000;
const SALE_READY_DELAY_MS = 600;
const SALE_READY_HOLD_MS = 2400;
const SALE_STK_SEND_MS = 1600;
const SALE_STK_WAIT_MS = 4200;
const SALE_STK_CONFIRM_MS = 2400;
const SALE_PAID_HOLD_MS = 3600;
const SALE_SCAN_FLASH_MS = 520;

function cartSubtotal(visibleCount: number) {
  return POS_CART_LINES.slice(0, visibleCount).reduce(
    (sum, line) => sum + line.price,
    0,
  );
}

function isStkPhase(phase: SalePhase) {
  return (
    phase === "stk_send" ||
    phase === "stk_waiting" ||
    phase === "stk_confirm"
  );
}

function HeroStkPanel({
  phase,
  total,
}: {
  phase: SalePhase;
  total: number;
}) {
  if (!isStkPhase(phase) && phase !== "ready" && phase !== "paid") {
    return null;
  }

  const showPhonePrompt = phase === "stk_waiting" || phase === "stk_confirm";
  const showSending = phase === "stk_send";
  const showConfirming = phase === "stk_confirm";
  const showPaidRef = phase === "paid";

  return (
    <div
      className="hero-pos-stk-in mt-3 space-y-2.5 rounded-lg border border-[#43B02A]/25 bg-gradient-to-b from-[#43B02A]/8 to-transparent p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#2D8A3E]">
          M-Pesa STK Push
        </span>
        {showSending ? (
          <Loader2
            className="h-3 w-3 animate-spin text-[#43B02A]"
            strokeWidth={2}
            aria-hidden
          />
        ) : showPhonePrompt ? (
          <span className="hero-pos-stk-dots flex gap-0.5" aria-hidden>
            <span className="h-1 w-1 rounded-full bg-[#43B02A]" />
            <span className="h-1 w-1 rounded-full bg-[#43B02A]" />
            <span className="h-1 w-1 rounded-full bg-[#43B02A]" />
          </span>
        ) : showPaidRef ? (
          <Check className="h-3 w-3 text-[#20863B]" strokeWidth={2.5} aria-hidden />
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-bg)]/80 px-2 py-1.5">
        <Smartphone
          className={`h-3.5 w-3.5 shrink-0 text-[#43B02A] ${
            showPhonePrompt ? "hero-pos-phone-pulse" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="font-mono text-[11px] tabular-nums text-[var(--kiosk-text)]">
          {DEMO_MPESA_PHONE}
        </span>
      </div>

      {showSending ? (
        <p className="text-[10px] leading-snug text-[var(--kiosk-text-muted)]">
          Sending payment request to customer&apos;s phone…
        </p>
      ) : showPhonePrompt ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium leading-snug text-[var(--kiosk-text)]">
            {showConfirming
              ? "Customer entering PIN…"
              : "Check your phone"}
          </p>
          <p className="text-[10px] leading-snug text-[var(--kiosk-text-dim)]">
            Enter M-Pesa PIN to pay{" "}
            <span className="font-mono font-semibold text-[var(--kiosk-text)]">
              KES {total}
            </span>
          </p>
        </div>
      ) : showPaidRef ? (
        <p className="text-[10px] text-[var(--kiosk-text-muted)]">
          Confirmed · ref{" "}
          <span className="font-mono font-medium text-[var(--kiosk-text)]">
            {DEMO_MPESA_REF}
          </span>
        </p>
      ) : phase === "ready" ? (
        <p className="text-[10px] leading-snug text-[var(--kiosk-text-dim)]">
          Tap below to send STK Push for KES {total}
        </p>
      ) : null}
    </div>
  );
}

/** Live in-store sale demo on the hero screenshot */
export function HeroPosCart() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<SalePhase>("idle");
  const [scanFlash, setScanFlash] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const subtotal = cartSubtotal(visibleCount);
  const showTotal = visibleCount > 0;
  const allItemsIn = visibleCount >= POS_CART_LINES.length;
  const stkActive = isStkPhase(phase);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const reduced = mq.matches;
      setReduceMotion(reduced);
      if (reduced) {
        setVisibleCount(POS_CART_LINES.length);
        setPhase("paid");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
    };

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    const flashScan = () => {
      setScanFlash(true);
      schedule(() => setScanFlash(false), SALE_SCAN_FLASH_MS);
    };

    const runCycle = () => {
      clearTimers();
      setVisibleCount(0);
      setPhase("idle");
      setScanFlash(false);

      let t = SALE_INITIAL_MS;
      schedule(() => setPhase("scanning"), t);

      POS_CART_LINES.forEach((_, index) => {
        t += SALE_LINE_MS;
        const at = t;
        schedule(() => {
          flashScan();
          setVisibleCount(index + 1);
        }, at);
      });

      t += SALE_READY_DELAY_MS;
      schedule(() => setPhase("ready"), t);

      t += SALE_READY_HOLD_MS;
      schedule(() => setPhase("stk_send"), t);

      t += SALE_STK_SEND_MS;
      schedule(() => setPhase("stk_waiting"), t);

      t += SALE_STK_WAIT_MS;
      schedule(() => setPhase("stk_confirm"), t);

      t += SALE_STK_CONFIRM_MS;
      schedule(() => setPhase("paid"), t);

      t += SALE_PAID_HOLD_MS;
      schedule(() => runCycle(), t);
    };

    runCycle();
    return clearTimers;
  }, [reduceMotion]);

  const statusLabel =
    phase === "paid"
      ? "Paid"
      : phase === "stk_confirm"
        ? "Confirming…"
        : phase === "stk_waiting"
          ? "Awaiting PIN"
          : phase === "stk_send"
            ? "Sending STK…"
            : phase === "scanning"
              ? "Scanning…"
              : allItemsIn
                ? `${visibleCount} items`
                : "Open";

  const statusClass =
    phase === "paid"
      ? "bg-[#20863B]/15 text-[#20863B]"
      : stkActive
        ? "bg-[#43B02A]/12 text-[#2D8A3E] hero-pos-status-pulse"
        : phase === "scanning"
          ? "bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)] hero-pos-status-pulse"
          : "bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)]";

  const showStkPanel =
    phase === "ready" || stkActive || phase === "paid";

  return (
    <div
      className={`hero-pos-cart absolute bottom-4 left-4 z-30 w-[min(100%,268px)] rounded-xl border bg-[var(--kiosk-elevated)] p-3.5 shadow-[0_12px_40px_rgba(20,20,18,0.18)] sm:bottom-6 sm:left-6 sm:p-4 lg:bottom-8 lg:left-8 ${
        scanFlash
          ? "border-[var(--kiosk-gold)]/50"
          : stkActive
            ? "border-[#43B02A]/35"
            : "border-[var(--kiosk-border)]"
      }`}
      aria-hidden
    >
      {scanFlash ? (
        <div className="hero-pos-scan-flash pointer-events-none absolute inset-0 rounded-xl" />
      ) : null}

      <div className="relative mb-3 flex items-center justify-between gap-2 border-b border-[var(--kiosk-border-soft)] pb-2.5">
        <span className="text-[11px] font-semibold text-[var(--kiosk-gold)]">
          In-store sale
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusClass}`}
        >
          {phase === "paid" ? (
            <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          ) : null}
          {statusLabel}
        </span>
      </div>

      <ul className="min-h-[4.75rem] space-y-0">
        {visibleCount === 0 && phase !== "paid" ? (
          <li className="flex items-center gap-2 py-3 text-[10px] text-[var(--kiosk-text-dim)]">
            <ScanBarcode
              className={`h-3.5 w-3.5 shrink-0 text-[var(--kiosk-gold)] ${
                phase === "scanning" ? "hero-pos-scan-icon" : ""
              }`}
              strokeWidth={1.75}
              aria-hidden
            />
            <span>
              {phase === "scanning" ? "Scanning product…" : "Scan a product…"}
            </span>
          </li>
        ) : null}

        {POS_CART_LINES.slice(0, visibleCount).map((line, index) => (
          <li
            key={line.name}
            className="hero-pos-line-in flex items-start justify-between gap-2 py-2 text-[11px]"
            style={{
              animationDelay: reduceMotion ? undefined : `${index * 40}ms`,
              borderBottom:
                index < visibleCount - 1
                  ? "1px dashed var(--kiosk-border-soft)"
                  : undefined,
            }}
          >
            <span className="min-w-0 leading-snug text-[var(--kiosk-text-muted)]">
              <span className="font-mono text-[var(--kiosk-text-dim)]">
                {line.qty}×{" "}
              </span>
              {line.name}
            </span>
            <span className="shrink-0 font-mono tabular-nums font-medium text-[var(--kiosk-text)]">
              {line.price}
            </span>
          </li>
        ))}

        {phase === "scanning" &&
        visibleCount > 0 &&
        visibleCount < POS_CART_LINES.length ? (
          <li className="flex items-center gap-2 py-2 text-[10px] text-[var(--kiosk-text-dim)]">
            <ScanBarcode
              className="hero-pos-scan-icon h-3.5 w-3.5 text-[var(--kiosk-gold)]"
              strokeWidth={1.75}
              aria-hidden
            />
            Scanning…
          </li>
        ) : null}
      </ul>

      {allItemsIn && phase !== "idle" && phase !== "scanning" ? (
        <div className="mt-2 flex gap-1.5">
          <span className="flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--kiosk-border-soft)] bg-[var(--kiosk-bg)]/60 py-1 text-[9px] font-medium text-[var(--kiosk-text-dim)]">
            <Banknote className="h-3 w-3" aria-hidden />
            Cash
          </span>
          <span
            className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1 text-[9px] font-medium ${
              phase === "ready" || stkActive || phase === "paid"
                ? "border-[#43B02A]/40 bg-[#43B02A]/10 text-[#2D8A3E]"
                : "border-[var(--kiosk-border-soft)] text-[var(--kiosk-text-dim)]"
            }`}
          >
            <Smartphone className="h-3 w-3" aria-hidden />
            M-Pesa
          </span>
        </div>
      ) : null}

      <div
        className={`mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--kiosk-border-soft)] pt-2.5 transition-opacity duration-300 ${
          showTotal ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[11px] font-medium text-[var(--kiosk-text-muted)]">
          Total
        </span>
        <span
          key={subtotal}
          className="hero-pos-total-pop font-mono text-sm font-semibold tabular-nums text-[var(--kiosk-text)]"
        >
          KES {subtotal}
        </span>
      </div>

      {showStkPanel ? (
        <HeroStkPanel phase={phase} total={POS_CART_TOTAL} />
      ) : null}

      <div
        className={`mt-2.5 flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-[11px] font-semibold transition-all duration-300 ${
          phase === "paid"
            ? "bg-[#20863B] text-white"
            : phase === "stk_confirm"
              ? "bg-[#43B02A]/90 text-white"
              : stkActive
                ? "bg-[#43B02A]/15 text-[#2D8A3E]"
                : allItemsIn && phase === "ready"
                  ? "hero-pos-pay-ready bg-[var(--kiosk-gold)] text-[var(--kiosk-cta-text)]"
                  : allItemsIn
                    ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-cta-text)]"
                    : "bg-[var(--kiosk-border-soft)] text-[var(--kiosk-text-dim)]"
        }`}
      >
        {phase === "paid" ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            M-Pesa received
          </>
        ) : phase === "stk_confirm" ? (
          <>
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              strokeWidth={2}
              aria-hidden
            />
            Confirming payment…
          </>
        ) : phase === "stk_waiting" ? (
          "Waiting for customer PIN…"
        ) : phase === "stk_send" ? (
          <>
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              strokeWidth={2}
              aria-hidden
            />
            Sending STK Push…
          </>
        ) : allItemsIn ? (
          `Send STK Push · KES ${POS_CART_TOTAL}`
        ) : (
          "Add items to continue"
        )}
      </div>
    </div>
  );
}

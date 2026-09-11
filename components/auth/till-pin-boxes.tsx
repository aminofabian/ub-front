"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { TILL_SETUP_PIN_LENGTH } from "@/lib/pos-till-setup";
import { cn } from "@/lib/utils";

import styles from "./till-pin-boxes.module.css";

type TillPinBoxesProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label": string;
  autoComplete?: string;
  /** Marks the real input so the till lock key interceptor lets digits through. */
  dataTillUnlockPin?: string;
};

export function TillPinBoxes({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  "aria-label": ariaLabel,
  autoComplete = "new-password",
  dataTillUnlockPin = "1",
}: TillPinBoxesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.replace(/\D/g, "").slice(0, TILL_SETUP_PIN_LENGTH);
  const activeIndex = Math.min(digits.length, TILL_SETUP_PIN_LENGTH - 1);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }
    const el = inputRef.current;
    const t = window.setTimeout(() => {
      el?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(t);
  }, [autoFocus, disabled]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace" || digits.length === 0) {
      return;
    }
    if (event.currentTarget.selectionStart !== 0) {
      return;
    }
    onChange(digits.slice(0, -1));
  };

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        id={id}
        className={styles.input}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete={autoComplete}
        maxLength={TILL_SETUP_PIN_LENGTH}
        value={digits}
        disabled={disabled}
        aria-label={ariaLabel}
        data-till-unlock-pin={dataTillUnlockPin}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          onChange(event.target.value.replace(/\D/g, "").slice(0, TILL_SETUP_PIN_LENGTH));
        }}
      />
      <div className={styles.cells} aria-hidden>
        {Array.from({ length: TILL_SETUP_PIN_LENGTH }, (_, index) => {
          const filled = Boolean(digits[index]);
          const isActive =
            focused &&
            !disabled &&
            (digits.length === TILL_SETUP_PIN_LENGTH
              ? index === TILL_SETUP_PIN_LENGTH - 1
              : index === activeIndex && !filled);
          return (
            <div
              key={index}
              className={cn(styles.cell)}
              data-active={isActive ? "" : undefined}
            >
              {filled ? <span className={styles.dot} /> : isActive ? <span className={styles.caret} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

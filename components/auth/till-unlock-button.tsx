"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./till-unlock-button.module.css";

type TillUnlockButtonProps = {
  ready: boolean;
  busy: boolean;
  idleLabel: ReactNode;
  busyLabel?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function TillUnlockButton({
  ready,
  busy,
  idleLabel,
  busyLabel = "Unlocking",
  className,
  disabled,
  type = "submit",
  ...props
}: TillUnlockButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy || !ready}
      aria-busy={busy || undefined}
      data-ready={ready ? "" : undefined}
      data-busy={busy ? "" : undefined}
      className={cn(styles.btn, className)}
    >
      <span className={styles.bolt} aria-hidden />
      <span className={styles.sheen} aria-hidden />
      <span className={styles.face}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            className={styles.shackle}
            d="M7 11V8a5 5 0 0 1 10 0v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="11"
            width="14"
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle className={styles.keyhole} cx="12" cy="16" r="1.15" />
        </svg>
        <span className={styles.copy}>
          <span className={styles.idle} aria-hidden={busy || undefined}>
            {idleLabel}
          </span>
          <span className={styles.working} aria-hidden={!busy || undefined}>
            {busyLabel}
          </span>
        </span>
      </span>
    </button>
  );
}

import type { ReactNode } from "react";

type AuthAlertProps = {
  variant: "success" | "info" | "error";
  children: ReactNode;
};

export function AuthAlert({ variant, children }: AuthAlertProps) {
  const styles =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
      : variant === "info"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100"
        : "border-destructive/25 bg-destructive/10 text-destructive";

  return (
    <p role="status" className={`rounded-none border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

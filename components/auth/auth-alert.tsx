import type { ReactNode } from "react";

type AuthAlertProps = {
  variant: "success" | "error";
  children: ReactNode;
};

export function AuthAlert({ variant, children }: AuthAlertProps) {
  const styles =
    variant === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
      : "border-destructive/25 bg-destructive/10 text-destructive";

  return (
    <p role="status" className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

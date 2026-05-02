import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-muted/30 dark:from-slate-950 dark:via-background dark:to-slate-900/60">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 sm:py-16">
        {children}
      </div>
    </div>
  );
}

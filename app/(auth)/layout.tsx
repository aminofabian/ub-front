import type { ReactNode } from "react";

import { AuthClientGuards } from "@/components/auth/auth-client-guards";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AuthClientGuards />
      {children}
    </div>
  );
}

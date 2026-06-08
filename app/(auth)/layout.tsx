import type { ReactNode } from "react";

import { AuthClientGuards } from "@/components/auth/auth-client-guards";

type AuthLayoutProps = {
  children: ReactNode;
};

/** Runs before React so stale PWA workers cannot serve broken login bundles. */
const SW_UNREGISTER_SCRIPT = `
(function () {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    for (var i = 0; i < regs.length; i++) {
      regs[i].unregister();
    }
  });
})();
`;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <script dangerouslySetInnerHTML={{ __html: SW_UNREGISTER_SCRIPT }} />
      <AuthClientGuards />
      {children}
    </div>
  );
}

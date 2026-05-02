import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card/95 p-6 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

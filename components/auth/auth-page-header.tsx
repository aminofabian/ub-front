import type { ReactNode } from "react";

type AuthPageHeaderProps = {
  title: string;
  description: ReactNode;
};

export function AuthPageHeader({ title, description }: AuthPageHeaderProps) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</div>
    </div>
  );
}

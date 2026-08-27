import type { ReactNode } from "react";

type AuthPageHeaderProps = {
  title: string;
  description: ReactNode;
};

export function AuthPageHeader({ title, description }: AuthPageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[1.85rem]">
        {title}
      </h1>
      <div className="mt-2 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

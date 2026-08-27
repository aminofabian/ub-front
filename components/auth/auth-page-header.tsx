import type { ReactNode } from "react";

type AuthPageHeaderProps = {
  title: string;
  description: ReactNode;
};

export function AuthPageHeader({ title, description }: AuthPageHeaderProps) {
  return (
    <div className="mb-5">
      <h1 className="font-heading text-[1.625rem] font-semibold leading-[1.12] tracking-[-0.025em] text-foreground sm:text-[1.75rem]">
        {title}
      </h1>
      <div className="mt-2.5 max-w-[42ch] text-[14px] leading-[1.55] text-muted-foreground">
        {description}
      </div>
    </div>
  );
}

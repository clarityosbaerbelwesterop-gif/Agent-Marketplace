import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  width?: "default" | "wide" | "narrow";
};

const widths = {
  narrow: "max-w-2xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
} as const;

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  width = "default",
}: PageShellProps) {
  return (
    <main className={cn("mx-auto flex w-full flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14", widths[width])}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="text-base leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {children}
    </main>
  );
}

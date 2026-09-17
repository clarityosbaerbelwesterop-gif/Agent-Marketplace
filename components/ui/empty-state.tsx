import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button-link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-6 py-10",
        className,
      )}
    >
      {icon}
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref}>{actionLabel}</ButtonLink>
      ) : null}
    </div>
  );
}

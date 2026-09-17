import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-accent-subtle text-foreground",
  accent: "bg-accent text-accent-foreground",
  warning: "bg-warning-subtle text-warning",
  muted: "bg-surface text-muted ring-1 ring-border",
  outline: "bg-transparent text-foreground ring-1 ring-border",
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

export function Badge({ className, tone = "muted", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

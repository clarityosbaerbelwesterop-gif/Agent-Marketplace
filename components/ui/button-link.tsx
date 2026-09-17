import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary:
    "bg-surface-raised text-foreground ring-1 ring-border hover:bg-accent-subtle",
  ghost: "bg-transparent text-foreground hover:bg-accent-subtle",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

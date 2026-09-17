import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover disabled:bg-accent/40",
  secondary:
    "bg-surface-raised text-foreground ring-1 ring-border hover:bg-accent-subtle disabled:opacity-50",
  ghost:
    "bg-transparent text-foreground hover:bg-accent-subtle disabled:opacity-50",
  danger:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

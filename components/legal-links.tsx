import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

export function LegalLinks({
  className,
  prefix,
  separator = " · ",
}: {
  className?: string;
  prefix?: string;
  separator?: string;
}) {
  return (
    <p className={cn("text-sm text-muted", className)}>
      {prefix ? <span>{prefix} </span> : null}
      {LEGAL_LINKS.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? separator : null}
          <Link
            href={link.href}
            className="underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

import type { ReactNode } from "react";

export function LegalArticle({ children }: { children: ReactNode }) {
  return (
    <article className="flex max-w-3xl flex-col gap-8 text-sm leading-relaxed text-foreground/90">
      {children}
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

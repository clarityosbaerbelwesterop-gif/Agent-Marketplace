import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        <p className="text-base leading-relaxed text-muted">{description}</p>
      </div>
      {children}
    </main>
  );
}

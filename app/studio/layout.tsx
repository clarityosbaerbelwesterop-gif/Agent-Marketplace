import type { Metadata } from "next";
import "./studio.css";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "One canvas: Plan → Tools → Verify → PR. Run once and watch the log.",
};

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div lang="en" className="studio-shell">
      <a className="studio-skip" href="#studio-log">
        Skip to run log
      </a>
      {children}
    </div>
  );
}

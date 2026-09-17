import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Chat",
};

export default function ChatPage() {
  return (
    <PageShell
      title="Chat"
      description="Conversation UI for a rented agent will live here. No model calls or message history in this foundation."
    />
  );
}

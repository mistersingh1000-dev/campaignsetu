import type { Metadata } from "next";
import ChatDashboard from "@/components/ChatDashboard";

export const metadata: Metadata = {
  title: "Chat Inbox — Codecraft Messaging Hub",
  description: "Manage your WhatsApp conversations and send messages.",
};

export default function ChatPage() {
  return <ChatDashboard />;
}

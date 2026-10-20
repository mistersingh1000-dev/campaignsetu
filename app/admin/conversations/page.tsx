import type { Metadata } from "next";
import AdminConversations from "@/components/AdminConversations";

export const metadata: Metadata = {
  title: "Customer Conversations — Admin",
  description: "Monitor customer conversations",
};

export default function ConversationsPage() {
  return <AdminConversations />;
}

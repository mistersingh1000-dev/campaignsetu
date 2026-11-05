import type { Metadata } from "next";
import ContactManager from "@/components/ContactManager";

export const metadata: Metadata = {
  title: "Contacts — CampaignSetu",
  description: "Manage your WhatsApp contacts",
};

export default function ContactsPage() {
  return <ContactManager />;
}

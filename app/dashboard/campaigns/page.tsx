import type { Metadata } from "next";
import CampaignManager from "@/components/CampaignManager";

export const metadata: Metadata = {
  title: "Campaigns — CampaignSetu",
  description: "Send approved WhatsApp template campaigns to consented contacts.",
};

export default function CampaignsPage() {
  return <CampaignManager />;
}

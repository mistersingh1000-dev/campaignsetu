import DashboardModulePage from "@/components/DashboardModulePage";

export default function CtwaAdsPage() {
  return <DashboardModulePage
    eyebrow="CTWA Ads"
    title="Click-to-WhatsApp campaign workspace"
    description="Prepare the WhatsApp side of Click-to-WhatsApp lead flows: connected number, lead routing, tags, automation and follow-up. Ad creation and delivery remain managed through Meta's advertising products."
    cards={[
      { title: "Connect WhatsApp first", description: "Use Embedded Signup so the correct customer-owned WhatsApp Business number is connected before campaign setup.", icon: "whatsapp", href: "/dashboard/channels", badge: "Required" },
      { title: "Lead automation", description: "Create keyword replies and tagging rules for enquiries arriving from advertising campaigns.", icon: "bolt", href: "/dashboard/automations" },
      { title: "Inbox routing", description: "Handle incoming ad enquiries from the central WhatsApp conversation inbox.", icon: "inbox", href: "/dashboard/chat" },
      { title: "Lead tags", description: "Tag ad leads by campaign, city, service or intent for CRM follow-up.", icon: "link", href: "/dashboard/lead-crm" },
      { title: "Follow-up campaigns", description: "Use approved templates only where Meta policy and customer consent allow business-initiated follow-up.", icon: "send", href: "/dashboard/campaigns" },
      { title: "Performance view", description: "Combine WhatsApp conversation metrics with your external ad reporting when evaluating lead quality.", icon: "chart", href: "/dashboard/analytics" },
    ]}
  />;
}

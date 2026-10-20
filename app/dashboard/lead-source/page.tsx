import DashboardModulePage from "@/components/DashboardModulePage";

export default function LeadSourcePage() {
  return <DashboardModulePage
    eyebrow="Lead Source & QR"
    title="Track where WhatsApp enquiries begin"
    description="Prepare source labels and WhatsApp entry points for campaigns, QR placements and offline marketing. Use tags and campaign naming to keep lead sources understandable in the CRM."
    cards={[
      { title: "QR entry points", description: "Create WhatsApp click/QR entry points for visiting cards, posters, stores and offline promotions using your connected business number.", icon: "webhook", badge: "Entry point" },
      { title: "Campaign source tags", description: "Use tags such as Meta Ads, Instagram, QR Poster or Website to distinguish lead sources.", icon: "link", href: "/dashboard/lead-crm" },
      { title: "Automation routing", description: "Use different keywords or welcome flows to identify and route incoming enquiries.", icon: "bolt", href: "/dashboard/automations" },
      { title: "Contact records", description: "Keep source-related tags alongside customer contact and consent information.", icon: "report", href: "/dashboard/contacts" },
      { title: "Inbox", description: "Open incoming conversations and continue qualification from one workspace.", icon: "inbox", href: "/dashboard/chat" },
      { title: "Analytics", description: "Review message and contact metrics alongside the source labels used in your CRM workflow.", icon: "chart", href: "/dashboard/analytics" },
    ]}
  />;
}

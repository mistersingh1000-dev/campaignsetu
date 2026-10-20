import DashboardModulePage from "@/components/DashboardModulePage";

export default function LeadCrmPage() {
  return <DashboardModulePage
    eyebrow="Lead CRM"
    title="Organize and qualify WhatsApp leads"
    description="Keep contacts structured with tags, consent status and conversation context, then move qualified leads into campaigns or automation flows."
    cards={[
      { title: "Contact database", description: "Use the existing contacts workspace as the CRM source of truth for customer phone numbers and tags.", icon: "link", href: "/dashboard/contacts", badge: "Live data" },
      { title: "Lead tags", description: "Use tags such as New Lead, Hot Lead, Existing Customer or Follow-up to segment conversations.", icon: "report" },
      { title: "Inbox follow-up", description: "Open the conversation inbox to reply to active leads and keep communication history together.", icon: "inbox", href: "/dashboard/chat" },
      { title: "Automation tagging", description: "Keyword automation rules can automatically add CRM tags when inbound messages match.", icon: "bolt", href: "/dashboard/automations" },
      { title: "Campaign audiences", description: "Reuse CRM tags as consented campaign segments for approved WhatsApp templates.", icon: "send", href: "/dashboard/campaigns" },
      { title: "Lead analytics", description: "Review contact, message and connection metrics from the analytics workspace.", icon: "chart", href: "/dashboard/analytics" },
    ]}
  />;
}

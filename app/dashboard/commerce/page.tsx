import DashboardModulePage from "@/components/DashboardModulePage";

export default function CommercePage() {
  return <DashboardModulePage
    eyebrow="Leads & Commerce"
    title="Turn conversations into business workflows"
    description="Combine WhatsApp conversations, lead tags, templates and automation to support enquiries, product interest, order follow-up and customer service."
    cards={[
      { title: "Lead capture", description: "Route inbound WhatsApp conversations into the inbox and contact database.", icon: "inbox", href: "/dashboard/chat", badge: "Connected workflow" },
      { title: "Product enquiry automation", description: "Create keyword rules for product names, pricing, availability or service enquiries.", icon: "bot", href: "/dashboard/automations" },
      { title: "Approved templates", description: "Use Meta-approved templates for eligible business-initiated updates and campaigns.", icon: "send", href: "/dashboard/templates" },
      { title: "Customer segments", description: "Organize contacts by tags, intent, city, company or customer status.", icon: "link", href: "/dashboard/contacts" },
      { title: "Campaign follow-up", description: "Launch compliant template campaigns only to eligible, opted-in audiences.", icon: "send", href: "/dashboard/campaigns" },
      { title: "Performance view", description: "Use analytics to monitor conversations, unread messages and messaging outcomes.", icon: "chart", href: "/dashboard/analytics" },
    ]}
  />;
}

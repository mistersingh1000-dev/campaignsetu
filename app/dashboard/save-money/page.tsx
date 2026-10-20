import DashboardModulePage from "@/components/DashboardModulePage";

export default function SaveMoneyPage() {
  return <DashboardModulePage
    eyebrow="Save Money"
    title="Messaging cost controls"
    description="Use compliant messaging practices, consent records and campaign segmentation to reduce avoidable sends. Actual WhatsApp Business Platform charges are billed according to Meta's current pricing for the customer's own account."
    cards={[
      { title: "Opt-in audiences", description: "Send marketing campaigns only to contacts with recorded marketing consent.", icon: "shield", href: "/dashboard/contacts", badge: "Recommended" },
      { title: "Do Not Message protection", description: "Automatically exclude contacts that opted out or are marked as Do Not Message.", icon: "shield" },
      { title: "Segment campaigns", description: "Target tags and relevant audiences instead of sending every campaign to the full database.", icon: "send", href: "/dashboard/campaigns" },
      { title: "Automation first", description: "Use inbound keyword replies for repetitive questions and route only qualified conversations to staff.", icon: "bolt", href: "/dashboard/automations" },
      { title: "Delivery tracking", description: "Review delivery and read outcomes before repeating or expanding a campaign.", icon: "chart", href: "/dashboard/analytics" },
      { title: "Meta pricing remains separate", description: "Platform subscription fees do not include Meta WhatsApp usage charges.", icon: "report" },
    ]}
  />;
}

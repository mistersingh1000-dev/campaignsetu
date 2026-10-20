import DashboardModulePage from "@/components/DashboardModulePage";

export default function MediaPage() {
  return <DashboardModulePage
    eyebrow="Media Library"
    title="Campaign and message media"
    description="Keep campaign-ready media organized for future WhatsApp template and conversation workflows. This screen is the management entry point; actual media sending remains subject to WhatsApp template and messaging rules."
    cards={[
      { title: "Images", description: "Prepare product, service and promotional images for approved messaging workflows.", icon: "report", badge: "Library" },
      { title: "Documents", description: "Keep brochures, PDFs and customer documents organized for support and sales workflows.", icon: "report" },
      { title: "Campaign assets", description: "Pair approved templates with the right creative assets before launching campaigns.", icon: "send", href: "/dashboard/campaigns" },
      { title: "Template manager", description: "Review the existing WhatsApp template workspace before using business-initiated media messages.", icon: "spark", href: "/dashboard/templates" },
      { title: "Consent first", description: "Marketing media should only be sent to contacts with appropriate opt-in records.", icon: "shield", href: "/dashboard/contacts" },
      { title: "Delivery analytics", description: "Review message outcomes after campaigns are sent.", icon: "chart", href: "/dashboard/analytics" },
    ]}
  />;
}

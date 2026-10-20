import DashboardModulePage from "@/components/DashboardModulePage";

export default function SettingsPage() {
  return <DashboardModulePage
    eyebrow="Settings"
    title="Workspace settings"
    description="Manage the account areas that affect WhatsApp onboarding, automation behavior, company details and subscription access. Sensitive Meta credentials remain server-side and are not shown to normal customers."
    cards={[
      { title: "WhatsApp channel", description: "Connect or review the customer-owned WhatsApp Business account through Embedded Signup.", icon: "whatsapp", href: "/dashboard/channels", badge: "Recommended" },
      { title: "Automation settings", description: "Create, pause, test and prioritize chatbot rules and fallback replies.", icon: "bolt", href: "/dashboard/automations" },
      { title: "Profile", description: "Review your signed-in account profile and workspace identity.", icon: "report", href: "/dashboard/profile" },
      { title: "Company profile", description: "Keep company details ready for future CRM, billing and onboarding workflows.", icon: "link", href: "/dashboard/company" },
      { title: "Subscription", description: "Review platform plan access, trial state and upgrade options.", icon: "shield", href: "/dashboard/subscription" },
      { title: "Security", description: "Passwords, OTPs and Meta access tokens must never be shared through support chat or email.", icon: "key" },
    ]}
  />;
}

import DashboardModulePage from "@/components/DashboardModulePage";

export default function SubscriptionPage() {
  return <DashboardModulePage
    eyebrow="Subscription & Plans"
    title="Platform access and billing"
    description="Review plan options and keep your WhatsApp automation workspace active. WhatsApp Business Platform usage charges from Meta are separate from the platform subscription."
    cards={[
      { title: "Choose a plan", description: "Open the current pricing page to start or renew platform access.", icon: "shield", href: "/pricing", badge: "Plans" },
      { title: "7-day trial", description: "New accounts can use the configured platform trial before a paid subscription is required.", icon: "spark" },
      { title: "Automatic checkout", description: "When Razorpay is configured, verified payments can activate eligible plans automatically.", icon: "check" },
      { title: "Manual UPI fallback", description: "Manual payment verification can remain available when automatic checkout is unavailable.", icon: "report" },
      { title: "Expired access protection", description: "Mutating API actions are locked after access expires while saved account data remains protected.", icon: "key" },
      { title: "Meta usage billing", description: "Meta messaging and WhatsApp Business Platform charges are billed separately according to Meta's current pricing.", icon: "chart" },
    ]}
  />;
}

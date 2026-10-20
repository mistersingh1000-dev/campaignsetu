import type { Metadata } from "next";
import Legal from "@/components/Legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using Codecraft Messaging Hub's WhatsApp Business Platform integration software.",
};

const sections = [
  { h: "1. Acceptance of terms", p: "By purchasing a plan or using Codecraft Messaging Hub, you agree to these terms and to Meta's WhatsApp Business Platform policies. If you do not agree, do not use the service." },
  { h: "2. Service description and operator", p: "Codecraft Messaging Hub is independent software operated by Codecraft Marketing. It helps customers connect and use customer-owned WhatsApp Business Platform accounts, including Meta-hosted Embedded Signup, a dashboard, messaging tools and supporting automation. Codecraft Messaging Hub is not Meta, WhatsApp, or an official Meta/WhatsApp product and is not affiliated with or endorsed by Meta Platforms, Inc." },
  { h: "3. Account credentials", p: "You are responsible for keeping your Codecraft Messaging Hub login credentials confidential. Facebook credentials and verification codes should only be entered into Meta-hosted flows when Meta requests them. We will never ask you to send us your Facebook password, Facebook OTP, WhatsApp OTP, Meta access token, card PIN, or banking password through chat, email, or support messages." },
  { h: "4. Acceptable use", p: "You must collect valid opt-in consent, send only approved message templates where required, and comply with Meta's Commerce and Business Messaging policies. Spam, unsolicited messaging, and prohibited content may result in suspension by us or by Meta." },
  { h: "5. Payments & refunds", p: "Platform plans may be paid through Razorpay when configured or through the clearly identified manual UPI fallback. Prices are in Indian Rupees and may exclude applicable taxes. WhatsApp Business Platform usage charges billed by Meta are separate. Refund eligibility, if any, is described at checkout." },
  { h: "6. Service availability", p: "We target high availability but do not guarantee uninterrupted service. The WhatsApp Business Platform is operated by Meta and is subject to Meta's uptime, rate limits, quality controls, eligibility rules and policies." },
  { h: "7. Limitation of liability", p: "To the maximum extent permitted by law, our liability is limited to the amount you paid in the preceding three months. We are not liable for indirect or consequential damages, including message delivery failures or account decisions made by third-party platforms." },
  { h: "8. Changes", p: "We may update these terms; material changes will be posted on this page with a revised date. Continued use constitutes acceptance." },
];

export default function TermsPage() {
  return <Legal title="Terms & Conditions" updated="October 2026" sections={sections} />;
}

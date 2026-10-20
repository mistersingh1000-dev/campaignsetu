import type { Metadata } from "next";
import Legal from "@/components/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Codecraft Messaging Hub collects, uses, and protects your data.",
};

const sections = [
  { h: "1. Information we collect", p: "We collect account details (name, email, phone, company), payment metadata from Razorpay, and the WhatsApp Business Account identifiers you authorize through Meta Embedded Signup. We do not store your customers' message content beyond what is needed to deliver the service." },
  { h: "2. How we use data", p: "To provision and operate your API access, process payments, provide support, send service notices, and improve the product. We do not sell your personal data." },
  { h: "3. Meta & WhatsApp data", p: "When you complete Embedded Signup, Meta shares your WABA and phone number identifiers with us so we can register your number. Use of WhatsApp data is governed by Meta's terms and your own privacy obligations to your customers." },
  { h: "4. Data sharing", p: "We share data only with processors needed to run the service (e.g., payment and hosting providers) under appropriate safeguards, or where required by law." },
  { h: "5. Security", p: "Access tokens and secrets are stored securely and used server-side only. We apply industry-standard measures, though no system is perfectly secure." },
  { h: "6. Your rights", p: "You may request access, correction, or deletion of your personal data by contacting us. We retain data only as long as necessary for the purposes described or as required by law." },
  { h: "7. Cookies", p: "We use essential cookies for session and preference handling (such as your theme choice). Analytics cookies, if enabled, are described in our cookie notice." },
  { h: "8. Contact", p: "For privacy questions, contact us at the email listed in the footer." },
];

export default function PrivacyPage() {
  return <Legal title="Privacy Policy" updated="January 2026" sections={sections} />;
}

export const site = {
  name: "Codecraft Messaging Hub",
  shortName: "Messaging Hub",
  domain:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://whatsappapi2nd-plan-las.vercel.app",
  tagline: "Independent business messaging, onboarding and automation",
  description:
    "Connect customer-owned WhatsApp Business Platform accounts through Meta Embedded Signup, manage conversations and contacts, run consented template campaigns, and automate inbound replies from one dashboard.",
  email: "mistersingh1000@gmail.com",
  phone: "+91 70097 32517",
  whatsapp: "917009732517",
  whatsappMessage: "Hi, I am interested in the Codecraft Messaging Hub platform.",

  // Manual UPI fallback. Automatic Razorpay checkout is used when configured.
  upiId: "9501216365@mbk",
  upiName: "Codecraft Marketing · MobiKwik",
  upiQrImage: "/upi-qr.jpeg",
};

export const nav = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "API Setup", href: "/api-setup" },
  { label: "Embedded Signup", href: "/embedded-signup" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "FAQ", href: "/faq" },
];

export const footerLinks = {
  Product: [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Developers: [
    { label: "API Setup", href: "/api-setup" },
    { label: "Embedded Signup", href: "/embedded-signup" },
    { label: "API Documentation", href: "/api-setup#docs" },
    { label: "Webhooks", href: "/api-setup#webhooks" },
  ],
  Company: [
    { label: "Contact", href: "/contact" },
    { label: "Support", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  per?: string;
  note?: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
  cta: string;
};

const planCore = ["Embedded Signup", "Inbox & contacts", "Template campaigns", "Keyword chatbot"];

export const plans: Plan[] = [
  { id: "monthly", name: "Monthly", price: 499, per: "/month", features: planCore, cta: "Start now" },
  { id: "quarterly", name: "3 Months", price: 999, per: "/quarter", features: [...planCore, "Priority support"], cta: "Choose plan" },
  { id: "halfyear", name: "6 Months", price: 1499, per: "/6 mo", features: [...planCore, "Onboarding assistance"], cta: "Choose plan" },
  { id: "yearly", name: "1 Year", price: 1999, per: "/year", badge: "Best seller", features: [...planCore, "Priority support"], cta: "Choose plan" },
  { id: "3year", name: "3 Years", price: 2999, per: "/3 yr", features: [...planCore, "Long-term access"], cta: "Choose plan" },
  { id: "5year", name: "5 Years", price: 3999, per: "/5 yr", features: [...planCore, "Long-term access"], cta: "Choose plan" },
  { id: "10year", name: "10 Years", price: 4999, per: "/10 yr", features: [...planCore, "Long-term access"], cta: "Choose plan" },
  {
    id: "lifetime",
    name: "Lifetime",
    price: 5999,
    note: "one-time platform access",
    badge: "Most popular",
    highlight: true,
    features: [...planCore, "Product updates included", "Priority support"],
    cta: "Buy lifetime plan",
  },
];

export const features = [
  { title: "Meta Embedded Signup", desc: "Customers connect their own Business Portfolio, WABA and number through Meta's hosted onboarding flow.", icon: "spark" },
  { title: "Conversation Inbox", desc: "View inbound conversations and reply from the dashboard within applicable messaging rules.", icon: "inbox" },
  { title: "Contacts & Consent", desc: "Import and organize contacts with tags, marketing opt-in records and Do Not Message protection.", icon: "link" },
  { title: "Template Campaigns", desc: "Send Meta-approved WhatsApp templates to consented audiences or CRM tag segments.", icon: "send" },
  { title: "Keyword Chatbot", desc: "Create priority keyword rules and a default fallback reply with optional CRM tagging.", icon: "bot" },
  { title: "Signed Webhooks", desc: "Process authenticated Meta webhook events for messages and delivery/read status updates.", icon: "webhook" },
  { title: "Account Analytics", desc: "See conversation, contact, message, unread and connection metrics.", icon: "chart" },
  { title: "Subscription Access", desc: "7-day trial, paid access gating, automatic online checkout when configured and manual UPI fallback.", icon: "shield" },
];

export const signupSteps = [
  {
    n: 1,
    title: "Create your account",
    desc: "Register for Codecraft Messaging Hub and start the 7-day platform trial.",
  },
  {
    n: 2,
    title: "Connect WhatsApp",
    desc: "Tap Connect WhatsApp to open the official Meta Embedded Signup popup.",
  },
  {
    n: 3,
    title: "Choose business assets",
    desc: "Inside Meta, choose or create the correct Business Portfolio, WhatsApp Business Account and phone number.",
  },
  {
    n: 4,
    title: "Complete Meta verification",
    desc: "Complete any OTP, business verification or eligibility step Meta requires for the selected account or number.",
  },
  {
    n: 5,
    title: "Use automation tools",
    desc: "After activation, use inbox, contacts, templates, broadcasts and keyword chatbot rules from the dashboard.",
  },
];

export const faqs = [
  {
    q: "What is the WhatsApp Business Platform Cloud API?",
    a: "It is Meta's official programmatic WhatsApp interface for eligible businesses. Businesses can send and receive messages through approved integrations, subject to Meta's policies, permissions, templates and messaging rules.",
  },
  {
    q: "How does Embedded Signup work?",
    a: "Embedded Signup opens a Meta-hosted Facebook Login for Business flow. The customer chooses the relevant Business Portfolio, WhatsApp Business Account and number, and the platform completes the server-side connection after Meta returns the authorization result.",
  },
  {
    q: "Does Embedded Signup guarantee instant API approval?",
    a: "No. The onboarding popup can make account connection much faster, but Meta controls App Review, business verification, number eligibility and any additional approvals required for a specific account.",
  },
  {
    q: "Can I use an existing WhatsApp number?",
    a: "It depends on the number's current WhatsApp setup and Meta's supported migration or coexistence options at the time you onboard it. Follow the current options Meta shows during Embedded Signup rather than deleting an existing account without confirming the migration path.",
  },
  {
    q: "Can I send bulk or marketing messages?",
    a: "Business-initiated messaging must follow Meta's current opt-in, template, category and policy requirements. Codecraft Messaging Hub automatically excludes contacts without recorded marketing opt-in and contacts marked Do Not Message from campaigns.",
  },
  {
    q: "How does the chatbot work?",
    a: "You can create keyword or phrase rules, choose contains or exact matching, set rule priority, add a default fallback reply and optionally tag matching contacts. Replies run from authenticated inbound webhook events while the account subscription is active.",
  },
  {
    q: "Are Meta messaging charges included in the platform price?",
    a: "No. The prices shown are for Codecraft Messaging Hub platform access. WhatsApp Business Platform usage charges billed by Meta are separate and depend on the customer's own account activity and Meta's current pricing.",
  },
  {
    q: "How are subscriptions activated?",
    a: "When Razorpay is configured, secure online payments can be verified server-side and activate the plan automatically. Manual UPI with admin verification remains available as a fallback.",
  },
];

export const stats = [
  { value: 8, suffix: "", label: "Core platform capabilities" },
  { value: 7, suffix: " days", label: "Dashboard trial" },
  { value: 1, suffix: "", label: "Unified automation dashboard" },
  { value: 0, suffix: "", label: "Unsupported performance claims" },
];

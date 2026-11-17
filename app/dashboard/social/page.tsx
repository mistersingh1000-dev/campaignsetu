import SocialChannelsHub from "@/components/SocialChannelsHub";
import SocialPublisher from "@/components/SocialPublisher";

export const metadata = {
  title: "Social Publisher – All-in-One Social Management",
  description: "Connect and publish to Facebook, Instagram, Twitter (X), and WhatsApp from one dashboard.",
};

export default function SocialPublisherPage() {
  return (
    <section className="px-4 py-6 md:px-8 md:py-8 space-y-8">
      <div className="rounded-[28px] bg-gradient-to-r from-[#0d9f67] to-[#10b981] p-7 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">All-in-One Publisher</p>
        <h1 className="mt-2 text-3xl font-bold">Social Media Management</h1>
        <p className="mt-2 text-white/85">Connect Facebook, Instagram, Twitter (X), and WhatsApp to publish from one workspace.</p>
      </div>
      <SocialPublisher />
      <SocialChannelsHub />
    </section>
  );
}

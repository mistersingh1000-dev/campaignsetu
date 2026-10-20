import type { Metadata } from "next";
import TemplateManager from "@/components/TemplateManager";

export const metadata: Metadata = {
  title: "Templates — WhatsApp Connect Pro",
  description: "Sync and submit WhatsApp Business Platform message templates.",
};

export default function TemplatesPage() {
  return <TemplateManager />;
}

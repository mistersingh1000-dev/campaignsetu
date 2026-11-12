import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Panel — Manage Users & Plans",
  description: "Administrator dashboard for managing customer accounts, plans, and subscriptions.",
};

export default function AdminPage() {
  return <><div className="container-px pt-6"><div className="flex flex-wrap gap-2"><Link href="/admin/website-chat" className="btn-ghost inline-flex">Open Website Live Chat →</Link><Link href="/admin/ai-assistant" className="btn-ghost inline-flex">Approved Answers & Review Queue →</Link></div></div><AdminPanel /></>;
}

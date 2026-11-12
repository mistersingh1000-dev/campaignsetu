import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Panel — Manage Users & Plans",
  description: "Administrator dashboard for managing customer accounts, plans, and subscriptions.",
};

export default function AdminPage() {
  return <><div className="container-px pt-6"><Link href="/admin/website-chat" className="btn-ghost inline-flex">Open Website Live Chat →</Link></div><AdminPanel /></>;
}

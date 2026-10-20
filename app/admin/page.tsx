import type { Metadata } from "next";
import AdminPanel from "@/components/AdminPanel";

export const metadata: Metadata = {
  title: "Admin Panel — Manage Users & Plans",
  description: "Administrator dashboard for managing customer accounts, plans, and subscriptions.",
};

export default function AdminPage() {
  return <AdminPanel />;
}

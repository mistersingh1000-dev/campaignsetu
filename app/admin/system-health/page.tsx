import type { Metadata } from "next";
import Link from "next/link";
import SystemHealth from "@/components/SystemHealth";

export const metadata: Metadata = {
  title: "System Health — Admin",
  description: "Check production configuration readiness without exposing secret values.",
};

export default function SystemHealthPage() {
  return (
    <section className="container-px py-12">
      <div className="mb-8">
        <Link href="/admin" className="muted text-sm hover:text-emerald">← Back to admin</Link>
        <h1 className="font-display mt-3 text-3xl font-bold">System Health</h1>
        <p className="muted mt-2 max-w-2xl text-sm leading-relaxed">
          See what is configured, what is still missing, and which Meta approvals must be checked outside the website.
        </p>
      </div>
      <SystemHealth />
    </section>
  );
}

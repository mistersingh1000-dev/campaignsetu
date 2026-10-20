import type { Metadata } from "next";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Analytics — Codecraft Messaging Hub",
  description: "Your chat analytics and metrics",
};

export default function AnalyticsPage() {
  return (
    <div className="container-px py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="muted mt-2">Your chat activity and metrics</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}

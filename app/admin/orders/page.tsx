import type { Metadata } from "next";
import AdminOrders from "@/components/AdminOrders";

export const metadata: Metadata = {
  title: "Payments — Admin",
  description: "Review UPI payments and activate customer plans.",
};

export default function AdminOrdersPage() {
  return <AdminOrders />;
}

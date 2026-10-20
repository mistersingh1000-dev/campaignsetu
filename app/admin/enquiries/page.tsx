import type { Metadata } from "next";
import AdminEnquiries from "@/components/AdminEnquiries";

export const metadata: Metadata = {
  title: "Enquiries — Admin",
  description: "Contact form messages.",
};

export default function AdminEnquiriesPage() {
  return <AdminEnquiries />;
}

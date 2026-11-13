import { redirect } from "next/navigation";

/** Keep the previously shared /crm entry point working. */
export default function CrmEntryPage() {
  redirect("/dashboard/lead-crm");
}

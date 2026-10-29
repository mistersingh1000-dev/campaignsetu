import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
export const dynamic="force-dynamic";
export default async function Page(){
 if(!(await getAdminSession()))redirect("/login");
 const enabled=process.env.BACKUP_EXPORT_ENABLED==="true"&&!!process.env.BACKUP_EXPORT_PUBLIC_KEY;
 return <main style={{maxWidth:760,margin:"60px auto",padding:24}}><h1>CampaignSetu encrypted backup</h1><p>Administrator only. Exports all Firestore collections and nested documents, runtime configuration and available Firebase Storage files. Includes account and credential data encrypted to the configured public key.</p><p>Keep the private restore key separately. This is a logical export while the website is running, not a point-in-time snapshot.</p><p>Status: {enabled?"Export enabled":"Export disabled"}</p><form method="POST" action="/api/admin/disaster-backup"><button disabled={!enabled} style={{padding:16,marginTop:24,border:"1px solid",borderRadius:12}}>Download encrypted backup</button></form></main>;
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CrmPlans from "./CrmPlans";
export default function CrmSubscription(){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/crm/subscription",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setData(d);}).catch(e=>setError(e.message));},[]);
 return <div className="space-y-10">{error&&<p role="alert">{error}</p>}{data&&<section className="rounded-2xl border p-6 dark:border-white/15"><h2 className="text-xl font-bold">Your CRM subscription</h2><p className="mt-2">{data.access.trial?"7-day Pro trial":data.access.legacy?"Existing platform account · Pro CRM access":data.access.limits.name} · {data.access.active?"Active":"Read-only / expired"}{data.access.endsAt?` · Access ends ${new Date(data.access.endsAt).toLocaleDateString()}`:""}</p><div className="mt-4 grid gap-3 sm:grid-cols-4">{(["leads","fields","templates","pages"] as const).map(k=><p className="rounded-xl bg-emerald/10 p-4" key={k}><strong>{data.usage[k]} / {data.access.limits[k]}</strong><span className="block text-sm capitalize">{k}</span></p>)}</div><p className="muted mt-3 text-sm">WhatsApp/API platform access is separate. CRM renewal does not extend an API subscription.</p><Link href="/dashboard/support" className="mt-3 inline-block underline">Questions, plan changes or billing help? Raise a ticket →</Link></section>}<CrmPlans/><p className="text-center text-sm"><Link href="/pricing" className="underline">View WhatsApp/API platform plans →</Link></p></div>;
}

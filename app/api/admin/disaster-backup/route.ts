import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { encodeBackupValue, encryptBackup } from "@/lib/disaster-backup";
import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({error:"forbidden"},{status:403});
  if (process.env.BACKUP_EXPORT_ENABLED !== "true" || !process.env.BACKUP_EXPORT_PUBLIC_KEY) return NextResponse.json({error:"backup_export_disabled"},{status:503});
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin;
  if (req.headers.get("origin") !== expected) return NextResponse.json({error:"invalid_origin"},{status:403});
  const db = getDb(); if (!db) return NextResponse.json({error:"database_unavailable"},{status:503});
  const startedAt = new Date().toISOString();
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT || Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "", "base64").toString("utf8");
  const projectId = JSON.parse(serviceAccountRaw).project_id as string;
  try {
    const documents: {path:string;data:any;updateTime:string|null}[] = [];
    let totalBytes = 0;
    const collections: Record<string,number> = {};
    async function scan(collection: any): Promise<void> {
      const refs = await collection.listDocuments();
      collections[collection.path] = 0;
      for (const ref of refs) {
        const snap = await ref.get();
        if (snap.exists) {
          const data = encodeBackupValue(snap.data());
          totalBytes += Buffer.byteLength(JSON.stringify(data));
          if (documents.length >= 100000 || totalBytes > 80 * 1024 * 1024) throw new Error("backup_size_limit");
          documents.push({path:ref.path,data,updateTime:snap.updateTime?.toDate().toISOString() || null});
          collections[collection.path]++;
        }
        for (const nested of await ref.listCollections()) await scan(nested);
      }
    }
    for (const collection of await db.listCollections()) await scan(collection);
    const keys = ["AUTH_SECRET","CREDENTIAL_ENCRYPTION_KEY","ADMIN_EMAIL","ADMIN_EMAILS","TRIAL_DAYS","FIREBASE_SERVICE_ACCOUNT","FIREBASE_SERVICE_ACCOUNT_BASE64","NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_META_APP_ID","NEXT_PUBLIC_META_CONFIG_ID","META_APP_SECRET","WHATSAPP_WEBHOOK_TOKEN","FACEBOOK_LEAD_WEBHOOK_TOKEN","WHATSAPP_API_VERSION","NEXT_PUBLIC_META_GRAPH_VERSION","RESEND_API_KEY","EMAIL_FROM","RAZORPAY_KEY_ID","RAZORPAY_KEY_SECRET","RAZORPAY_WEBHOOK_SECRET","NEXT_PUBLIC_RAZORPAY_KEY_ID"];
    for (const key of Object.keys(process.env)) if (/^(NEXT_PUBLIC_|META_|WHATSAPP_|CAMPAIGN_)/.test(key)) keys.push(key);
    const environment = Object.fromEntries([...new Set(keys)].filter(key=>process.env[key] !== undefined).map(key=>[key,process.env[key]]));
    const metadata: Record<string,unknown> = {};
    const app = getApps()[0];
    try {
      const token = (await app.options.credential!.getAccessToken()).access_token;
      for (const [name,url] of Object.entries({indexes:`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`,firestoreRulesRelease:`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`})) {
        const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
        metadata[name]={status:response.status,data:response.ok?await response.json():null};
      }
      const release=(metadata.firestoreRulesRelease as any)?.data;
      if(release?.rulesetName){const r=await fetch(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});metadata.firestoreRules={status:r.status,data:r.ok?await r.json():null};}
    } catch { metadata.configurationExport="unavailable"; }
    const storage: {status:string;bucket?:string;files:any[];error?:string}={status:"not_configured",files:[]};
    const bucketName=process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if(bucketName){
      storage.bucket=bucketName;
      try {
        const bucket=getStorage(app).bucket(bucketName); const [files]=await bucket.getFiles();
        for(const file of files){const [meta]=await file.getMetadata();if(Number(meta.size||0)>20*1024*1024 || totalBytes+Number(meta.size||0)>80*1024*1024)throw Error("storage_size_limit");const [bytes]=await file.download();totalBytes+=bytes.length;storage.files.push({name:file.name,contentType:meta.contentType||null,cacheControl:meta.cacheControl||null,metadata:meta.metadata||{},data:bytes.toString("base64")});}
        storage.status="complete";
      } catch(e:any){storage.status="incomplete";storage.error=String(e?.code||e?.message||"storage_unavailable").slice(0,80);}
    }
    const payload={format:"campaignsetu-runtime-v1",startedAt,completedAt:new Date().toISOString(),consistency:"Logical export; each document read individually. Not a transactional point-in-time snapshot.",projectId:projectId,codeCommit:process.env.VERCEL_GIT_COMMIT_SHA||null,documentCount:documents.length,collections,documents,environment,metadata,storage};
    const encrypted=encryptBackup(payload,process.env.BACKUP_EXPORT_PUBLIC_KEY!);
    const encryptedJson=JSON.stringify(encrypted);
    if(Buffer.byteLength(encryptedJson)>4*1024*1024)throw new Error("backup_response_too_large");
    return new NextResponse(encryptedJson,{headers:{"Content-Type":"application/json","Content-Disposition":`attachment; filename="campaignsetu-runtime-${Date.now()}.encrypted.json"`,"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
  }catch{return NextResponse.json({error:"backup_export_failed_no_partial_database_returned"},{status:500});}
}

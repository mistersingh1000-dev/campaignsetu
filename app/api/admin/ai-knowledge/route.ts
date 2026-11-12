import { NextResponse } from "next/server";
import { getDb, normEmail } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 503 });
  const ownerId = normEmail(admin.sub);
  const [answersSnap, pendingSnap] = await Promise.all([
    db.collection("approved_knowledge").where("ownerId", "==", ownerId).get(),
    db.collection("ai_question_approvals").where("ownerId", "==", ownerId).get(),
  ]);
  const answers = answersSnap.docs.map(d => ({ id:d.id, ...d.data() as any })).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const pending = pendingSnap.docs.map(d => ({ id:d.id, ...d.data() as any })).filter(x=>x.status==="pending").sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json({ answers, pending });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "no_db" }, { status: 503 });
  const ownerId = normEmail(admin.sub);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const now = new Date().toISOString();

  if (action === "save_answer") {
    const question = String(body.question || "").trim().slice(0,500);
    const answer = String(body.answer || "").trim().slice(0,3000);
    const keywords = Array.isArray(body.keywords) ? body.keywords.map((v:any)=>String(v).trim().toLowerCase().slice(0,80)).filter(Boolean).slice(0,20) : [];
    if (!question || !answer || !keywords.length) return NextResponse.json({ error:"question_answer_keywords_required" },{status:400});
    const ref = await db.collection("approved_knowledge").add({ ownerId, question, answer, keywords, active:true, source:"admin-approved", createdAt:now, updatedAt:now });
    return NextResponse.json({ ok:true, id:ref.id });
  }

  if (action === "approve_question") {
    const id = String(body.id || "").slice(0,120);
    const answer = String(body.answer || "").trim().slice(0,3000);
    const keywords = Array.isArray(body.keywords) ? body.keywords.map((v:any)=>String(v).trim().toLowerCase().slice(0,80)).filter(Boolean).slice(0,20) : [];
    if (!id || !answer || !keywords.length) return NextResponse.json({ error:"answer_and_keywords_required" },{status:400});
    const ref = db.collection("ai_question_approvals").doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.ownerId !== ownerId || snap.data()?.status !== "pending") return NextResponse.json({ error:"not_found" },{status:404});
    const question = String(snap.data()?.question || "").slice(0,500);
    const knowledgeRef = await db.collection("approved_knowledge").add({ ownerId, question, answer, keywords, active:true, source:"approved-customer-question", createdAt:now, updatedAt:now });
    await ref.update({ status:"approved", approvedAnswer:answer, approvedKnowledgeId:knowledgeRef.id, reviewedAt:now, reviewedBy:ownerId });
    return NextResponse.json({ ok:true, knowledgeId:knowledgeRef.id });
  }

  if (action === "dismiss_question") {
    const id = String(body.id || "").slice(0,120);
    const ref = db.collection("ai_question_approvals").doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.ownerId !== ownerId || snap.data()?.status !== "pending") return NextResponse.json({ error:"not_found" },{status:404});
    await ref.update({ status:"dismissed", reviewedAt:now, reviewedBy:ownerId });
    return NextResponse.json({ ok:true });
  }

  if (action === "toggle_answer") {
    const id = String(body.id || "").slice(0,120);
    const active = body.active === true;
    const ref = db.collection("approved_knowledge").doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.ownerId !== ownerId) return NextResponse.json({ error:"not_found" },{status:404});
    await ref.update({ active, updatedAt:now });
    return NextResponse.json({ ok:true });
  }

  return NextResponse.json({ error:"unknown_action" },{status:400});
}

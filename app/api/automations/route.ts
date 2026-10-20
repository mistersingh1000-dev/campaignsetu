import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { findUser, getDb } from "@/lib/db";
import { accessState, paidFeatureError } from "@/lib/entitlements";
import {
  createAutomationRule,
  deleteAutomationRuleForUser,
  listAutomationRules,
  listEnabledAutomationRules,
  updateAutomationRuleForUser,
} from "@/lib/automation-db";
import { matchAutomationRule } from "@/lib/automation-engine";

export const runtime = "nodejs";

async function context(requireActive = false) {
  const jar = await cookies();
  const session = await verifySession(jar.get(COOKIE_NAME)?.value);
  if (!session) return { error: NextResponse.json({ error: "not_authenticated" }, { status: 401 }) };
  const db = getDb();
  if (!db) return { error: NextResponse.json({ error: "database_not_configured" }, { status: 503 }) };
  const user = await findUser(db, session.sub);
  if (!user) return { error: NextResponse.json({ error: "user_not_found" }, { status: 404 }) };
  const access = accessState(user);
  if (requireActive && !access.active) {
    const denied = paidFeatureError(access);
    return { error: NextResponse.json({ error: denied.error, message: denied.message }, { status: denied.status }) };
  }
  return { session, db, user, access };
}

function cleanPriority(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(0, Math.min(1000, Math.round(parsed)));
}

function cleanKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((v) => String(v).trim().slice(0, 80)).filter(Boolean))
  ).slice(0, 30);
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((v) => String(v).trim().slice(0, 40)).filter(Boolean))
  ).slice(0, 10);
}

export async function GET() {
  const ctx = await context(false);
  if (ctx.error) return ctx.error;
  try {
    return NextResponse.json({
      rules: await listAutomationRules(ctx.db!, ctx.session!.sub),
      readOnly: ctx.access!.readOnly,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx = await context(true);
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name || "").trim().slice(0, 120);
  const triggerType = body.triggerType === "fallback" ? "fallback" : "keyword";
  const matchMode = body.matchMode === "exact" ? "exact" : "contains";
  const keywords = cleanKeywords(body.keywords);
  const replyText = String(body.replyText || "").trim().slice(0, 4096);
  const addTags = cleanTags(body.addTags);
  const priority = cleanPriority(body.priority);

  if (!name || !replyText || (triggerType === "keyword" && !keywords.length)) {
    return NextResponse.json(
      {
        error: "missing_fields",
        message: triggerType === "fallback"
          ? "Rule name and reply text are required."
          : "Rule name, at least one keyword and reply text are required.",
      },
      { status: 400 }
    );
  }

  if (triggerType === "fallback") {
    const existing = await listAutomationRules(ctx.db!, ctx.session!.sub);
    if (existing.some((rule) => rule.triggerType === "fallback")) {
      return NextResponse.json(
        { error: "fallback_exists", message: "Only one default fallback rule is allowed. Edit the existing fallback rule instead." },
        { status: 409 }
      );
    }
  }

  try {
    const rule = await createAutomationRule(ctx.db!, {
      userId: ctx.session!.sub,
      name,
      enabled: body.enabled !== false,
      triggerType,
      keywords: triggerType === "fallback" ? [] : keywords,
      matchMode,
      priority,
      actionType: "reply_text",
      replyText,
      templateName: null,
      templateLanguage: null,
      addTags,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const ctx = await context(true);
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const ruleId = String(body.ruleId || "");
  if (!ruleId) return NextResponse.json({ error: "rule_id_required" }, { status: 400 });

  const updates: Record<string, any> = {};
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (typeof body.name === "string") updates.name = body.name.trim().slice(0, 120);
  if (typeof body.replyText === "string") updates.replyText = body.replyText.trim().slice(0, 4096);
  if (body.matchMode === "exact" || body.matchMode === "contains") updates.matchMode = body.matchMode;
  if (body.triggerType === "keyword" || body.triggerType === "fallback") updates.triggerType = body.triggerType;
  if (body.priority !== undefined) updates.priority = cleanPriority(body.priority);
  if (Array.isArray(body.keywords)) updates.keywords = cleanKeywords(body.keywords);
  if (Array.isArray(body.addTags)) updates.addTags = cleanTags(body.addTags);

  if (updates.triggerType === "fallback") updates.keywords = [];
  if (!Object.keys(updates).length) return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  try {
    if (updates.triggerType === "fallback") {
      const all = await listAutomationRules(ctx.db!, ctx.session!.sub);
      if (all.some((r) => r.triggerType === "fallback" && r.id !== ruleId)) {
        return NextResponse.json({ error: "fallback_exists", message: "Only one default fallback rule is allowed." }, { status: 409 });
      }
    }
    const rule = await updateAutomationRuleForUser(ctx.db!, ctx.session!.sub, ruleId, updates);
    if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const ctx = await context(true);
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const ruleId = String(body.ruleId || "");
  if (!ruleId) return NextResponse.json({ error: "rule_id_required" }, { status: 400 });
  const deleted = await deleteAutomationRuleForUser(ctx.db!, ctx.session!.sub, ruleId);
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Dry-run tester. It never sends a WhatsApp message.
export async function PUT(req: Request) {
  const ctx = await context(false);
  if (ctx.error) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim().slice(0, 4096);
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 });
  const rules = await listEnabledAutomationRules(ctx.db!, ctx.session!.sub);
  const rule = matchAutomationRule(rules, text);
  return NextResponse.json({
    matched: Boolean(rule),
    rule: rule
      ? {
          id: rule.id,
          name: rule.name,
          triggerType: rule.triggerType,
          priority: rule.priority,
          replyText: rule.replyText,
          addTags: rule.addTags,
        }
      : null,
  });
}

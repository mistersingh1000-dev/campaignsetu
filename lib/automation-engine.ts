import type { Firestore } from "firebase-admin/firestore";
import type { AppUser } from "@/lib/db";
import type { Contact } from "@/lib/chat-db";
import { addMessage, updateContactForUser } from "@/lib/chat-db";
import { accessState } from "@/lib/entitlements";
import { whatsappApiToken } from "@/lib/whatsapp-auth";
import {
  listEnabledAutomationRules,
  markAutomationRun,
  type AutomationRule,
} from "@/lib/automation-db";

function keywordMatches(rule: AutomationRule, text: string): boolean {
  if (rule.triggerType !== "keyword") return false;
  const input = text.trim().toLowerCase();
  return rule.keywords.some((keyword) => {
    const k = keyword.trim().toLowerCase();
    if (!k) return false;
    return rule.matchMode === "exact" ? input === k : input.includes(k);
  });
}

export function matchAutomationRule(
  rules: AutomationRule[],
  text: string
): AutomationRule | null {
  // Rules arrive priority-sorted from the database. Highest-priority keyword
  // match wins. A fallback rule only runs when no keyword rule matched.
  const keyword = rules.find((rule) => keywordMatches(rule, text));
  if (keyword) return keyword;
  return rules.find((rule) => rule.triggerType === "fallback") || null;
}

function personalize(text: string, contact: Contact): string {
  return String(text)
    .replace(/\{\{name\}\}/gi, contact.name || "there")
    .replace(/\{\{phone\}\}/gi, contact.phone);
}

async function sendRuleReply(args: {
  owner: AppUser;
  contact: Contact;
  rule: AutomationRule;
}) {
  const token = whatsappApiToken(args.owner);
  if (!token || !args.owner.phone_number_id || args.owner.wa_registered === false) {
    throw new Error("whatsapp_not_ready");
  }
  const version = process.env.WHATSAPP_API_VERSION || "v26.0";
  const to = args.contact.phone.replace(/\D/g, "");

  let payload: any;
  let storedText = "";
  if (args.rule.actionType === "reply_template") {
    if (!args.rule.templateName) throw new Error("template_missing");
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: args.rule.templateName,
        language: { code: args.rule.templateLanguage || "en_US" },
      },
    };
    storedText = `[Template: ${args.rule.templateName}]`;
  } else {
    const text = personalize(args.rule.replyText || "", args.contact).trim();
    if (!text) throw new Error("reply_text_missing");
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    };
    storedText = text;
  }

  const res = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(args.owner.phone_number_id)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Meta rejected the automated reply.");
  }
  return { waMessageId: data?.messages?.[0]?.id || null, storedText };
}

export async function runInboundAutomations(args: {
  db: Firestore;
  owner: AppUser;
  contact: Contact;
  conversationId: string;
  inboundText: string;
}) {
  if (!accessState(args.owner).active) return { matched: 0, sent: 0, blocked: "access_expired" };
  if (args.contact.doNotMessage === true) return { matched: 0, sent: 0, blocked: "do_not_message" };

  const rules = await listEnabledAutomationRules(args.db, args.owner.email);
  const rule = matchAutomationRule(rules, args.inboundText);
  if (!rule) return { matched: 0, sent: 0 };

  if (rule.addTags.length) {
    const tags = Array.from(new Set([...(args.contact.tags || []), ...rule.addTags])).slice(0, 25);
    await updateContactForUser(args.db, args.owner.email, args.contact.id, { tags });
  }

  const reply = await sendRuleReply({ owner: args.owner, contact: args.contact, rule });
  await addMessage(
    args.db,
    args.owner.email,
    args.conversationId,
    "user",
    reply.storedText,
    reply.waMessageId
  );
  await markAutomationRun(args.db, rule);

  return { matched: 1, sent: 1, ruleId: rule.id, triggerType: rule.triggerType };
}

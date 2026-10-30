export type CrmTier = "basic" | "advance" | "pro";
export type CrmCycle = "monthly" | "yearly";
export const CRM_TRIAL_DAYS = 7;
export const crmPlans = [
  { id:"basic" as const, name:"Basic", monthly:199, yearly:1999, leads:500, fields:3, templates:3, pages:1, description:"For solo businesses starting a clear sales pipeline." },
  { id:"advance" as const, name:"Advance", monthly:499, yearly:3999, leads:5000, fields:10, templates:15, pages:3, description:"For growing businesses handling more enquiries." },
  { id:"pro" as const, name:"Pro", monthly:999, yearly:7999, leads:25000, fields:30, templates:50, pages:10, description:"For established businesses managing larger lead volumes." },
];
export const crmOffers = crmPlans.flatMap(p => (["monthly","yearly"] as const).map(cycle => ({
  id:`crm_${p.id}_${cycle}`, tier:p.id, cycle, name:`CRM ${p.name} · ${cycle === "yearly" ? "Yearly" : "Monthly"}`,
  price:p[cycle], months:cycle === "yearly" ? 12 : 1, per:cycle === "yearly" ? "/year" : "/month",
  features:[`${p.leads.toLocaleString("en-IN")} stored leads`,`${p.fields} custom fields`,`${p.templates} email draft templates`,`${p.pages} Facebook Page connections`],cta:"Choose CRM plan",
})));
export function crmOffer(id:string) { return crmOffers.find(p => p.id === id); }
export type CrmAccount = {plan?:string;trial_ends_at?:string;created_at?:string;crm_tier?:string;crm_status?:string;crm_ends_at?:string;crm_trial_ends_at?:string};
export function crmAccess(user: CrmAccount, now=Date.now()) {
  const legacy = !user.crm_status && !user.crm_tier;
  const legacyFull = legacy && (user.plan === "free" || user.plan === "paid");
  const trial = user.crm_status === "trial" || (legacy && user.plan === "trial");
  const tier:CrmTier = (trial || legacyFull) ? "pro" : crmPlans.some(p=>p.id===user.crm_tier) ? user.crm_tier as CrmTier : "basic";
  const end = trial ? user.crm_trial_ends_at || user.trial_ends_at : legacyFull ? user.trial_ends_at : user.crm_ends_at;
  const expiry=Date.parse(end || ""), active = user.plan !== "suspended" && user.crm_status !== "suspended" && ((legacy && user.plan === "free") || ((trial || legacyFull || user.crm_status === "active") && Number.isFinite(expiry) && expiry > now));
  return { active, tier, trial, endsAt:end || null, daysLeft:Math.max(0,Math.ceil((expiry-now)/86400000))||0, limits:crmPlans.find(p=>p.id===tier)!, legacy:legacyFull };
}
export class CrmPlanError extends Error { constructor(public code:string, message:string){super(message);this.name="CrmPlanError";} }
export function requireCrmAccess(user:CrmAccount) { const access=crmAccess(user);if(!access.active)throw new CrmPlanError("crm_access_expired","Your CRM trial or subscription has ended. Choose a CRM plan to continue. Saved data remains available to view/export.");return access; }
export function assertCrmCount(user:CrmAccount, resource:"leads"|"fields"|"templates"|"pages", count:number) {
 const access=requireCrmAccess(user);if(count>=access.limits[resource])throw new CrmPlanError("crm_limit_reached",`${access.limits.name} allows ${access.limits[resource]} ${resource}. Upgrade your CRM plan to add more.`);return access;
}
export function addCalendarMonths(date:Date, months:number) {
 const d=new Date(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d;
}
export function crmPurchaseAllowed(user:CrmAccount, planId:string) {
 const offer=crmOffer(planId);if(!offer)return;
 const access=crmAccess(user);
 if(user.plan==="suspended"||user.crm_status==="suspended")throw new CrmPlanError("account_suspended","Contact support before purchasing for a suspended account.");
 if(access.active && !access.trial && !access.legacy && access.tier!==offer.tier)throw new CrmPlanError("plan_change_support","For a tier change during an active paid term, raise a support ticket first. Same-tier renewals are available here.");
}
export function crmActivation(user:CrmAccount,planId:string,now=new Date()) {
 const offer=crmOffer(planId);if(!offer)throw Error("invalid_crm_plan");
 crmPurchaseAllowed(user,planId);
 const current=Date.parse(user.crm_ends_at || ""),base=user.crm_tier===offer.tier&&user.crm_status==="active"&&current>now.getTime()?new Date(current):now;
 return {crm_tier:offer.tier,crm_status:"active",crm_cycle:offer.cycle,crm_ends_at:addCalendarMonths(base,offer.months).toISOString()};
}

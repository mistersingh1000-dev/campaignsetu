const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
test("new CampaignSetu domain and product identity are reflected in code and integration docs",()=>{
 const site=read("lib/site.ts");
 const guide=read("docs/facebook-customer-onboarding.md");
 const branded=read("lib/email.ts")+"\n"+read("app/api/auth/forgot-password/route.ts");
 assert.match(site,/https:\/\/lasmediaagency\.online/);
 assert.match(guide,/https:\/\/lasmediaagency\.online\/api\/crm\/facebook\/callback/);
 assert.match(guide,/https:\/\/lasmediaagency\.online\/api\/webhooks\/facebook-leads/);
 assert.doesNotMatch(guide,/https:\/\/campaignsetu\.vercel\.app\/api\//);
 assert.match(branded,/CampaignSetu/);
 assert.doesNotMatch(branded,/WhatsApp Connect Pro/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("lib/lead-qualification.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function("exports", "require", "module", compiled)(mod.exports, require, mod);
const { assessLeadForm } = mod.exports;

test("lead triage distinguishes purchase, callback, pricing and opt-out intent", () => {
  const hot = assessLeadForm({ service: "I want to buy today", budget: "₹50000", timing: "urgent" }, "Asha");
  assert.equal(hot.priority, "Hot");
  assert.equal(hot.intent, "purchase");
  assert.match(hot.nextAction, /Call to confirm/);
  assert.match(hot.replyDraft, /Asha/);

  const warm = assessLeadForm({ request: "Please call me for pricing" });
  assert.equal(warm.priority, "Warm");
  assert.equal(warm.intent, "callback");

  const cold = assessLeadForm({ interest: "Just looking for information" });
  assert.equal(cold.priority, "Cold");
  assert.equal(cold.intent, "information");

  const optedOut = assessLeadForm({ request: "Stop, not interested" });
  assert.equal(optedOut.priority, "Cold");
  assert.equal(optedOut.intent, "opt_out");
  assert.equal(optedOut.replyDraft, "");
  assert.match(optedOut.nextAction, /do not contact/i);
});

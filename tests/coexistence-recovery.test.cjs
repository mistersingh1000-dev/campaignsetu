const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(source, dependencies = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => name in dependencies ? dependencies[name] : require(name);
  new Function("exports", "require", "module", compiled)(module.exports, localRequire, module);
  return module.exports;
}
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const crypto = loadModule(read("lib/credential-crypto.ts"));
const pending = loadModule(read("lib/coexistence-pending.ts"), { "./credential-crypto": crypto });
const fullRoute = read("app/api/embedded-signup/exchange/route.ts");
const start = fullRoute.indexOf("  const input = await req.json()");
const end = fullRoute.indexOf("  let phoneDetails: any = null;", start);
if (start < 0 || end < 0) throw new Error("Coexistence route section not found");
const fragment = fullRoute.slice(start, end);
const wrapped = "export async function run(req:any, db:any, session:any, fetch:any, NextResponse:any, hasPendingCoexistence:any, stageCoexistence:any, claimCoexistence:any, releaseCoexistence:any, finishCoexistence:any, providerModeEnabled:any) {" + fragment + "; return null; }";
const route = loadModule(wrapped);

class FakeDB {
  constructor() { this.map = new Map(); this.queue = Promise.resolve(); }
  collection(name) {
    const db = this;
    return {
      doc(id) { const key = name + "/" + id; return { key, async get() { const value = db.map.get(key); return { exists: value !== undefined, data: () => value }; } }; },
      where(field, _op, value) { return { limit() { return { async get() {
        return { docs: [...db.map].filter(([k, v]) => k.startsWith(name + "/") && v[field] === value).slice(0, 2).map(([k]) => ({ id: k.slice(name.length + 1) })) };
      } }; } }; },
    };
  }
  runTransaction(callback) {
    const task = this.queue.then(async () => {
      const writes = [];
      const tx = {
        get: (r) => r.get(),
        create: (r, v) => writes.push(() => { if (this.map.has(r.key)) throw Error("exists"); this.map.set(r.key, v); }),
        set: (r, v, opts) => writes.push(() => this.map.set(r.key, opts?.merge ? { ...this.map.get(r.key), ...v } : v)),
        update: (r, v) => writes.push(() => this.map.set(r.key, { ...this.map.get(r.key), ...v })),
        delete: (r) => writes.push(() => this.map.delete(r.key)),
      };
      const result = await callback(tx);
      writes.forEach((write) => write());
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
process.env.AUTH_SECRET = "test-only-key";
process.env.NEXT_PUBLIC_META_APP_ID = "test-app";
process.env.META_APP_SECRET = "test-secret";
const response = { json: (body, init) => ({ body, status: init?.status || 200 }) };
function execute(payload, db, mockFetch, provider = false) {
  return route.run({ json: async () => payload }, db, { sub: "owner@example.com" }, mockFetch, response,
    pending.hasPendingCoexistence, pending.stageCoexistence, pending.claimCoexistence,
    pending.releaseCoexistence, pending.finishCoexistence, () => provider);
}
function makeDB() { const db = new FakeDB(); db.map.set("users/owner@example.com", { email: "owner@example.com", phone_number_id: null }); return db; }

test("pending credentials are encrypted and cannot be overwritten", async () => {
  const db = makeDB();
  assert.equal(await pending.stageCoexistence(db, "owner@example.com", "123", null, "private-token"), true);
  const stored = db.map.get("wa_coexistence_pending/" + pending.pendingId("owner@example.com"));
  assert.ok(!JSON.stringify(stored).includes("private-token"));
  assert.equal(await pending.stageCoexistence(db, "owner@example.com", "999", null, "another"), false);
  const lease = await pending.claimCoexistence(db, "owner@example.com");
  assert.equal(lease.token, "private-token");
  assert.equal(await pending.claimCoexistence(db, "owner@example.com"), null);
  await pending.releaseCoexistence(db, "owner@example.com", "wrong-lease");
  assert.equal(await pending.claimCoexistence(db, "owner@example.com"), null);
  await pending.releaseCoexistence(db, "owner@example.com", lease.leaseId);
  assert.ok(await pending.claimCoexistence(db, "owner@example.com"));
});

test("connection failure can resume without a second OAuth or phone registration", async () => {
  const db = makeDB();
  const firstFetch = async (url) => url.includes("/oauth/") ? { ok: true, json: async () => ({ access_token: "private-token" }) } : { ok: false, json: async () => ({}) };
  let result = await execute({ code: "one-time", waba_id: "123", coexistence: true }, db, firstFetch);
  assert.equal(result.status, 502);
  assert.equal(result.body.pending, true);
  assert.equal(await pending.hasPendingCoexistence(db, "owner@example.com"), true);
  const calls = [];
  const retryFetch = async (url, opts) => {
    calls.push({ url, method: opts?.method || "GET" });
    return url.includes("/phone_numbers") ? { ok: true, json: async () => ({ data: [{ id: "456", is_on_biz_app: true, platform_type: "CLOUD_API" }] }) } : { ok: true, json: async () => ({ success: true }) };
  };
  result = await execute({ resume: true }, db, retryFetch);
  assert.equal(result.body.registered, true);
  assert.equal(await pending.hasPendingCoexistence(db, "owner@example.com"), false);
  assert.equal(db.map.get("users/owner@example.com").phone_number_id, "456");
  assert.ok(calls.every((c) => !c.url.includes("/register") && !c.url.includes("/oauth/")));
});

test("number conflicts and provider mode do not overwrite an account", async () => {
  const db = makeDB();
  db.map.set("users/other@example.com", { phone_number_id: "456" });
  await pending.stageCoexistence(db, "owner@example.com", "123", null, "private-token");
  const lease = await pending.claimCoexistence(db, "owner@example.com");
  assert.equal(await pending.finishCoexistence(db, "owner@example.com", lease.leaseId, "456"), "conflict");
  await pending.releaseCoexistence(db, "owner@example.com", lease.leaseId);
  const result = await execute({ resume: true }, db, async () => { throw new Error("unexpected request"); }, true);
  assert.equal(result.status, 503);
  assert.equal(result.body.pending, true);
  assert.equal(db.map.get("users/owner@example.com").phone_number_id, null);
});

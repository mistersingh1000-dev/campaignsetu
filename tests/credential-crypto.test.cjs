const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};new Function('exports','require','module',ts.transpileModule(fs.readFileSync('lib/credential-crypto.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod.exports,require,mod);const c=mod.exports;
test('legacy AUTH ciphertext survives adding a dedicated key; v2 requires its own key',()=>{
 process.env.AUTH_SECRET='old-auth-key';delete process.env.CREDENTIAL_ENCRYPTION_KEY;
 const legacy=c.encryptCredential('legacy-value');assert.ok(legacy.startsWith('enc:v1:'));
 process.env.CREDENTIAL_ENCRYPTION_KEY='new-dedicated-key';assert.equal(c.decryptCredential(legacy),'legacy-value');
 const next=c.encryptCredential('new-value');assert.ok(next.startsWith('enc:v2:'));assert.equal(c.decryptCredential(next),'new-value');
 process.env.CREDENTIAL_ENCRYPTION_KEY='wrong-key';assert.throws(()=>c.decryptCredential(next));assert.equal(c.decryptCredential(legacy),'legacy-value');
 delete process.env.CREDENTIAL_ENCRYPTION_KEY;assert.equal(c.decryptCredential('pre-encryption-value'),'pre-encryption-value');
});

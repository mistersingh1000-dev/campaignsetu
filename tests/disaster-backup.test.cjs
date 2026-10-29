const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const crypto=require('node:crypto'),zlib=require('node:zlib');
const {Timestamp,GeoPoint}=require('firebase-admin/firestore');
const source=fs.readFileSync('lib/disaster-backup.ts','utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};new Function('exports','require','module',compiled)(m.exports,require,m);const {encryptBackup,encodeBackupValue}=m.exports;
test('backup preserves Firestore types, nested values and special numbers',()=>{
 const encoded=encodeBackupValue({time:new Timestamp(123,456),point:new GeoPoint(30,75),bytes:Buffer.from('hello'),values:[null,true,'text',NaN,Infinity]});
 assert.deepEqual(encoded.value.time,{kind:'timestamp',seconds:123,nanoseconds:456});assert.equal(encoded.value.point.kind,'geopoint');assert.equal(encoded.value.bytes.value,Buffer.from('hello').toString('base64'));assert.equal(encoded.value.values.value[3].value,'NaN');
});
test('encrypted backup decrypts only with the private key and detects tampering',()=>{
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:3072});const payload={documents:[{data:'private-token'}]};
 const envelope=encryptBackup(payload,publicKey.export({type:'spki',format:'pem'}));assert.ok(!JSON.stringify(envelope).includes('private-token'));
 const key=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.encryptedKey,'base64'));
 const decrypt=body=>{const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));d.setAAD(Buffer.from('campaignsetu-backup-v1'));d.setAuthTag(Buffer.from(envelope.tag,'base64'));return Buffer.concat([d.update(body),d.final()]);};
 const bytes=decrypt(Buffer.from(envelope.ciphertext,'base64'));assert.deepEqual(JSON.parse(zlib.gunzipSync(bytes)),payload);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),envelope.plaintextSha256);
 const corrupt=Buffer.from(envelope.ciphertext,'base64');corrupt[0]^=1;assert.throws(()=>decrypt(corrupt));
});
test('export denies non-admin, disabled and cross-origin requests before reading data',async()=>{
 let admin=null;const routeCode=ts.transpileModule(fs.readFileSync('app/api/admin/disaster-backup/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const deps={'next/server':{NextResponse:{json:(body,init)=>({body,status:init.status})}},'@/lib/admin-auth':{getAdminSession:async()=>admin},'@/lib/db':{getDb:()=>{throw Error('Database must not be accessed');}},'@/lib/disaster-backup':m.exports,'firebase-admin/app':{},'firebase-admin/storage':{}};
 const route={exports:{}};new Function('exports','require','module',routeCode)(route.exports,n=>deps[n]||require(n),route);
 const before={...process.env};const req={url:'https://example.com/api/admin/disaster-backup',headers:{get:()=> 'https://other.example'}};
 try{delete process.env.BACKUP_EXPORT_ENABLED;assert.equal((await route.exports.POST(req)).status,403);admin={sub:'admin@example.com'};assert.equal((await route.exports.POST(req)).status,503);process.env.BACKUP_EXPORT_ENABLED='true';process.env.BACKUP_EXPORT_PUBLIC_KEY='public';process.env.NEXT_PUBLIC_SITE_URL='https://example.com';assert.equal((await route.exports.POST(req)).status,403);}finally{for(const key of ['BACKUP_EXPORT_ENABLED','BACKUP_EXPORT_PUBLIC_KEY','NEXT_PUBLIC_SITE_URL']){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}}
});

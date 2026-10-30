const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
function load(path,deps={}){const compiled=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const m={exports:{}};new Function('exports','require','module',compiled)(m.exports,n=>n in deps?deps[n]:require(n),m);return m.exports;}
const credential=load('lib/credential-crypto.ts');
const api=load('lib/facebook-lead-onboarding.ts',{'./credential-crypto':credential,'./crm-plans':load('lib/crm-plans.ts')});
const DB=require('./test-helpers.cjs').DB;
process.env.AUTH_SECRET='tests-only-encryption-key';process.env.NEXT_PUBLIC_META_APP_ID='app';process.env.META_APP_SECRET='secret';process.env.NEXT_PUBLIC_SITE_URL='https://example.com';process.env.FACEBOOK_LEAD_LOGIN_CONFIG_ID='configuration';
test('OAuth state is random, user-bound, cookie-bound and single use',async()=>{
 const db=new DB(),login=await api.beginFacebookLeadLogin(db,'owner@example.com');const url=new URL(login.url);
 assert.equal(url.hostname,'www.facebook.com');assert.equal(url.searchParams.get('config_id'),'configuration');assert.equal(url.searchParams.get('redirect_uri'),'https://example.com/api/crm/facebook/callback');assert.ok(!login.url.includes('owner%40'));
 assert.equal(await api.consumeFacebookLeadState(db,'other@example.com',login.state,login.state),false);
 assert.equal(await api.consumeFacebookLeadState(db,'owner@example.com',login.state,'0'.repeat(64)),false);
 const consumed=await Promise.all([api.consumeFacebookLeadState(db,'owner@example.com',login.state,login.state),api.consumeFacebookLeadState(db,'owner@example.com',login.state,login.state)]);assert.deepEqual(consumed,[true,false]);
 const expired=await api.beginFacebookLeadLogin(db,'owner@example.com');for(const [k,v] of db.map)if(k.endsWith(crypto.createHash('sha256').update(expired.state).digest('hex')))v.expiresAtMs=0;
 assert.equal(await api.consumeFacebookLeadState(db,'owner@example.com',expired.state,expired.state),false);
});
test('Page discovery encrypts tokens and never follows arbitrary paging URLs',async()=>{
 const calls=[];let page=0;
 const mock=async(url,options)=>{calls.push({url,options});if(url.endsWith('/oauth/access_token'))return {ok:true,json:async()=>({access_token:'private-user-token'})};if(url.endsWith('/me/permissions'))return {ok:true,json:async()=>({data:api.REQUIRED_LEAD_PERMISSIONS.map(permission=>({permission,status:'granted'}))})};page++;return {ok:true,json:async()=>page===1?{data:[{id:'123',name:'My Page',access_token:'private-page-token'}],paging:{next:'https://attacker.invalid/steal',cursors:{after:'next-cursor'}}}:{data:[{id:'456',name:'Second',access_token:'other-private-token'}]}};};
 const pages=await api.discoverFacebookPages('one-time-code',mock);assert.equal(pages.length,2);assert.ok(pages.every(p=>p.encryptedToken.startsWith('enc:')));assert.ok(!JSON.stringify(pages).includes('private-page-token'));assert.equal(credential.decryptCredential(pages[0].encryptedToken),'private-page-token');assert.ok(calls.every(c=>c.url.startsWith('https://graph.facebook.com/')));assert.equal(calls[0].options.method,'POST');assert.ok(!calls[0].url.includes('one-time-code'));assert.ok(calls[3].url.includes('after=next-cursor'));
});
test('missing permission blocks discovery before any Page tokens are requested',async()=>{
 let calls=0;await assert.rejects(()=>api.discoverFacebookPages('code',async url=>{calls++;return {ok:true,json:async()=>url.endsWith('access_token')?{access_token:'token'}:{data:[]}};}),/permissions_missing/);assert.equal(calls,2);
});
test('staged Pages expire, cannot be selected by another user, and foreign workspace claims are preserved',async()=>{
 const db=new DB();db.map.set('users/owner@example.com',{plan:'free'});const page={id:'123',name:'Page',encryptedToken:credential.encryptCredential('page-private-token')};await api.stageFacebookPages(db,'owner@example.com',[page]);assert.equal((await api.pendingFacebookPages(db,'owner@example.com')).length,1);assert.equal(await api.selectedFacebookPage(db,'other@example.com','123'),null);
 db.map.set('crm_facebook_pages/123',{userId:'other@example.com',token:'other-token'});let called=false;await assert.rejects(()=>api.connectFacebookPage(db,'owner@example.com',page,async()=>{called=true;throw Error();}),/page_workspace_conflict/);assert.equal(called,false);assert.equal(db.map.get('crm_facebook_pages/123').userId,'other@example.com');
 db.map.delete('crm_facebook_pages/123');let failed=await assert.rejects(()=>api.connectFacebookPage(db,'owner@example.com',page,async()=>({ok:false,json:async()=>({})})),/subscription_failed/);assert.equal(db.map.get('crm_facebook_pages/123').status,'subscription_failed');assert.equal(credential.decryptCredential(db.map.get('crm_facebook_pages/123').token),'page-private-token');
 const selected=await api.selectedFacebookPage(db,'owner@example.com','123');const result=await api.connectFacebookPage(db,'owner@example.com',selected,async()=>({ok:true,json:async()=>({success:true})}));assert.equal(result.status,'subscribed');assert.ok(!JSON.stringify(result).includes('token'));
 for(const [key,v] of db.map)if(key.startsWith('crm_facebook_onboarding/'))v.expiresAtMs=0;assert.equal((await api.pendingFacebookPages(db,'owner@example.com')).length,0);
});

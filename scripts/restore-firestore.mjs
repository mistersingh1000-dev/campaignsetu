// Restores into an EMPTY target database only. Never overwrites existing data.
import fs from 'node:fs';
import {initializeApp,cert,applicationDefault} from 'firebase-admin/app';
import {getFirestore,Timestamp,GeoPoint} from 'firebase-admin/firestore';
const args=process.argv.slice(2),input=args[0];
if(!input)throw Error('Usage: node scripts/restore-firestore.mjs runtime.json [--apply --confirm-project PROJECT_ID]');
const payload=JSON.parse(fs.readFileSync(input,'utf8'));
if(payload.format!=='campaignsetu-runtime-v1'||payload.documents.length!==payload.documentCount)throw Error('Invalid backup');
const credential=process.env.FIREBASE_SERVICE_ACCOUNT?cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)):applicationDefault();
const app=initializeApp({credential,projectId:process.env.GOOGLE_CLOUD_PROJECT||payload.projectId});
const db=getFirestore(app);
const targetProject=app.options.projectId;
function decode(v){
 switch(v.kind){
 case 'null':return null;
 case 'string':case 'boolean':return v.value;
 case 'number':return Number(v.value);
 case 'timestamp':return new Timestamp(v.seconds,v.nanoseconds);
 case 'geopoint':return new GeoPoint(v.latitude,v.longitude);
 case 'reference':return db.doc(v.path);
 case 'bytes':return Buffer.from(v.value,'base64');
 case 'array':return v.value.map(decode);
 case 'map':return Object.fromEntries(Object.entries(v.value).map(([k,x])=>[k,decode(x)]));
 default:throw Error('Unsupported backup value');
 }
}
const seen=new Set();
for(const d of payload.documents){if(typeof d.path!=='string'||d.path.split('/').length%2!==0||seen.has(d.path))throw Error('Invalid/duplicate document path');seen.add(d.path);decode(d.data);}
if(!args.includes('--apply')){console.log(JSON.stringify({dryRun:true,documents:seen.size,targetProject:targetProject,storageFiles:payload.storage?.files?.length||0}));process.exit(0);}
const confirm=args[args.indexOf('--confirm-project')+1];
if(!args.includes('--confirm-project')||confirm!==targetProject)throw Error('Explicit --confirm-project must match target project');
for(const c of await db.listCollections())if((await c.listDocuments()).length)throw Error('Target database is not empty; refusing to overwrite');
const writer=db.bulkWriter();let failures=0;writer.onWriteError(()=>{failures++;return false;});
const writes=payload.documents.map(d=>writer.create(db.doc(d.path),decode(d.data)));
const results=await Promise.allSettled(writes);await writer.close();
if(failures||results.some(r=>r.status==='rejected'))throw Error('Restore incomplete; inspect target before retrying');
let verified=0;
for(let i=0;i<payload.documents.length;i+=100){const docs=await db.getAll(...payload.documents.slice(i,i+100).map(d=>db.doc(d.path)));verified+=docs.filter(d=>d.exists).length;}
if(verified!==payload.documentCount)throw Error('Post-restore count check failed');
console.log(JSON.stringify({restored:verified,projectId:targetProject,note:'Review Firestore indexes/rules and restore storage files separately before launch.'}));

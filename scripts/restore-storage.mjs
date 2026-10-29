// Restore archived Firebase Storage objects without overwriting existing objects.
import fs from 'node:fs';
import {initializeApp,cert,applicationDefault} from 'firebase-admin/app';
import {getStorage} from 'firebase-admin/storage';
const args=process.argv.slice(2),file=args[0],target=args[args.indexOf('--bucket')+1];
if(!file||!args.includes('--bucket'))throw Error('Usage: node restore-storage.mjs runtime.json --bucket TARGET [--apply --confirm-bucket TARGET]');
const backup=JSON.parse(fs.readFileSync(file,'utf8'));
if(backup.format!=='campaignsetu-runtime-v1'||backup.storage?.status!=='complete')throw Error('A complete storage export is required');
const app=initializeApp({credential:process.env.FIREBASE_SERVICE_ACCOUNT?cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)):applicationDefault()});
const bucket=getStorage(app).bucket(target);
if(!args.includes('--apply')){console.log(JSON.stringify({dryRun:true,bucket:target,files:backup.storage.files.length}));process.exit(0);}
if(!args.includes('--confirm-bucket')||args[args.indexOf('--confirm-bucket')+1]!==target)throw Error('Explicit matching --confirm-bucket required');
for(const item of backup.storage.files)await bucket.file(item.name).save(Buffer.from(item.data,'base64'),{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:item.contentType||'application/octet-stream',...(item.cacheControl?{cacheControl:item.cacheControl}:{}),metadata:item.metadata||{}}});
console.log(JSON.stringify({restored:backup.storage.files.length,bucket:target}));

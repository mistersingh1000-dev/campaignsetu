#!/usr/bin/env python3
"""Decrypt a CampaignSetu runtime export. Requires: pip install cryptography."""
import argparse,base64,gzip,hashlib,json,os
from pathlib import Path
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
p=argparse.ArgumentParser();p.add_argument('encrypted');p.add_argument('private_key');p.add_argument('output');a=p.parse_args()
e=json.loads(Path(a.encrypted).read_text())
if e.get('format')!='campaignsetu-backup-v1':raise SystemExit('Unsupported backup format')
k=serialization.load_pem_private_key(Path(a.private_key).read_bytes(),password=None)
d=lambda s:base64.b64decode(s,validate=True)
key=k.decrypt(d(e['encryptedKey']),padding.OAEP(mgf=padding.MGF1(hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
compressed=AESGCM(key).decrypt(d(e['iv']),d(e['ciphertext'])+d(e['tag']),b'campaignsetu-backup-v1')
if hashlib.sha256(compressed).hexdigest()!=e['plaintextSha256']:raise SystemExit('Checksum mismatch')
raw=gzip.decompress(compressed);v=json.loads(raw)
if v.get('format')!='campaignsetu-runtime-v1':raise SystemExit('Invalid runtime payload')
paths=[x['path'] for x in v['documents']]
if len(paths)!=v['documentCount'] or len(paths)!=len(set(paths)):raise SystemExit('Document count/path verification failed')
out=Path(a.output)
if out.exists():raise SystemExit('Output already exists; choose a new private output file')
fd=os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'wb') as f:f.write(raw)
print(json.dumps({'verified':True,'documentCount':v['documentCount'],'projectId':v['projectId'],'storageStatus':v.get('storage',{}).get('status')}))

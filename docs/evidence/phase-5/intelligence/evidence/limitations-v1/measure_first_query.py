"""Single-process first-call probe; no cache eviction, tuning or SLA claim."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import struct
import subprocess
import sys
import time

parser=argparse.ArgumentParser()
parser.add_argument('--checkout',type=Path,required=True)
parser.add_argument('--model-dir',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
root=args.checkout.resolve()
sys.path.insert(0,str(root))
from services.m7_semantic.model import Encoder
from services.m7_semantic.evaluate import peak_rss_mib
dictionary=json.loads((root/'data/m7-phase2/raw/dictionary.json').read_text(encoding='utf-8'))
requests=[json.loads(x) for x in (root/'data/m7-phase2/derived/requests.jsonl').read_text(encoding='utf-8').splitlines()]
request=next(x for x in requests if x['requestId']=='calculator-search-exact')
encoder=Encoder(args.model_dir,dictionary)
started=time.perf_counter()
first=encoder.encode([request['queryText']],query=True)[0]
first_ms=(time.perf_counter()-started)*1000
warm=[]
digests=[]
def digest(v):
    return hashlib.sha256(struct.pack('<'+'f'*len(v),*v)).hexdigest()
for _ in range(5):
    started=time.perf_counter()
    vector=encoder.encode([request['queryText']],query=True)[0]
    warm.append((time.perf_counter()-started)*1000)
    digests.append(digest(vector))
result=dict(status='DIAGNOSTIC_SINGLE_PROCESS',sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
    workingTreeDirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()),
    environment=dict(python=platform.python_version(),os=platform.platform(),machine=platform.machine()),
    requestId=request['requestId'],queryCount=1,firstEncodeMs=first_ms,warmEncodeMs=warm,
    firstVectorSha256=digest(first),repeatedVectorsIdentical=all(x==digest(first) for x in digests),
    peakWorkingSetMiB=peak_rss_mib(),
    scope='first encode in a fresh Python process, includes lazy artifact hashing/imports/model loading; five warm encodes of same query; no document indexing, HTTP, queue or database',
    osCacheCold=False,concurrency=1,acceptance='AUTHOR_DIAGNOSTIC_ONLY; NOT SLA OR RELEASE CAPACITY EVIDENCE')
args.output.write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(status=result['status'],firstEncodeMs=first_ms,warmEncodeMs=warm,repeatedVectorsIdentical=result['repeatedVectorsIdentical'])))

"""Replay a pinned diagnostic against an explicit checkout; keep authorship honest."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

parser=argparse.ArgumentParser()
parser.add_argument('--checkout',type=Path,required=True)
parser.add_argument('--checker',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
if args.output.exists():
    parser.error('output file must not exist')
root=args.checkout.resolve()
content=args.checker.read_bytes().replace(b'\r\n',b'\n')
# The caller records/checks the real Git blob below; no unpinned downloaded code.
original=subprocess.check_output(['git','show','1cc5cbf7633017ea69560cc2f43e0e308658b1da:scripts/quality_phase4/probe_rpc_degradation.py'],cwd=root).replace(b'\r\n',b'\n')
if content!=original:
    raise SystemExit('checker differs from pinned original M10 source')
sys.path.insert(0,str(root))
sys.path.insert(0,str(root/'services/m7_baseline/tests'))
# Preload the selected checkout before the original module inserts its own root.
import services.m7_baseline.client
import services.m7_baseline.engine
import services.m8_baseline.client
import test_engine
spec=importlib.util.spec_from_file_location('original_m10_fault_probe',args.checker)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.ROOT=root
sys.argv=[str(args.checker),'--output',str(args.output)]
module.main()
report=json.loads(args.output.read_text(encoding='utf-8'))
record=dict(executedAt=datetime.now(timezone.utc).isoformat(),executionRole='M7_AUTHOR_REPLAY_NOT_M10_SIGNOFF',
    checkerSourceCommit='1cc5cbf7633017ea69560cc2f43e0e308658b1da',
    checkerNormalizedSha256=hashlib.sha256(content).hexdigest(),
    rootBinding='Pinned diagnostic source bytes unchanged; imports and ROOT bound to explicit selected checkout',
    targetCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
    targetWorkingTreeDirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip()),
    observations=report['observations'],formalAcceptance=False)
args.output.with_name('quality-probe-provenance.json').write_text(json.dumps(record,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(passed=sum(x['status']=='PASS' for x in report['observations']),total=len(report['observations']),executionRole=record['executionRole'])))

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

parser=argparse.ArgumentParser(description='Verify preparation evidence; never signs final acceptance.')
parser.add_argument('--checkout',type=Path,default=Path(__file__).resolve().parents[5])
parser.add_argument('--delivery-dir',type=Path,default=Path(__file__).resolve().parents[1])
parser.add_argument('--output',type=Path)
args=parser.parse_args()
if args.output and args.output.exists():parser.error('output must not exist')
R=args.checkout.resolve()
D=args.delivery_dir.resolve()
E=D/'evidence/joint-v1'
J=D/'joint-delivery'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
checks={}
manifest=read(J/'release-manifest.json')
commit=manifest['technicalSourceCommit']
checks['manifestGitBlobs']=all(hashlib.sha256(subprocess.check_output(['git','show',commit+':'+row['path']],cwd=R)).hexdigest()==row['gitBlobSha256'] for row in manifest['assets'])
checks['runtimeUnchangedSinceActualRun']=not subprocess.check_output(['git','diff',commit,'--name-only','--','services','scripts','backend','frontend','data','contracts','schemas','.github','docker-compose.yml'],cwd=R,text=True).strip()
receipt=read(E/'joint-v2/run-record.json')
checks['actualCleanJointRun']=receipt['status']=='PASS' and receipt['sourceCommit']==commit and receipt['workingTreeDirty'] is False and receipt['semanticInferenceReproduced'] is True
base=read(E/'fresh-baseline-v2/run-record.json')
checks['freshBaselineFullRun']=base['status']=='PASS' and base['codeCommit']==commit and base['assetsUnchanged'] and base['deterministicEvaluation'] and base['metricsRecalculated']
candidate=read(E/'joint-v2/m7-semantic/run-record.json')
checks['candidateFullRun']=candidate['status']=='PASS' and candidate['codeCommit']==commit and candidate['deterministicOutputs'] and candidate['metricsRecalculated']
checks['service12Pass']=len(read(E/'joint-v2/deployment/smoke.json')['cases'])==12 and all(x['status']=='PASS' for x in read(E/'joint-v2/deployment/smoke.json')['cases'])
checks['fault18Pass']=read(E/'quality-probes.json')['passCount']==18 and read(E/'quality-probes.json')['failCount']==0
checks['formulaPassNoSignature']=read(E/'formula-recalculation.json')['status']=='PASS' and read(E/'formula-recalculation.json')['formalAcceptance'] is False
checks['allEvidenceHashes']=all(sha(E/name)==expected for name,expected in read(E/'FILES.sha256.json').items())
environment=read(E/'environment-audit.json')
checks['twoExactDependencyProfiles']=all(not row['mismatches'] and row['pipCheckExitCode']==0 for row in environment['profiles'].values())
checks['freshAndReuseDistinguished']=environment['profiles']['baseline-fresh']['freshInstallThisRun'] and not environment['profiles']['candidate-reused']['freshInstallThisRun']
checks['sourceAndModelAuditPass']=read(E/'asset-audit.json')['status']=='PASS' and read(E/'model-audit.json')['status']=='PASS'
acceptance=read(J/'acceptance-status.json')
checks['ownerConfirmationsStillPending']=all(row['status']=='PENDING' and row['signature'] is None for row in acceptance['confirmations'].values())
checks['noFormalStageClaim']=manifest['phase5IntegrationCommit'] is None and manifest['phase4FreezeCommit'] is None and not manifest['formalStageComplete'] and not acceptance['issueCloseAllowed']
template=read(J/'release-acceptance-template.json')
checks['releaseTemplateHonest']=template['status']=='NOT_EXECUTED_IN_RELEASE_ENVIRONMENT' and all(row['status']=='NOT_RUN' and row['actual'] is None for row in template['records'])
checks['originalFailuresPreserved']=read(E/'baseline-profile/run-record.json')['status']=='FAIL' and read(E/'joint-profile/run-record.json')['status']=='FAIL'
checks['noGoUnchanged']=read(E/'joint-v2/m7-semantic/evaluation/evaluation-status.json')['formalDecision']=='NO_GO' and read(E/'joint-v2/m8/price-comparison.json')['decision']=='NO_GO'
checks['m8QualityNotInvented']=read(E/'joint-v2/m8/price-comparison.json')['comparison']['candidateMetrics']['maeFen'] is None
missing=[]
docs=[D/'README.md',D/'reproducibility-environment.md',D/'final-integration-report.md',*J.glob('*.md')]
for p in docs:
    for link in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
        if '://' not in link and not link.startswith('#') and not (p.parent/link.split('#')[0]).exists():
            missing.append([p.name,link])
checks['newDocumentLinksExist']=not missing
for p in [*E.rglob('*.json'),*J.glob('*.json')]:read(p)
checks['newJsonParses']=True
for p in [*E.rglob('*'),*J.rglob('*')]:
    if p.is_file():
        if re.search(rb'(?:gh[pousr]_[A-Za-z0-9]{35,}|github_pat_[A-Za-z0-9_]{60,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)',p.read_bytes()):
            raise SystemExit('Potential secret: '+p.name)
checks['newEvidenceHighConfidenceSecretScan']=True
record=dict(status='PASS_AUTHOR_PREPARATION_ONLY' if all(checks.values()) else 'FAIL',sourceCommit=commit,
    checks=checks,missingLinks=missing,formalAcceptance=False,phase5Complete=False)
if not all(checks.values()):raise SystemExit(json.dumps(record,ensure_ascii=False))
if args.output:
    args.output.write_text(json.dumps(record,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(status=record['status'],checksPassed=len(checks),evidenceFiles=len(read(E/'FILES.sha256.json'))),ensure_ascii=False))

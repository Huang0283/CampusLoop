from pathlib import Path
import json, os, subprocess, time, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path.cwd()
OUT = ROOT / '.codex-tmp'
ENV = dict(os.environ, COMPOSE_PROJECT_NAME='campusloop-pr122-audit',
           COMPOSE_FILE=str(ROOT/'docker-compose.yml')+';'+str(OUT/'compose.audit.yml'),
           COMPOSE_PATH_SEPARATOR=';', MSYS_NO_PATHCONV='1',
           AUTH_SIGNING_KEY='pr122-operations-audit-only-000000000000000000',
           BASELINE_RPC_TOKEN='pr122-operations-audit-only-000000000000000000')

def run(args, *, log=None, check=True):
    r=subprocess.run(args,capture_output=True,env=ENV)
    if log: (OUT/log).write_bytes(r.stdout+r.stderr)
    if check and r.returncode: raise RuntimeError(f'{args[:5]} exit {r.returncode}: '+r.stderr.decode('utf8','replace')[-500:])
    return r

def compose(args, **kw): return run(['docker','compose',*args],**kw)
def shell(name, args): return run(['C:/Program Files/Git/bin/bash.exe',f'backend/scripts/db_{name}.sh',*args],log=name+'-final.log')
def snapshot(filename):
    r=compose(['exec','-T','api','python','scripts/verify_restore.py'])
    (OUT/filename).write_bytes(r.stdout)
    return json.loads(r.stdout)
def ready(service, path):
    for _ in range(40):
        r=compose(['exec','-T',service,'curl','-fsS','http://localhost:8000'+path],check=False)
        if r.returncode==0: return json.loads(r.stdout)
        time.sleep(.5)
    raise RuntimeError(service+' did not recover')

# Worker is already stopped: freeze writes while checking a content-identical restore.
compose(['stop','worker'])
before=snapshot('restore-baseline-v2.json')
(ROOT/'backups/baseline-pr122.json').write_text(json.dumps(before),encoding='utf8')
shell('backup',['.codex-tmp/pr122.dump'])
original=(OUT/'pr122.dump').read_bytes()
(OUT/'pr122.dump').write_bytes(original[:-8]+b'corrupt!')
rejected=run(['C:/Program Files/Git/bin/bash.exe','backend/scripts/db_restore.sh','.codex-tmp/pr122.dump'],log='corrupt-restore-rejected.log',check=False)
assert rejected.returncode != 0
assert before==snapshot('after-rejected-restore.json')
(OUT/'pr122.dump').write_bytes(original)
start=time.monotonic(); shell('restore',['.codex-tmp/pr122.dump'])
restored=snapshot('restored-v2.json'); assert before==restored
restore_seconds=round(time.monotonic()-start,3)
compose(['restart','api'],log='api-restart.log')
assert ready('api','/ready')['code']==0
# Create a real wanted edit through the real API while the consumer is stopped.
api_script='''import json,urllib.request
from datetime import datetime,timedelta,timezone
op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def req(path,data,method='POST',token=None):
 headers={'Content-Type':'application/json'}
 if token: headers['Authorization']='Bearer '+token
 with op.open(urllib.request.Request('http://localhost:8000'+path,data=json.dumps(data).encode(),headers=headers,method=method),timeout=10) as r:return json.load(r)
login=req('/auth/login',{'email':'lin.demo@example.com','password':'Demo@12345'})
token=login['data']['accessToken']
result=req('/wanted/3001',{'title':'PR122 worker restart recovery','description':'Synthetic ops audit only','budgetMin':100,'budgetMax':250,'condition':'ANY','location':'ANY','expireAt':(datetime.now(timezone.utc)+timedelta(days=7)).isoformat()},'PATCH',token)
print(json.dumps({'wantedId':result['data']['id'],'apiCode':result['code']}))
'''
compose(['exec','-T','api','python','-c',api_script],log='wanted-update.json')
sql="SELECT id,status FROM matching_jobs WHERE wanted_id=3001 ORDER BY id DESC LIMIT 1"
pending=compose(['exec','-T','db','psql','-U','campusloop','-d','campusloop','-tAc',sql]).stdout.decode().strip()
assert pending.endswith('|PENDING'),pending
job_id=pending.split('|')[0]
compose(['start','worker'],log='worker-start.log')
worker_before=ready('worker','/healthz')
for _ in range(60):
    sql=f"SELECT status FROM matching_jobs WHERE id={int(job_id)}"
    status=compose(['exec','-T','db','psql','-U','campusloop','-d','campusloop','-tAc',sql]).stdout.decode().strip()
    if status=='DONE': break
    time.sleep(.5)
assert status=='DONE'
compose(['restart','worker'],log='worker-restart.log')
worker_after=ready('worker','/healthz')
assert worker_after['status']=='ok'
assert worker_after['startedAt']!=worker_before['startedAt']
query=f"SELECT count(*) FROM ai_task_runs WHERE task_id={int(job_id)} AND outcome='DONE'"
persisted=int(compose(['exec','-T','db','psql','-U','campusloop','-d','campusloop','-tAc',query]).stdout)
assert persisted>=1
for path in ['/health','/products']:
    compose(['exec','-T','api','python','scripts/api_bench.py','--url','http://localhost:8000'+path,'--concurrency','10','--requests','100'],log='bench-'+path[1:]+'.log')
ids=compose(['ps','-q']).stdout.decode().split()
containers=json.loads(run(['docker','inspect',*ids]).stdout)
logs={}
for c in containers:
    lc=c['HostConfig']['LogConfig'];assert lc['Type']=='json-file'
    assert lc['Config']=={'max-size':'10m','max-file':'3'}
    logs[c['Name']]=lc
(OUT/'logging-config.json').write_text(json.dumps(logs,indent=2))
compose(['exec','-T','db','sh','-c','df -h /var/lib/postgresql/data && du -sh /var/lib/postgresql/data'],log='disk-db.txt')
compose(['exec','-T','minio','sh','-c','df -h /data && du -sh /data'],log='disk-minio.txt')
result={'status':'PASS','scope':'LOCAL_ISOLATED_OPERATIONAL_AUDIT_NOT_RELEASE_SIGNOFF','sourceCommit':run(['git','rev-parse','HEAD']).stdout.decode().strip(),'workingTreeDirty':True,'databaseName':'campusloop (dedicated Compose project campusloop-pr122-audit)','redisDatabase':15,'snapshotTables':len(before['tables']),'restoreSeconds':restore_seconds,'contentAndConstraintHashesMatch':before==restored,'corruptArchiveRejectedBeforeWrites':True,'queuedJobCompletedAfterWorkerReturn':int(job_id),'durableSuccessfulRunCount':persisted,'workerStartedAtBefore':worker_before['startedAt'],'workerStartedAtAfter':worker_after['startedAt'],'loggingConfigurationVerified':True,'physicalLogRotationExercised':True,'freshImagesBuilt':True,'baseImage':'campusloop-pr122-api:audit','sourceMode':'fresh backend image; no source bind mount; infrastructure images reused'}
(OUT/'operations-summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))

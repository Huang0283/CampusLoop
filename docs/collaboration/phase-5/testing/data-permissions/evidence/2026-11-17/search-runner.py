import json, time, uuid, io
from datetime import datetime, timezone
from pathlib import Path
import httpx
from PIL import Image
from app.core.config import get_settings
from app.core.security import decode_access, issue_pair
from app.db.session import SessionLocal
from app.models import AuthSessionFamily

s=get_settings()
assert s.app_env=='test' and 'audit_permission_run2' in s.database_url and s.redis_url.endswith('/15')
c=httpx.Client(base_url='http://127.0.0.1:8000', timeout=30)
records=[]
def req(case, role, method, path, token=None, expected=None, **kw):
    h={'Idempotency-Key':str(uuid.uuid4())}
    if token: h['Authorization']='Bearer '+token
    r=c.request(method,path,headers=h,**kw)
    try: body=r.json()
    except ValueError: body={}
    records.append(dict(case=case,role=role,method=method,path=path,status=r.status_code,code=body.get('code'),expected=expected,pass_=r.status_code in expected if expected else True))
    if expected: assert r.status_code in expected, (case,path,r.status_code,body.get('code'))
    return body.get('data',body),r
def register(alias):
    email=f'closeout-{uuid.uuid4().hex}@example.invalid'
    password=uuid.uuid4().hex+'Aa1!'
    d,_=req('setup',alias,'POST','/auth/register',expected=[201],json=dict(email=email,password=password,nickname='Closeout '+alias))
    return d,email,password
def upload(actor,purpose):
    f=io.BytesIO(); Image.new('RGB',(20,20),'blue').save(f,format='PNG')
    d,_=req('setup','A','POST','/uploads/images',actor,expected=[201],params={'purpose':purpose},files={'file':('image.png',f.getvalue(),'image/png')})
    return d['url']
cases={
 '笔记本':({'AP001','AP002','AP010'},{'AP003','AP009'}),
 '笔记本电脑':({'AP001','AP010'},{'AP002','AP003','AP009'}),
 '电脑':({'AP001','AP003','AP010'},{'AP002','AP009'}),
 '台式电脑':({'AP003'},{'AP001','AP002','AP009','AP010'}),
 '可以装电脑':({'AP009'},{'AP001','AP003','AP010'})}
try:
    a,_,_=register('search'); A=a['accessToken']; image=upload(A,'product')
    fixtures=json.loads(Path('/tmp/search-fixtures.json').read_text())
    mapping={}
    for row in fixtures:
        if row['fixtureId'] not in {'AP001','AP002','AP003','AP009','AP010'}: continue
        payload={k:row[k] for k in ['title','category','condition','price','campusLocation','description']}
        payload['images']=[image]
        obj,_=req('Q33','search-owner','POST','/products',A,[201],json=payload)
        mapping[row['fixtureId']]=obj['id']
    for query,(include,exclude) in cases.items():
        seen=set(); page=1
        while True:
            result,_=req('Q33','guest','GET','/search',expected=[200],params={'query':query,'mode':'keyword','page':page,'pageSize':2})
            seen.update(x['id'] for x in result['items'])
            if page*2>=result['pagination']['total']: break
            page+=1
        actual={alias for alias,oid in mapping.items() if oid in seen}
        records.append(dict(query=query,fixtureIds=sorted(actual),expectedInclude=sorted(include),expectedExclude=sorted(exclude),pages=page))
        assert include<=actual and not exclude&actual, (query,actual)
    outcome='passed'
except Exception as exc: outcome='failed'; records.append({'error':str(exc)[:400]})
finally:
    Path('/tmp/search-results.json').write_text(json.dumps({'outcome':outcome,'executedAt':datetime.now(timezone.utc).isoformat(),'softwareSha':'9713c8cc1adcf23b8214a29128ef00ca3362332c','namespace':'permission/run2','scope':'five AP fixtures only; not full 470 catalog acceptance','mapping':mapping,'records':records},ensure_ascii=False,indent=2))
    print(outcome,records[-1])

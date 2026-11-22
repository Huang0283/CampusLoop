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
    data=body.get('data')
    if isinstance(data,dict):
        records[-1]['object']={k:data[k] for k in ['id','amount','status','moderationBlocked','updatedAt'] if k in data}
        if isinstance(data.get('product'),dict): records[-1]['productId']=data['product']['id']
    records[-1]['input']={k:v for k,v in kw.get('json',{}).items() if k in ['status','amount','hidden','expectedUpdatedAt','bio']}
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
try:
    a,ae,ap=register('A'); b,be,bp=register('B'); d,de,dp=register('D')
    A,B,D=[x['accessToken'] for x in (a,b,d)]
    admins=json.loads(Path('/tmp/closeout-admins.json').read_text())
    admin={}
    for alias in ['R','S']:
        v=admins[alias]
        admin[alias],_=req('setup',alias,'POST','/auth/login',expected=[200],json={'email':v['email'],'password':v['password']})
    R,S=[admin[x]['accessToken'] for x in ['R','S']]
    claims=decode_access(A)
    with SessionLocal() as db: deadline=db.get(AuthSessionFamily,uuid.UUID(claims['sid'])).expires_at
    s.auth_access_ttl_seconds=3
    short=issue_pair(a['user']['id'],claims['sid'],deadline)['accessToken']
    req('C12','A','GET','/users/me',short,[200]); time.sleep(4)
    before,_=req('C12','A','GET','/users/me',A,[200])
    for path in ['/users/me','/orders']: req('C12','A','GET',path,short,[401])
    req('C12','A','PATCH','/users/me',short,[401],json={'bio':'must-not-save'})
    parts=A.split('.'); parts[2]=('A' if parts[2][0]!='A' else 'B')+parts[2][1:]; bad='.'.join(parts)
    for path in ['/users/me','/orders']: req('C34','A','GET',path,bad,[401])
    req('C34','A','PATCH','/users/me',bad,[401],json={'bio':'must-not-save'})
    after,_=req('C34','A','GET','/users/me',A,[200]); assert before['bio']==after['bio']
    for alias in ['R','S']:
        req('C39','R','PATCH',f"/admin/users/{admin[alias]['user']['id']}/status",R,[400,403,404,409],json={'status':'DISABLED','reason':'closeout admin protection'})
        req('C39',alias,'GET','/users/me',admin[alias]['accessToken'],[200])
    z,ze,zp=register('disabled-target'); Z=z['accessToken']; zid=z['user']['id']
    req('C09','R','PATCH',f'/admin/users/{zid}/status',R,[200],json={'status':'DISABLED','reason':'closeout temporary disable'})
    req('C09','Z','POST','/auth/login',expected=[423,403],json={'email':ze,'password':zp})
    req('C09','Z','GET','/orders',Z,[401,403,423])
    req('C41','R','PATCH',f'/admin/users/{zid}/status',R,[200],json={'status':'ACTIVE','reason':'closeout restore'})
    req('C41','Z-old','GET','/users/me',Z,[401])
    req('C41','Z-new','POST','/auth/login',expected=[200],json={'email':ze,'password':zp})
    own=upload(A,'avatar'); foreign=upload(B,'avatar'); public=upload(A,'product'); private=upload(A,'chat')
    req('C46','A','PATCH','/users/me',A,[200],json={'avatar':own})
    for ref in [foreign,public,private]: req('C46','A','PATCH','/users/me',A,[403,422],json={'avatar':ref})
    me,_=req('C46','A','GET','/users/me',A,[200]); assert me['avatar']==own
    products=[]; sessions=[]; orders=[]
    for i in range(2):
        p,_=req('C47','A','POST','/products',A,[201],json={'title':f'Closeout book {i}','category':'BOOKS','condition':'GOOD','price':50+i,'campusLocation':'Library','description':'Isolated audit only','images':[public]})
        products.append(p)
        chat,_=req('C47','B','POST','/chat/sessions',B,[200],json={'productId':p['id']}); sid=chat['id']; sessions.append(sid)
        req('C47','B','POST',f'/chat/sessions/{sid}/messages',B,[201],json={'clientMsgId':str(uuid.uuid4()),'kind':'TEXT','content':f'item {i}'})
        offer,_=req('C47','B','POST',f'/chat/sessions/{sid}/offers',B,[201],json={'amount':40+i})
        accepted,_=req('C47','A','POST',f"/offers/{offer['id']}/accept",A,[200]); order=accepted['order']; orders.append(order)
        assert order['product']['id']==p['id']
        assert float(order['amount'])==40+i
        records[-1]['order']={'id':order['id'],'productId':p['id'],'amount':order['amount']}
        req('C47','D','GET',f"/orders/{order['id']}",D,[403,404])
        req('C47','D','GET',f'/chat/sessions/{sid}/messages',D,[403,404])
    assert orders[0]['id']!=orders[1]['id']
    message,_=req('C35','A','POST',f'/chat/sessions/{sessions[0]}/messages',A,[201],json={'clientMsgId':str(uuid.uuid4()),'kind':'IMAGE','content':private})
    path=f"/chat/messages/{message['id']}/image"
    for alias,tok,exp in [('A',A,[200]),('B',B,[200]),('D',D,[404]),('guest',None,[401])]:
        _,response=req('C35',alias,'GET',path,tok,exp)
        assert response.content.startswith(b'\xff\xd8')==(exp==[200])
    key=private.removeprefix('https://private.campusloop.invalid/')
    response=c.get(f'http://minio:9000/{s.minio_private_bucket}/{key}')
    records.append(dict(case='C35',role='guest',path='private-storage-object',status=response.status_code,pass_=response.status_code==403)); assert response.status_code==403
    p,_=req('C44','A','POST','/products',A,[201],json={'title':'Closeout moderation','category':'BOOKS','condition':'GOOD','price':50,'campusLocation':'Library','description':'Audit','images':[public]})
    path=f"/admin/products/{p['id']}/moderation"
    changed,_=req('C44','R','POST',path,R,[200],json={'hidden':True,'reason':'first action','expectedUpdatedAt':p['updatedAt']})
    req('C44','S','POST',path,S,[409],json={'hidden':False,'reason':'stale action','expectedUpdatedAt':p['updatedAt']})
    req('C44','guest','GET',f"/products/{p['id']}",expected=[404])
    rotated,_=req('C32','D','POST','/auth/refresh',expected=[200],json={'refreshToken':d['refreshToken']})
    req('C32','D','POST','/auth/logout',rotated['accessToken'],[204])
    req('C32','D-old','GET','/users/me',D,[401])
    req('C32','D-rotated','GET','/users/me',rotated['accessToken'],[401])
    outcome='passed'
except Exception as exc:
    outcome='failed'; records.append({'error':str(exc)[:400]})
finally:
    Path('/tmp/closeout-results.json').write_text(json.dumps({'executedAt':datetime.now(timezone.utc).isoformat(),'softwareSha':'9713c8cc1adcf23b8214a29128ef00ca3362332c','api':'http://127.0.0.1:18025','namespace':'permission/run2','executor':'Codex on user request; independent human review pending','outcome':outcome,'records':records},ensure_ascii=False,indent=2))
    print(outcome, len(records), 'checks')
    if outcome=='failed': print(records[-1])

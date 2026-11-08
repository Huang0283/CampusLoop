import concurrent.futures
import hashlib
import io
import json
import re
import urllib.error
import urllib.request
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[2]
out=root/'output/recovered-catalog-20261030'
catalog=json.loads((root/'backend/seed_assets/showcase.json').read_text(encoding='utf8'))
base='http://127.0.0.1:8001'
def get(path):
    with urllib.request.urlopen(base+path,timeout=20) as response:return json.load(response)['data']
first=get('/products?pageSize=100&page=1')
products=list(first['items'])
for page in range(2,(first['pagination']['total']+99)//100+1):products+=get(f'/products?pageSize=100&page={page}')['items']
index={p['id']:p for p in products}
held=[]
for seed in catalog['products']:
    if seed.get('publicationHold'):
        assert seed['id'] not in index,seed['id']
        try:get('/products/'+str(seed['id']))
        except urllib.error.HTTPError as e:assert e.code==404,(seed['id'],e.code)
        else:raise AssertionError('Held item accessible')
        held.append(seed['id']);continue
    p=index[seed['id']]
    for field in ['title','description','category','condition','price']:assert p[field]==seed[field],(seed['id'],field)
    assert p['campusLocation']==seed['location']
    assert len(p['images'])==len(seed['images'])
    assert not re.search(r'儿童|宝宝|幼儿|小孩|小学|自提|\?{3,}',p['title']+p['description'])
    assert all(url.endswith('/'+name) for name,url in zip(seed['images'],p['images'],strict=True))
jobs={name:'http://127.0.0.1:19000/campusloop-public/seed/'+name for seed in catalog['products'] for name in seed['images']}
def photo(job):
    name,url=job
    with urllib.request.urlopen(url,timeout=25) as response:
        assert response.headers.get_content_type()=='image/jpeg'
        body=response.read()
    assert hashlib.sha256(body).digest()==hashlib.sha256((root/'backend/seed_assets/products'/name).read_bytes()).digest(),name
    with Image.open(io.BytesIO(body)) as im:im.verify()
    return 1
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:checked=sum(pool.map(photo,jobs.items()))
result={'api':base,'visibleTotal':len(products),'visibleShowcase':len(catalog['products'])-len(held),
    'verifiedPhotosIncludingHeld':checked,'heldAbsentAnd404':held,'catalogCopyAndPricesMatch':True}
(out/'live-api-check.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result))

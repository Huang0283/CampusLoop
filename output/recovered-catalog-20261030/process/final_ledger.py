import collections
import datetime
import hashlib
import json
import shutil
from pathlib import Path

w=Path(__file__).resolve().parent
root=w.parents[1]
out=root/'output/recovered-catalog-20261030'
assets=root/'backend/seed_assets'
cat=json.loads((assets/'showcase.json').read_text(encoding='utf8'))
before=json.loads((w/'before-showcase.json').read_text(encoding='utf8'))
prov=json.loads((assets/'import-provenance.json').read_text(encoding='utf8'))
review=json.loads((w/'reviewed.json').read_text(encoding='utf8'))
idx=json.loads((w/'index.json').read_text(encoding='utf8'))
byid={p['id']:p for p in cat['products']}
gallery={}
for row in prov['imported']:
    if 'sourcePhotos' not in row:continue
    for photo,name in zip(row.get('sourcePhotos',[]),byid[row['productId']]['images'],strict=True):
        gallery.setdefault((photo['sourceBatch'],photo['sourceImage']),[]).append((row['productId'],name))
evidence={tuple(ref) for e in review['entries'] for ref in e.get('evidence',[])}
special={
    (3,8):('待确认','独立宣传手提箱，与实拍箱体款式不同，未独立定价。'),
    (20,1):('已售或宣传','同画面含已售灰色与薄荷箱，不作为在售商品图。'),
    (20,2):('已售或宣传','同画面含已售灰色与薄荷箱，不作为在售商品图。'),
    (39,2):('水印角度省略','水印覆盖箱体下缘，采用本批其他干净角度。'),
    (39,3):('水印角度省略','水印覆盖底部边缘，采用本批其他干净角度。'),
    (55,1):('待确认','多款发夹混盘，不能按5元整盘挂牌；单件与10–15元价格尚未对应。'),
    (55,2):('待确认','多款发夹混盘，不能按5元整盘挂牌；单件与10–15元价格尚未对应。'),
    (55,3):('来源证据','保留价格矛盾的来源截图，未制作商品。'),
    (72,1):('重复宣传图','同批第三张为相同画面无宣传贴纸版本，展示干净版本。'),
    (76,1):('套餐或规格不同','两件组合不等同本页单个中号，保留作范围核对证据。'),
    (76,3):('套餐或规格不同','另一个尺寸的篮子，不能与已发布中号混为同一商品。'),
}
for i in range(4,10):special[45,i]=('待确认','海尔滚筒面板、旋钮及外观不同，无法确认具体机器归属，不与前三张混图。')
rows=[]
for src in idx:
    ref=(src['batch'],src['image']);matches=gallery.get(ref,[])
    if matches:
        held=all(byid[pid].get('publicationHold') for pid,_ in matches)
        status='暂缓商品图片' if held else '入图库照片'
        reason='水印覆盖实物，商品暂缓展示。' if held else '同件实拍已匹配商品；每件最多5张。'
    elif ref in special:status,reason=special[ref]
    elif ref in evidence:status,reason='来源证据','原商品介绍或价签截图，仅留作证据，不进图库。'
    else:
        assert any(src['batch'] in e['batches'] and len(e['photos'])==5 for e in review['entries']),ref
        status,reason='补充角度','同件已有5张图库照片，此角度作为补充保留。'
    file=Path(src['path'])
    rows.append({'batch':ref[0],'image':ref[1],'sourceFile':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
        'classification':status,'reason':reason,'products':[pid for pid,_ in matches],'galleryFiles':[name for _,name in matches]})
assert len(rows)==308 and len({(r['batch'],r['image']) for r in rows})==308
old=[]
referenced={name:p['id'] for p in cat['products'] for name in p['images']}
old_special={
    'stat-books-bundle-1.jpg':(1716,'与既有商品重复','与1716相同的文具本册照片，沿用既有商品，不重复创建。'),
    'stat-books-bundle-2.jpg':(None,'不适合大学平台','该书架含小学类书籍，原图保留，不进商品图库。'),
    'stat-kokuyo-campus-1.jpg':(None,'待确认','随机1–2件福袋与整张图片范围不对应，未按整图挂牌。'),
    'stat-zebra-set-1.jpg':(1749,'与既有商品重复','与既有1749商品相同的照片，不重复创建。'),
}
for file in sorted((assets/'products').glob('*.jpg')):
    if not file.name.startswith(('pp-','stat-')):continue
    if file.name in referenced:pid=referenced[file.name];status,reason='入图库照片','旧素材已匹配明确商品，原JPEG复用。'
    else:pid,status,reason=old_special[file.name]
    old.append({'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'classification':status,'reason':reason,'productId':pid})
assert len(old)==50 and sum(r['classification']=='入图库照片' for r in old)==46
changes=[]
oldbyid={p['id']:p for p in before['products']}
for p in cat['products']:
    if p['id'] in oldbyid and p['price']!=oldbyid[p['id']]['price']:
        a=next(a for a in prov['imported'] if a['assetId']==p['sourceAssetId'])
        changes.append({'productId':p['id'],'title':p['title'],'before':oldbyid[p['id']]['price'],'after':p['price'],'reason':a['priceAdjustmentReason']})
new=[p for p in cat['products'] if p['id'] not in oldbyid]
newprices=[]
for p in new:
    a=next(a for a in prov['imported'] if a['assetId']==p['sourceAssetId'])
    newprices.append({'productId':p['id'],'title':p['title'],'observedPriceText':a['observedPriceText'],'price':p['price'],'reason':a['priceAdjustmentReason'],'priceType':'demo_asking_price'})
progress={'updatedAt':datetime.datetime.now().astimezone().isoformat(),'branch':'feat/recovered-catalog-20261030','merged':False,
    'catalogProducts':len(cat['products']),'catalogImages':sum(len(p['images']) for p in cat['products']),
    'newProducts':len(new),'newVisibleProducts':sum(not p.get('publicationHold') for p in new),
    'heldProducts':[{'id':p['id'],'title':p['title'],'reason':p['publicationHold']} for p in cat['products'] if p.get('publicationHold')],
    'expectedVisibleShowcase':sum(not p.get('publicationHold') for p in cat['products']),
    'recentSourceImages':len(rows),'recentClassifications':dict(collections.Counter(r['classification'] for r in rows)),
    'oldUnlinkedImages':len(old),'oldClassifications':dict(collections.Counter(r['classification'] for r in old)),
    'sourceImagesUnaccounted':0,'dailyImported':False,
    'priceNotice':'仅调整教学演示商品的挂牌价；保留来源标价、数量范围和调整理由，不表示真实市场成交估值。'}
for name,data in [('source-image-ledger.json',{'recent':rows,'oldLocal':old}),('price-review.json',{'existingAdjustments':changes,'newListingPrices':newprices}),('progress.json',progress)]:
    (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
shutil.copy2(w/'reviewed.json',out/'reviewed-products.json')
print(json.dumps(progress,ensure_ascii=True))

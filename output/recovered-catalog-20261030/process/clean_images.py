import json,hashlib,sys,shutil
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
W=Path(__file__).resolve().parent;R=W.parents[1];A=R/'backend/seed_assets';P=A/'products'
sys.path.insert(0,str(R/'.codex-tmp/image-tools'))
import cv2
B=Path('C:/Users/Administrator/.codex/backups/CampusLoop-context-20261030-085521/catalog-originals')
B.mkdir(exist_ok=True)
cat=json.loads((A/'showcase.json').read_text(encoding='utf8'))
prov=json.loads((A/'import-provenance.json').read_text(encoding='utf8'))
review=json.loads((W/'reviewed.json').read_text(encoding='utf8'))
# The same photo already exists on product 1716; do not publish it twice.
cat['products']=[p for p in cat['products'] if p.get('sourceAssetId')!='recovered-20261030-stat-books-bundle']
prov['imported']=[p for p in prov['imported'] if p['assetId']!='recovered-20261030-stat-books-bundle']
review['entries']=[e for e in review['entries'] if e['key']!='stat-books-bundle']
skip={
 'rec-organizer-purple-bin-2.jpg':'水印覆盖箱体下缘，采用同批第一、第四张的完整箱体照片。',
 'rec-organizer-purple-bin-3.jpg':'同批有其他角度，底部水印覆盖箱体边缘，保留原图但不展示此角度。',
 'rec-bin-white-lid-1.jpg':'同批第三张为同一画面无宣传贴纸原图，采用无贴纸版本。',
}
for p in cat['products']:
    inds=[i for i,n in enumerate(p['images']) if n not in skip]
    if len(inds)!=len(p['images']):
        p['images']=[p['images'][i] for i in inds]
        a=next(x for x in prov['imported'] if x['assetId']==p['sourceAssetId'])
        a['sourcePhotos']=[a['sourcePhotos'][i] for i in inds]
        a['reviewNotes']=a.get('reviewNotes',[])+[skip[n] for n in skip if n.startswith('rec-'+p['sourceAssetId'].removeprefix('recovered-20261030-'))]
        for e in review['entries']:
            if 'recovered-20261030-'+e['key']==p['sourceAssetId']:
                e['existingImages']=p['images']
                e['photos']=[e['photos'][i] for i in inds]
holds={1610:'原图密集平铺水印覆盖鞋面，缺少无水印替代照片，暂缓展示。',1756:'多处广告覆盖冰箱门体与边缘，无法在保留实物表面的前提下安全清理，暂缓展示。',1780:'大字广告覆盖空调机身，缺少干净替代图，暂缓展示。',1784:'能效宣传大字覆盖机身，不能据此验证能效，缺少干净替代图，暂缓展示。'}
holds[1612]='原图含广告拼贴，裁切后清晰度不足，等待清晰无水印的服装实拍。'
holds[1779]='广告与安装承诺贴字覆盖空调上缘，缺少完整无广告原图，暂缓展示。'
for p in cat['products']:
    if 'goofish-983645932734-1.jpg' in p['images']:
        holds[p['id']]='半透明水印横跨文具与包装，缺少干净替代图，暂缓展示。'
    if 'goofish-1074211911311-1.jpg' in p['images']:
        holds[p['id']]='安装广告紧贴空调上沿，背景修补存在明显色块，等待干净原图。'
    if 'rec-organizer-color-cubes-1.jpg' in p['images']:
        holds[p['id']]='水印覆盖透明收纳盒及内部物品，保留原图等待干净替代照片。'
for p in cat['products']:
    if p['id'] in holds:p['publicationHold']=holds[p['id']]
# Coordinates are normalized and explicitly inspected; never remove physical labels/logos.
plan={}
def crop(n,box):plan[n]={'crop':box}
def patch(n,*boxes):plan[n]={'patch':list(boxes)}
crop('goofish-791404685295-1.jpg',[.14,.275,.49,.755])
patch('goofish-996496048807-1.jpg',[.775,0,1,.235])
crop('goofish-1012163479302-1.jpg',[0,0,1,.963])
crop('goofish-1078028949970-1.jpg',[0,0,1,.87])
crop('goofish-983645932734-1.jpg',[0,0,1,.935])
for n in ['goofish-1072457871534-1.jpg','goofish-1066156069262-1.jpg','goofish-1072212380289-1.jpg']:
    plan[n]={'white':[[.675,0,1,.66]]}
patch('goofish-1078539298037-1.jpg',[.70,.655,.81,.83],[.9,.88,1,.96],[0,.865,.13,.95])
crop('goofish-1084057472079-1.jpg',[0,.367,1,.745])
crop('goofish-1085566456133-1.jpg',[0,0,1,.61])
plan['goofish-1085566456133-1.jpg']={'blueOnly':[[.48,.52,.81,.65]],'cropAfter':[0,0,1,.61]}
# Banner lies on background above both AC units; keep the appliance edges.
patch('goofish-1074211911311-1.jpg',[.06,.292,.94,.405])
crop('goofish-1034465351552-1.jpg',[0,0,1,.875])
crop('goofish-1069186009831-1.jpg',[0,0,1,.895])
crop('goofish-1090216624288-1.jpg',[0,0,1,.893])
patch('goofish-1094441404726-1.jpg',[.68,.88,.97,.982])
patch('rec-organizer-color-cubes-1.jpg',[.57,.84,1,1])
patch('rec-organizer-purple-bin-1.jpg',[.66,.886,.98,.993])
patch('rec-organizer-purple-bin-2.jpg',[.67,.841,.984,1])
patch('rec-organizer-purple-bin-4.jpg',[.665,.884,.97,.994])
patch('rec-washer-haier-dark-1.jpg',[.84,.855,.975,.927],[.58,.924,.99,.972])
patch('rec-washer-haier-dark-2.jpg',[.845,.875,1,.952],[.56,.938,1,1])
patch('rec-washer-haier-dark-3.jpg',[.845,.875,1,.952],[.56,.938,1,1])
for i in [1,2]:patch('rec-umbrella-mi-pair-'+str(i)+'.jpg',[.035,.886,.265,.997])
patch('rec-rack-dark-double-1.jpg',[.595,0,1,.23])
patch('rec-basket-laundry-caster-1.jpg',[.02,.60,.25,.83],[.79,.44,1,.70])
# Final visual review: use crops on background only, with complete object bounds.
crop('rec-organizer-purple-bin-1.jpg',[0,0,1,.885])
crop('rec-organizer-purple-bin-4.jpg',[0,0,1,.889])
crop('rec-basket-laundry-caster-1.jpg',[.18,.15,.81,.97])
patch('rec-rack-dark-double-1.jpg',[.57,0,1,.18])
held_files={n for p in cat['products'] if p.get('publicationHold') for n in p['images']}
for n in held_files:
    if (B/n).exists():shutil.copy2(B/n,P/n)
    plan.pop(n,None)
plan.pop('rec-organizer-purple-bin-2.jpg',None)  # Already omitted from galleries.
manifest=[]
for n,spec in plan.items():
    src=P/n
    if not (B/n).exists():shutil.copy2(src,B/n)
    with Image.open(B/n) as orig:
        im=orig.convert('RGB');width,height=im.size
        def rect(box):return tuple(round(v*(width if i%2==0 else height)) for i,v in enumerate(box))
        if 'crop' in spec:im=im.crop(rect(spec['crop']))
        if 'white' in spec:
            d=ImageDraw.Draw(im)
            for b in spec['white']:d.rectangle(rect(b),fill='white')
        if 'patch' in spec:
            arr=cv2.cvtColor(np.array(im),cv2.COLOR_RGB2BGR);mask=np.zeros((height,width),np.uint8)
            for b in spec['patch']:
                x1,y1,x2,y2=rect(b);mask[y1:y2,x1:x2]=255
            arr=cv2.inpaint(arr,mask,3,cv2.INPAINT_TELEA)
            im=Image.fromarray(cv2.cvtColor(arr,cv2.COLOR_BGR2RGB))
        if 'blueOnly' in spec:
            rgb=np.array(im);mask=np.zeros((height,width),np.uint8)
            for b in spec['blueOnly']:
                x1,y1,x2,y2=rect(b)
                a=rgb[y1:y2,x1:x2].astype(np.float32)
                mask[y1:y2,x1:x2]=((a[:,:,2]>a[:,:,1]*1.05)&(a[:,:,1]>a[:,:,0]*1.12)).astype(np.uint8)*255
            mask=cv2.dilate(mask,np.ones((5,5),np.uint8))
            im=Image.fromarray(cv2.inpaint(rgb,mask,3,cv2.INPAINT_TELEA))
        if 'cropAfter' in spec:im=im.crop(rect(spec['cropAfter']))
        assert min(im.size)>=32,n
        im.save(src,'JPEG',quality=93,optimize=True)
    manifest.append({'file':n,'originalSha256':hashlib.sha256((B/n).read_bytes()).hexdigest(),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'operation':spec,'originalBackup':str(B/n)})
for a in prov['imported']:
    p=next(x for x in cat['products'] if x.get('sourceAssetId')==a['assetId'])
    a['imageSha256']=[hashlib.sha256((P/n).read_bytes()).hexdigest() for n in p['images']]
    modified=[m for m in manifest if m['file'] in p['images']]
    if modified:a['imageEdits']=modified
    else:a.pop('imageEdits',None)
    if p.get('publicationHold'):a['publicationHold']=p['publicationHold']
(A/'showcase.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2),encoding='utf8')
(A/'import-provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2),encoding='utf8')
(W/'reviewed.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
out=R/'output/recovered-catalog-20261030'
(out/'image-cleaning.json').write_text(json.dumps({'cleaned':manifest,'withheld':holds,'omittedGalleryImages':skip},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'products':len(cat['products']),'visible':sum(not p.get('publicationHold') for p in cat['products']),'images':sum(len(p['images']) for p in cat['products']),'cleaned':len(manifest),'withheld':holds},ensure_ascii=False))

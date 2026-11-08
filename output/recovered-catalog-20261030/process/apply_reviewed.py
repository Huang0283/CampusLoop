import datetime
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image, ImageOps

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[2]
WORK = Path(__file__).resolve().parent
ASSETS = ROOT / 'backend/seed_assets'
review = json.loads((WORK / 'reviewed.json').read_text(encoding='utf-8'))
index = json.loads((WORK / 'index.json').read_text(encoding='utf-8'))
sources = {(p['batch'], p['image']): Path(p['path']) for p in index}
sources.update({(90,p['image']):Path(p['path']) for p in json.loads((WORK/'old-index.json').read_text(encoding='utf-8'))})
ocr = {}
for line in (WORK / 'ocr.jsonl').read_text(encoding='utf-8').splitlines():
    d = json.loads(line)
    ocr[d['batch'], d['image']] = d.get('text', '')
for line in (WORK/'old-ocr.jsonl').read_text(encoding='utf-8').splitlines():
    d=json.loads(line)
    ocr[90,d['image']]=d.get('text','')
catalog = json.loads((ASSETS / 'showcase.json').read_text(encoding='utf-8'))
provenance = json.loads((ASSETS / 'import-provenance.json').read_text(encoding='utf-8'))
lookup = {p.get('sourceAssetId'): p for p in catalog['products']}
next_id = max(p['id'] for p in catalog['products']) + 1
if not (WORK / 'before-showcase.json').exists():
    (WORK / 'before-showcase.json').write_bytes((ASSETS / 'showcase.json').read_bytes())
    (WORK / 'before-provenance.json').write_bytes((ASSETS / 'import-provenance.json').read_bytes())
all_records = []
for e in review['entries']:
    identity = 'recovered-20261030-' + e['key']
    old = lookup.get(identity)
    pid = old['id'] if old else next_id
    if not old:
        next_id += 1
    photo_names, photo_evidence = [], []
    for i, ref in enumerate(e['photos'], 1):
        source = sources[tuple(ref)]
        name = e.get('existingImages',[])[i-1] if e.get('existingImages') else 'rec-' + e['key'] + f'-{i}.jpg'
        with Image.open(source) as original:
            im = ImageOps.exif_transpose(original).convert('RGB')
            photo_evidence.append({'sourceBatch':ref[0], 'sourceImage':ref[1], 'sourceFile':source.name, 'originalSha256':hashlib.sha256(source.read_bytes()).hexdigest()})
            im.thumbnail((1600, 1600))
            if not e.get('existingImages'):
                im.save(ASSETS / 'products' / name, 'JPEG', quality=93, optimize=True)
        photo_names.append(name)
    desc = e['description'] + chr(10)*2 + '校内当面交接，具体时间与公共交接点通过聊天确认；先查看实物和配件再决定。'

    item = {'id':pid, 'owner':e.get('owner',909), 'category':e['category'], 'condition':e['condition'], 'title':e['title'], 'price':e['price'], 'location':review['location'], 'description':desc, 'images':photo_names, 'sourceAssetId':identity}
    if old:
        catalog['products'][catalog['products'].index(old)] = item
    else:
        catalog['products'].append(item)
    record = {'assetId':identity, 'productId':pid, 'sourcePackage':'recovered-user-session-20261030', 'sourceType':'user-supplied-photos-and-screenshots', 'sourceBatchNumbers':e['batches'], 'originalDescription':'\n'.join(ocr.get(tuple(x),'') for x in e.get('evidence',[])), 'imageSha256':[hashlib.sha256((ASSETS/'products'/n).read_bytes()).hexdigest() for n in photo_names], 'sourcePhotos':photo_evidence, 'observedPriceText':e['observed'], 'price':e['price'], 'priceAdjustmentReason':e.get('priceReason','保留来源标价'), 'priceType':'demo_asking_price', 'detailVerified':False, 'reviewNotes':e.get('reviewNotes',[])}
    provenance['imported'] = [r for r in provenance['imported'] if r['assetId'] != identity] + [record]
    all_records.append(record)
catalog['products'].sort(key=lambda p:p['id'])
(ASSETS/'showcase.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(ASSETS/'import-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
used = {tuple(ref) for e in review['entries'] for ref in e['photos']}
evidence = {tuple(ref) for e in review['entries'] for ref in e.get('evidence',[])}
progress = {'updatedAt':datetime.datetime.now().astimezone().isoformat(), 'branch':'feat/recovered-catalog-20261030', 'merged':False, 'reviewedProducts':len(all_records), 'catalogProducts':len(catalog['products']), 'catalogImages':sum(len(x['images']) for x in catalog['products']), 'sourceImageCount':len(index), 'selectedPhotos':len(used), 'evidenceScreenshots':len(evidence), 'remainingImages':[p for p in index if (p['batch'],p['image']) not in used|evidence], 'productIds':[r['productId'] for r in all_records], 'requirements':['大学生二手平台','地点统一校内','删除儿童等文案','清理水印并保留原图','价格调整保存来源和理由','按摩用品归DAILY','逐图记账不混图不遗漏']}
out = ROOT/'output/recovered-catalog-20261030'
out.mkdir(exist_ok=True)
(out/'progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:progress[k] for k in ['reviewedProducts','catalogProducts','catalogImages','selectedPhotos','evidenceScreenshots']},ensure_ascii=False))

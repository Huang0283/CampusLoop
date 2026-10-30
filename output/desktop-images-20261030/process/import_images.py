import datetime
import hashlib
import json
import re
from pathlib import Path
from PIL import Image,ImageOps

w=Path(__file__).resolve().parent
root=w.parents[1]
assets=root/'backend/seed_assets'
out=root/'output/desktop-images-20261030';out.mkdir(exist_ok=True)
idx=json.loads((w/'index.json').read_text(encoding='utf8'))
ocr={Path(x['path']).name:x.get('text','') for x in map(json.loads,(w/'ocr.jsonl').read_text(encoding='utf8').splitlines())}
def entry(photo,key,title,price,description,**kwargs):
    return dict(photo=photo,key=key,title=title,price=price,description=description,category='other',condition='GOOD',**kwargs)
entries=[
 entry(1,'felt-cake','薄荷巧克力造型不织布蛋糕摆件',25.9,'不织布手工蛋糕造型摆件，深棕色蛋糕主体配薄荷色装饰，顶部有草莓、饼干卷等造型。仅为装饰物，不可食用。图示为桌面摆件，本页不包含定制挂件服务。手工缝线与边缘可能有不对称，按照片查看细节。'),
 entry(3,'pink-staff','粉白色蝴蝶结手作拍照权杖',38,'图示粉白色手作权杖，弯柄上有丝带、蝴蝶结、珠饰与白色绒球，适合社团演出或主题拍照。来源标注长度约75cm，实际尺寸交接测量。本页对应照片中的一件现物，不包含改色、设计或定制服务；配件松紧及手作溢胶请见面检查。'),
 entry(5,'crochet-dolls','毛线钩织造型玩偶两只组合',80,'图示两只毛线钩织造型玩偶，均带帽饰和花朵等装饰。来源称单只高度约15cm，实际大小与造型以照片为准。本页为照片中两只现物一起转让，手工缝合和五官可能略有不对称，附属装饰请交接清点。',observed='来源45元；定制36–48元不等，未明确图中两只组合价。',reason='照片含两只玩偶，按图示两只组合设演示挂牌价80元；不把45元单款价直接当两件组合价。'),
 entry(7,'faceted-beads','棕金色6mm切面手作珠一组',15,'棕金色透明切面手作珠，带穿线孔，可作串珠及手工作品配件。来源标注6mm、40颗15元；本页按该组来源规格整理，数量与孔径需交接时清点核对，照片未逐粒计数。珠体可能有微小瑕疵，不承诺每颗颜色与切面完全一致。'),
 entry(11,'figure-charms','毛球串珠造型挂件六件组合',90,'图示六件不同配色的造型挂件，每件配挂环、串珠或毛球装饰。本页对应照片中六件一起转让，不是随机款，也不包含来源宣传的额外赠品。挂环牢固程度、配件数量及表面细节请交接核对。',observed='10.66–49.99元多款区间价，未明确图示六件整组价格。',reason='按照片六件组合设置演示挂牌价90元；不把最低单款价作为整组六件价格。'),
 entry(13,'foxtail-fern','狐尾天门冬盆栽两盆组合',18.8,'图示两盆狐尾天门冬，叶片呈细密蓬松的直立形态，带原有盆土一起交接。来源明确写两盆装18.8元，本页对应两盆组合。植物状态会随养护与时间变化，交接时查看叶片、盆土与根部情况；不沿用原来源的异地配送承诺。',observed='价签16.8–95元；正文明确两盆装18.8元。',reason='采用正文对应图中两盆组合的18.8元，不采用多规格区间最低价。'),
 entry(15,'potted-chrysanthemum','粉色小菊盆栽 含盆土',25,'一盆图示粉色小菊，带原花盆与盆土，照片中可见已开花与花苞。来源称高度约40cm，交接以实物测量为准。旁边背景花束及摆件不在转让范围内；植物花期和叶片状态会变化，见面确认盆体、叶片与花苞。'),
 entry(17,'pruning-shears','Berry&Bird园艺修枝剪 带包装盒',54.8,'图示Berry&Bird园艺修枝剪一把，带包装卡与盒子。本页只包含剪具及图示原包装，不包含其他园艺配件。来源标注SK5高碳钢，材料信息尚未独立验证；交接检查开合、锁扣、刀刃及包装状态。',conditionOverride='NEW',categoryOverride='DAILY'),
 entry(19,'blue-moon-plant','蓝月光蔓绿绒盆栽 含盆土',15.88,'图示一盆观叶植物，来源称蓝月光蔓绿绒，具体品种未独立鉴定。带原花盆与盆土，叶片及新芽状态见照片，交接时再次确认盆体、根系和叶片。植物生长状态会随养护变化，不作长期存活或养护效果保证。'),
 entry(21,'natural-seed-pods','天然银叶果手工素材六个组合',6,'图示六个天然果壳造型手工素材，来源称银叶果。可用于手工装饰、造型或摆放；不作为食品或可发芽种子出售。天然纹理、尺寸和颜色各有不同，本页范围仅为图示六个，交接时核对完整程度。',observed='49.90元，正文称50个起发，未明确照片六个的价格。',reason='来源批量范围不对应图示六个，按六个现物组合设演示挂牌价6元，保留批量原价及原因。'),
 entry(25,'cosplay-shoulder-pad','Cosplay造型肩垫 单件',29.1,'图示手工造型肩垫一件，带弹力带及固定结构，适合社团服装制作和舞台造型。本页按照片中的单件整理，不将单侧照片描述成一对。来源提到单侧增加约3–4cm，实际厚度和适配肩宽需实物核对；不保证对任何体型都合身。'),
 entry(27,'photo-diffuser-umbrella','白色65cm摄影柔光伞',35,'图示白色球形摄影柔光伞，来源标注直径约65cm，适合摄影、拍照及补光布置。它是摄影柔光附件，不能当作遮雨伞使用。照片未完整展示灯具、电源及支架，挂牌范围为柔光伞本体，相关附件与安装接口请交接确认；不沿用来源的插电即用承诺。',categoryOverride='DAILY',conditionOverride='LIKE_NEW'),
 entry(29,'pink-blue-prop-fork','粉蓝色蝴蝶结Cosplay道具叉',56,'图示粉蓝色手作道具叉，带蝴蝶结、丝带与珠饰，适合社团演出和主题拍照。来源标注PVC材质、长约50cm，实际尺寸和结构见面确认。本页仅为照片中的一件现物，不包含其他长度、改色或定制服务；手作可能有溢胶与不对称。'),
 entry(31,'flower-hairclips','浅紫色缠花Cosplay发饰一组',49,'图示浅紫色缠花造型发饰，花瓣配浅蓝色垂片与珠饰。本页对应照片右侧展示的花饰一组；具体夹具和数量请交接清点，不包含左侧角色参考图中的服装及其他装扮。手工花瓣可能有轻微不对称，避免挤压与拉扯，交接检查固定结构。',crop=[.51,0,1,1]),
 entry(33,'cosplay-prop-sword','蓝金色Cosplay道具剑（柄部有瑕疵）',50,'图示蓝金配色Cosplay道具剑一件，仅作舞台造型或拍照道具。来源明确本体不会发光，且各件柄部圆弧均有塌陷；本页保留这一瑕疵，不按完美品描述。该来源还有不同颜色及较重瑕疵版本，本页只对应所示蓝金色外观，透光程度、柄部变形与配件需交接逐项确认，不包含发光设备。',conditionOverride='FAIR'),
]
excluded=[
 {'photo':9,'key':'ribbon-brooch','reason':'来源明确无现货，仅可复刻定制；不作为大学二手平台的在售现物上架。','observed':'18.30元定制参考价'},
 {'photo':23,'key':'rental-dog-costume','reason':'来源为35元/天的租赁服务，平台当前为二手商品出售流程，不能将日租金当出售价格。','observed':'35元/天，需押金'},
]
cat=json.loads((assets/'showcase.json').read_text(encoding='utf8'))
prov=json.loads((assets/'import-provenance.json').read_text(encoding='utf8'))
if not (w/'before-showcase.json').exists():(w/'before-showcase.json').write_bytes((assets/'showcase.json').read_bytes())
if not (w/'before-provenance.json').exists():(w/'before-provenance.json').write_bytes((assets/'import-provenance.json').read_bytes())
nextid=max(p['id'] for p in cat['products'])+1
ledger=[];records=[]
location='校内公共交接点（具体位置聊天确认）'
for e in entries:
    photo=idx[e['photo']-1];evidence=idx[e['photo']]
    identity='desktop-20261030-'+e['key']
    old=next((p for p in cat['products'] if p.get('sourceAssetId')==identity),None)
    pid=old['id'] if old else nextid
    if not old:nextid+=1
    name='desk-'+e['key']+'-1.jpg'
    with Image.open(photo['backup']) as original:
        im=ImageOps.exif_transpose(original).convert('RGB')
        if e.get('crop'):
            width,height=im.size;im=im.crop(tuple(round(x*(width if j%2==0 else height)) for j,x in enumerate(e['crop'])))
        im.thumbnail((1600,1600));im.save(assets/'products'/name,'JPEG',quality=93,optimize=True)
    desc=e['description']+'\n\n校内当面交接，具体时间与公共交接点通过聊天确认；先查看实物和配件再决定。'
    assert not re.search(r'儿童|宝宝|幼儿|小孩|小学|自提|包邮|同城|新疆|西藏|海南|内蒙|\?{3,}',e['title']+desc)
    product={'id':pid,'owner':909,'title':e['title'],'description':desc,'price':e['price'],
        'category':e.get('categoryOverride',e['category']),'condition':e.get('conditionOverride',e['condition']),
        'location':location,'images':[name],'sourceAssetId':identity}
    if old:cat['products'][cat['products'].index(old)]=product
    else:cat['products'].append(product)
    record={'assetId':identity,'productId':pid,'sourcePackage':'user-desktop-images-20261030',
        'sourceType':'user-supplied-photos-and-screenshots','originalDescription':ocr[evidence['file']],
        'sourcePhotos':[{'sourceFile':photo['file'],'originalSha256':photo['sha256']}],
        'sourceEvidence':{'sourceFile':evidence['file'],'sha256':evidence['sha256']},
        'imageSha256':[hashlib.sha256((assets/'products'/name).read_bytes()).hexdigest()],
        'observedPriceText':e.get('observed',str(e['price'])),'price':e['price'],
        'priceAdjustmentReason':e.get('reason','保留与本页单件范围对应的来源标价'),
        'priceType':'demo_asking_price','detailVerified':False,
        'reviewNotes':['按用户指定分类：雨伞和剪具归DAILY，其余归other；仅使用商品照片，不将说明截图放入图库。']}
    if e.get('crop'):record['imageEdits']=[{'file':name,'crop':e['crop'],'reason':'保留右侧实物花饰，移除左侧角色参考画面。','originalSha256':photo['sha256'],'sha256':record['imageSha256'][0]}]
    prov['imported']=[r for r in prov['imported'] if r['assetId']!=identity]+[record];records.append(record)
    ledger.extend([{**photo,'classification':'入图库照片','productId':pid,'galleryFile':name},
        {**evidence,'classification':'来源证据截图','productId':pid}])
for e in excluded:
    identity='desktop-20261030-'+e['key'];photo=idx[e['photo']-1];evidence=idx[e['photo']]
    assert not any(p.get('sourceAssetId')==identity for p in cat['products'])
    prov['excluded']=[r for r in prov['excluded'] if r['assetId']!=identity]+[{'assetId':identity,'sourcePackage':'user-desktop-images-20261030','reason':e['reason'],'observedPriceText':e['observed'],'plannedCategory':'other','sourceFiles':[photo['file'],evidence['file']],'originalDescription':ocr[evidence['file']]}]
    for source in [photo,evidence]:ledger.append({**source,'classification':'暂缓：非在售现物','reason':e['reason']})
assert len(ledger)==34 and len({r['file'] for r in ledger})==34
assert sum(p['category']=='DAILY' for p in cat['products'] if p.get('sourceAssetId','').startswith('desktop-20261030-'))==2
cat['products'].sort(key=lambda p:p['id'])
(assets/'showcase.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2),encoding='utf8')
(assets/'import-provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2),encoding='utf8')
(out/'source-ledger.json').write_text(json.dumps(sorted(ledger,key=lambda x:x['number']),ensure_ascii=False,indent=2),encoding='utf8')
(out/'reviewed-products.json').write_text(json.dumps({'entries':entries,'excluded':excluded,'provenance':records},ensure_ascii=False,indent=2),encoding='utf8')
progress={'updatedAt':datetime.datetime.now().astimezone().isoformat(),'sourceDirectory':str(Path(idx[0]['path']).parent),
    'sourceImages':34,'newProducts':len(entries),'newGalleryImages':len(entries),'evidenceScreenshots':len(entries),
    'excludedGroups':excluded,'dailyCategory':2,'otherCategory':len(entries)-2,
    'newProductIds':[r['productId'] for r in records],'catalogProducts':len(cat['products']),
    'catalogImages':sum(len(p['images']) for p in cat['products']),'branch':'feat/desktop-images-20261030','merged':False,'dailyImported':False}
(out/'progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(progress,ensure_ascii=True))

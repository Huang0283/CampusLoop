import json,re,hashlib,shutil
from pathlib import Path
W=Path(__file__).resolve().parent
ROOT=W.parents[1]
ASSETS=ROOT/'backend/seed_assets'
suffix='校内当面交接，具体时间与公共交接点通过聊天确认；先查看实物和配件再决定。'
p=W/'apply_reviewed.py'
lines=p.read_text(encoding='utf8').splitlines()
lines=["    desc = e['description'] + chr(10)*2 + "+repr(suffix) if s.startswith("    desc = e[") else s for s in lines]
p.write_text(chr(10).join(lines)+chr(10),encoding='utf8')
# Repair only the suffix introduced by the temporary shell encoding problem.
cat=json.loads((ASSETS/'showcase.json').read_text(encoding='utf8'))
prov=json.loads((ASSETS/'import-provenance.json').read_text(encoding='utf8'))
changes=[]
for p in cat['products']:
    p['location']='校内公共交接点（具体位置聊天确认）'
    if p.get('sourceAssetId','').startswith('recovered-20261030-'):
        reviewed=json.loads((W/'reviewed.json').read_text(encoding='utf8'))
        e=next(e for e in reviewed['entries'] if 'recovered-20261030-'+e['key']==p['sourceAssetId'])
        p['description']=e['description']+chr(10)*2+suffix
    t=p['title']+' '+p['description']
    bad=re.findall(r'儿童|宝宝|幼儿|小孩|小学|自提|天津|北京|上海|广州|深圳|同城|地铁|小区|包邮',t)
    if bad: print('COPY_REVIEW',p['id'],bad,t[:180])
# One ordinary single gel pen was incorrectly priced like a collector's pen.
adjust={
    1721:(2,'普通齐心0.5mm单支直液式中性笔，99元与单支规格明显不符，设演示挂牌价2元；不改品牌收藏笔。'),
    1719:(15,'未核实特殊材质或版本的普通手账本，单本110.7元明显偏高，设演示挂牌价15元。'),
    1741:(3,'普通毕业闲置0.5mm签字笔为单支价，20元明显偏高，设演示挂牌价3元；不混同品牌收藏笔。'),
    1716:(35,'同一组本册文件夹与旧素材重复，剔除不适合大学平台的额外书籍后按图示组合设演示挂牌价35元。'),
}
for p in cat['products']:
    if p['id'] in adjust:
        new,reason=adjust[p['id']]
        if p['price']!=new:
            old=p['price'];p['price']=new
            for a in prov['imported']:
                if a['assetId']==p['sourceAssetId']:
                    a.setdefault('observedPrice',a['price']);a['price']=new
                    a['priceAdjustmentReason']=reason;a['priceType']='demo_asking_price'
            changes.append({'id':p['id'],'before':old,'after':new,'reason':reason})
    # Eliminate contradictory embedded source prices without changing quantities.
    if p['id']==1708:p['description']=p['description'].replace('整组标价 128 元','本页售价对应图示整组')
    if p['id']==1723:p['description']=p['description'].replace('标价 150 元对应打包整组','本页售价对应打包整组')
    assert not re.search(r'\?{3,}|\\n',p['description']),p['id']
(ASSETS/'showcase.json').write_text(json.dumps(cat,ensure_ascii=False,indent=2),encoding='utf8')
(ASSETS/'import-provenance.json').write_text(json.dumps(prov,ensure_ascii=False,indent=2),encoding='utf8')
print('COPY_UPDATED',len(cat['products']),'PRICE_CHANGES',json.dumps(changes,ensure_ascii=False))

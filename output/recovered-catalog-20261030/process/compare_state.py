import json
from pathlib import Path
w=Path(__file__).resolve().parent
root=w.parents[1]
before=json.loads((w/'daily-state-before.json').read_text(encoding='utf-8-sig'))
after=json.loads((w/'daily-state-after.json').read_text(encoding='utf-8-sig'))
cat=json.loads((root/'backend/seed_assets/showcase.json').read_text(encoding='utf8'))
held={str(p['id']) for p in cat['products'] if p.get('publicationHold')}
assert before['users']==after['users'],'Account credentials, roles or status changed'
assert before['business']==after['business'],'Existing business records changed'
intended=[]
for pid,old in before['productState'].items():
    current=after['productState'][pid]
    if pid in held and old['status']=='ON_SALE':
        assert current['status']=='HIDDEN'
        intended.append(int(pid));current={**current,'status':'ON_SALE'}
    assert old==current,pid
result={'existingAccountsUnchanged':len(before['users']),'businessTablesUnchanged':len(before['business']),
    'existingProductStatesChecked':len(before['productState']),'intendedPublicationHolds':intended,
    'backup':'.codex-tmp/recovered-catalog/daily-before-import.dump','passed':True}
(root/'output/recovered-catalog-20261030/preservation-check.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result))

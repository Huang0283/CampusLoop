import json
from pathlib import Path
from time import perf_counter
import requests

endpoint = 'http://127.0.0.1:18790'
cases = {
    'en': [
        '苹果 MacBook Pro 笔记本电脑，使用正常，含充电器。',
        '校内，买来没怎么用，完好无损。',
        'ASUS 笔记本电脑，16GB，¥899，有破损，无法开机。',
        '这个收纳盒可以放在书桌旁，里面可以装几本教材。',
        '众星 XQS 黑黄电动车 带货架护杠 裸车出',
        '适配 60V 换电电池',
        '新款 ZETA-X9 ATX660 Pad5 PB100DZM 26V 电池',
        '蓝金色Cosplay道具剑（柄部有瑕疵）',
        '五星钻豹电动车',
    ],
    'zh': ['Apple iPhone 13, gently used, includes charger. Price ¥49.', 'New umbrella, on campus.', 'Sony',
           '浅紫色缠花Cosplay发饰一组', '蓝金色Cosplay道具剑（柄部有瑕疵）',
           '捷安特 ATX660 山地车 26 寸 24 速', 'Cosplay / ATX660 原文说明\n- 26 寸，24 速\n- 包含配件，¥520。'],
}
evidence = {}
for target, texts in cases.items():
    start = perf_counter()
    response = requests.post(endpoint + '/translate', json={'target': target, 'texts': texts}, timeout=90)
    response.raise_for_status()
    results = response.json()['translations']
    assert len(results) == len(texts)
    evidence[target] = {'sources': texts, 'translations': results, 'seconds': round(perf_counter() - start, 3)}

en = evidence['en']['translations']
assert all(token in en[0] for token in ['苹果', 'MacBook Pro', 'laptop', 'works normally', 'charger included'])
assert 'barely used' in en[1] and 'excellent condition' in en[1]
assert all(token in en[2] for token in ['ASUS', '16GB', '¥899', 'damaged', 'does not power on'])
assert all(token in en[4] for token in ['众星 XQS', 'electric scooter', 'battery and registration plate not included'])
assert '60V' in en[5] and 'battery-swap batteries' in en[5]
assert all(token in en[6] for token in ['ZETA-X9', 'ATX660', 'Pad5', 'PB100DZM', '26V'])
assert en[7] == 'Blue and gold Cosplay prop sword (handle has flaws)'
assert en[8] == '五星钻豹 electric scooter'
zh = evidence['zh']['translations']
assert all(token in zh[0] for token in ['Apple', 'iPhone 13', '¥49', '充电器'])
assert '雨伞' in zh[1] and '校内' in zh[1]
assert zh[2] == 'Sony'
assert zh[3:] == cases['zh'][3:]
repeat = requests.post(endpoint + '/translate', json={'target': 'en', 'texts': cases['en']}, timeout=10)
repeat.raise_for_status()
assert repeat.json()['translations'] == en
out = Path(__file__).resolve().parents[1] / '.codex-tmp/i18n-preview/translation-actual.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
print('PASS: real bidirectional translation, brands, specs, condition polarity, new prose and cached results')

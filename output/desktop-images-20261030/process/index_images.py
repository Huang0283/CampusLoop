import hashlib
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps

w=Path(__file__).resolve().parent
src=Path('C:/Users/Administrator/Desktop/图片')
originals=w/'originals';originals.mkdir(exist_ok=True)
files=sorted(src.glob('*.png'),key=lambda p:(p.stat().st_mtime_ns,p.name))
index=[]
for i,file in enumerate(files,1):
    data=file.read_bytes();backup=originals/file.name
    if not backup.exists():backup.write_bytes(data)
    assert backup.read_bytes()==data
    im=Image.open(backup)
    index.append({'number':i,'file':file.name,'path':str(file),'backup':str(backup),'sha256':hashlib.sha256(data).hexdigest(),'dimensions':list(im.size)})
(w/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf8')
for start in range(0,len(index),12):
    sheet=Image.new('RGB',(1600,1380),'#eeeeee');d=ImageDraw.Draw(sheet)
    for j,row in enumerate(index[start:start+12]):
        im=ImageOps.exif_transpose(Image.open(row['backup'])).convert('RGB');im.thumbnail((390,420))
        x=j%4*400;y=j//4*460;sheet.paste(im,(x+(400-im.width)//2,y))
        d.text((x+4,y+425),f"{row['number']:02d} {row['file'][:12]}",fill='black')
    sheet.save(w/f'contact-{start//12}.jpg',quality=92)
print('Indexed',len(index),'images; originals preserved.')

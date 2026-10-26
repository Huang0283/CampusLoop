from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable, KeepTogether,
)

root = Path(__file__).resolve().parents[1]
source = root / 'docs/management/nine-member-collaboration-plan.md'
output = root / 'output/pdf/CampusLoop_Nine_Member_Collaboration_Plan.pdf'
pdfmetrics.registerFont(TTFont('SimSun', 'C:/Windows/Fonts/simsun.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('SimHei', 'C:/Windows/Fonts/simhei.ttf'))
pdfmetrics.registerFont(TTFont('Times', 'C:/Windows/Fonts/times.ttf'))

body = ParagraphStyle('Body', fontName='SimSun', fontSize=10.3, leading=17,
                      spaceAfter=6, wordWrap='CJK', textColor=colors.HexColor('#242424'))
bullet = ParagraphStyle('Bullet', parent=body, leftIndent=14, firstLineIndent=-10)
h1 = ParagraphStyle('H1', parent=body, fontName='SimHei', fontSize=16, leading=24,
                    spaceBefore=12, spaceAfter=9, keepWithNext=True)
h2 = ParagraphStyle('H2', parent=body, fontName='SimHei', fontSize=12.5, leading=19,
                    spaceBefore=10, spaceAfter=7, keepWithNext=True)
title = ParagraphStyle('Title', parent=body, fontName='Times', fontSize=30,
                       leading=38, alignment=TA_CENTER, spaceAfter=15)
subtitle = ParagraphStyle('Subtitle', parent=body, fontName='SimHei', fontSize=18,
                          leading=28, alignment=TA_CENTER, spaceAfter=12)
center = ParagraphStyle('Center', parent=body, alignment=TA_CENTER, leading=21)


def markup(line):
    line = line.replace('`', '')
    return escape(line)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#aaaaaa'))
    canvas.setLineWidth(.35)
    canvas.line(25*mm, 17*mm, A4[0]-25*mm, 17*mm)
    canvas.setFont('SimSun', 8)
    canvas.setFillColor(colors.HexColor('#666666'))
    canvas.drawString(25*mm, 11*mm, 'CampusLoop | 九人协作与最终交付规划 | v1.2')
    canvas.drawRightString(A4[0]-25*mm, 11*mm, f'{doc.page}')
    canvas.restoreState()


story = [Spacer(1, 33*mm), Paragraph('CampusLoop', title),
         Paragraph('九人协作与最终交付规划', subtitle),
         Paragraph('校园二手交易系统', center), Spacer(1, 12*mm),
         HRFlowable(width='100%', thickness=.6, color=colors.HexColor('#777777')),
         Spacer(1, 8*mm),
         Paragraph('版本 1.2 · 2026-10-26', center),
         Paragraph('岗位自选 · 尚未分组 · 不预先指定成员', center),
         Paragraph('技术负责人：M10 陈梓弘', center),
         Paragraph('GitHub 协作入口：Issue #129', center),
         Spacer(1, 8*mm),
         HRFlowable(width='100%', thickness=.6, color=colors.HexColor('#777777')),
         Spacer(1, 12*mm),
         Paragraph('测试、文书、手册随大改动同步；最终演示在功能与 UI 冻结后进行。', center),
         PageBreak()]

text = source.read_text(encoding='utf-8')
content = text[text.index('## 文档目的'):]
for line in content.splitlines():
    line = line.rstrip()
    if not line:
        continue
    if line.startswith('#### '):
        story.append(Paragraph(markup(line[5:]), h2))
    elif line.startswith('### '):
        story.append(Paragraph(markup(line[4:]), h2))
    elif line.startswith('## '):
        story.append(Paragraph(markup(line[3:]), h1))
    elif line.startswith('- '):
        story.append(Paragraph('• ' + markup(line[2:]), bullet))
    elif re.match(r'^\d+\. ', line):
        story.append(Paragraph(markup(line), bullet))
    else:
        story.append(Paragraph(markup(line), body))

output.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=25*mm,
                        rightMargin=25*mm, topMargin=22*mm, bottomMargin=23*mm,
                        title='CampusLoop 九人协作与最终交付规划',
                        author='CampusLoop', allowSplitting=True)
doc.build(story, onFirstPage=footer, onLaterPages=footer)

import pymupdf as fitz
from PIL import Image, ImageOps, ImageDraw
pdf = fitz.open(output)
render_dir = root / 'tmp/pdfs/collaboration-v12'
render_dir.mkdir(parents=True, exist_ok=True)
thumbs = []
for number, page in enumerate(pdf, 1):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False)
    path = render_dir / f'page-{number:02d}.png'
    pix.save(path)
    thumb = Image.open(path).convert('RGB')
    thumb.thumbnail((330, 465))
    tile = Image.new('RGB', (350, 500), '#ddd')
    tile.paste(thumb, ((350-thumb.width)//2, 10))
    ImageDraw.Draw(tile).text((12, 478), f'Page {number}', fill='black')
    thumbs.append(tile)
for start in range(0, len(thumbs), 6):
    sheet = Image.new('RGB', (1050, 1000), 'white')
    for idx, tile in enumerate(thumbs[start:start+6]):
        sheet.paste(tile, ((idx % 3)*350, (idx // 3)*500))
    sheet.save(render_dir / f'contact-{start//6+1}.png')
pdftext = '\n'.join(page.get_text() for page in pdf)
assert '尚未分组' in pdftext
assert '<阶段>' in pdftext and '<编号>' in pdftext
assert '\u6bcf\u4e2a\u5de5\u4f5c\u65e5' in pdftext
assert 'dataset-register.md' in pdftext
assert 'Blackboard' in pdftext
assert '\ufffd' not in pdftext
print(f'{output}\nPages: {len(pdf)}; Bytes: {output.stat().st_size}')

# CampusLoop 项目更新报告

- 报告日期：2026-10-09；课程截图的本次截止：2026-10-12 23:59（UTC+8）。
- 英文 LaTeX 源码：[CampusLoop_Project_Update_2026-10-09.tex](CampusLoop_Project_Update_2026-10-09.tex)。
- 提交 PDF：[CampusLoop_Project_Update_2026-10-09.pdf](../../output/pdf/CampusLoop_Project_Update_2026-10-09.pdf)。
- 封面沿用现有项目计划书的 Group 5、BSc (AI) 和十名成员姓名/学号；提交前核对课程分组与英文姓名。
- 报告只声明实际技术结果，M10 陈梓弘的真人验收和 M7 逐行复核归档尚未代签。提前实现阶段三不改变原计划每阶段一周。
- 截图没有规定更新报告页数或提供表单字段；本报告为可提交附件，若 Blackboard 表单另有必填字段，须按实际字段填写。

## 本地编译

需要 XeLaTeX 和 Times New Roman，仓库根执行：

```powershell
xelatex -interaction=nonstopmode -halt-on-error -output-directory=tmp/pdfs docs/reports/CampusLoop_Project_Update_2026-10-09.tex
xelatex -interaction=nonstopmode -halt-on-error -output-directory=tmp/pdfs docs/reports/CampusLoop_Project_Update_2026-10-09.tex
Copy-Item -LiteralPath tmp/pdfs/CampusLoop_Project_Update_2026-10-09.pdf -Destination output/pdf/CampusLoop_Project_Update_2026-10-09.pdf
```

首次编译前创建 `tmp/pdfs`；中间文件不提交。源码和最终 PDF 一起版本化。采用 A4、四边2.54cm、Times New Roman 12pt、正文18pt基线、单栏，无表格。

课程提交由一名组员代表小组完成；GitHub 不会自动提交到 MyAberdeen。

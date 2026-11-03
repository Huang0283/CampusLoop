import ExcelJS from 'exceljs'
import type { AdminDashboard } from '../sdk'
import { dateLocale, t } from '../i18n/language'

const ink = '27324B', blue = '334FA3', pale = 'F2F5FB', muted = '69758B'
const campusTime = (value: string) => new Intl.DateTimeFormat(dateLocale(), {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(value))

function sheet(title: string, subtitle: string, widths: number[]) {
  const book = new ExcelJS.Workbook()
  book.creator = 'CampusLoop'
  const page = book.addWorksheet(title, {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  page.columns = widths.map(width => ({ width }))
  const span = (row: number, text: string) => {
    page.mergeCells(row, 1, row, widths.length)
    page.getCell(row, 1).value = text
  }
  span(1, `CampusLoop · ${title}`)
  page.getRow(1).height = 36
  span(2, subtitle)
  page.getRow(2).height = 34
  return { book, page, span }
}

function header(page: ExcelJS.Worksheet, row: number, labels: string[]) {
  const line = page.getRow(row)
  line.values = labels
  line.height = 30
  line.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blue } }
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })
}

function format(page: ExcelJS.Worksheet) {
  page.eachRow((row, index) => {
    row.height ??= 26
    row.eachCell(cell => {
      if (index > 2 && !cell.fill?.type && index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pale } }
      cell.font = { name: 'Arial', size: 11, color: { argb: ink }, ...cell.font }
      cell.alignment = { vertical: 'middle', horizontal: typeof cell.value === 'number' ? 'right' : 'left', wrapText: true, ...cell.alignment }
      if (typeof cell.value === 'number') cell.numFmt ||= '#,##0'
    })
  })
  page.getCell('A1').font = { name: 'Arial', size: 17, bold: true, color: { argb: blue } }
  page.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: muted } }
  page.pageSetup.printArea = page.dimensions.toString()
}

async function save(book: ExcelJS.Workbook, name: string) {
  const buffer = await book.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportDashboardWorkbook(data: AdminDashboard, days: number) {
  const end = data.trend.at(-1)?.date ?? data.rangeStart
  const { book, page, span } = sheet(t('运营概览'), `${data.rangeStart} — ${end} · ${t('北京时间')}\n${t('数据时间')}：${campusTime(data.asOf)}`, [36, 22, 22, 22])
  header(page, 4, [t('指标'), '', '', t('数值')])
  page.mergeCells('A4:C4')
  const metrics = [
    [t('在售商品（与市场列表一致）'), data.products.onSale], [t('人工下架中'), data.products.moderationHeld],
    [t('平台用户'), data.users.total], [t('已禁用用户'), data.users.disabled],
    [t('待处理举报'), data.pending.openReports], [t('争议订单'), data.pending.disputedOrders],
  ] as const
  metrics.forEach(([label, value], index) => {
    const row = index + 5
    page.mergeCells(row, 1, row, 3)
    page.getCell(row, 1).value = label
    page.getCell(row, 4).value = value
  })
  span(12, t('每日数据'))
  page.getCell('A12').font = { bold: true, color: { argb: blue } }
  header(page, 13, ['日期（北京时间）', '新增商品', '新增订单', '完成订单'].map(t))
  data.trend.forEach(point => {
    const row = page.addRow([new Date(`${point.date}T00:00:00Z`), point.newProducts, point.newOrders, point.completedOrders])
    row.getCell(1).numFmt = 'yyyy-mm-dd'
  })
  page.autoFilter = { from: 'A13', to: `D${13 + data.trend.length}` }
  page.views = [{ showGridLines: false, state: 'frozen', ySplit: 13 }]
  format(page)
  await save(book, t(`CampusLoop-运营概览-近${days}天-${end}.xlsx`))
}

export async function exportOrdersWorkbook(name: string, rows: (string | number)[][], subtitle: string) {
  const { book, page } = sheet(t('订单管理'), subtitle, [16, 48, 22, 26, 26, 18, 22, 28, 28])
  header(page, 4, rows[0].map(String))
  rows.slice(1).forEach(values => {
    const row = page.addRow(values)
    row.height = 44
    row.getCell(6).numFmt = '¥#,##0.00'
  })
  page.autoFilter = { from: 'A4', to: `I${Math.max(4, rows.length + 3)}` }
  page.views = [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 1 }]
  page.pageSetup.orientation = 'landscape'
  format(page)
  await save(book, name)
}

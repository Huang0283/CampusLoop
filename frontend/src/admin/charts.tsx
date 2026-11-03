import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { fmt } from './format'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    // The observer reports the initial size on its first callback.
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** 0 → 1 over `duration`, restarted whenever `key` changes. */
function useProgress(key: string, duration = 1100, delay = 0) {
  // Progress is keyed, so a new key reads as 0 until its own animation frames arrive.
  const [state, setState] = useState({ key: '', value: 0 })
  useEffect(() => {
    if (reduced()) return
    let frame = 0
    const started = performance.now() + delay
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - started) / duration))
      setState({ key, value: 1 - Math.pow(1 - p, 3) })
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key, duration, delay])
  if (reduced()) return 1
  return state.key === key ? state.value : 0
}

export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  useLanguage()
  const progress = useProgress(String(value), 900, delay)
  return localize(<>{fmt(Math.round(value * progress))}</>)
}

export interface Series { name: string; color: string; values: number[] }

/** Monotone cubic (Fritsch–Carlson): smooth, but never overshoots, so a count never dips below zero between days. */
function smooth(points: [number, number][]) {
  if (!points.length) return ''
  const n = points.length
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) slope.push((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]))
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0] ?? 0
    if (i === n - 1) return slope[n - 2]
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  })
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue }
    const a = tangent[i] / slope[i], b = tangent[i + 1] / slope[i], h = a * a + b * b
    if (h > 9) { const k = 3 / Math.sqrt(h); tangent[i] = k * a * slope[i]; tangent[i + 1] = k * b * slope[i] }
  }
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1], dx = (x1 - x0) / 3
    d += `C${x0 + dx},${y0 + tangent[i] * dx} ${x1 - dx},${y1 - tangent[i + 1] * dx} ${x1},${y1}`
  }
  return d
}

/** Line + soft area chart. A crosshair snaps to the nearest day; that day's points grow and a tooltip lists every series. */
export function TrendChart({ labels, fullLabels, series, height = 240, caption }: { labels: string[]; fullLabels: string[]; series: Series[]; height?: number; caption: string }) {
  useLanguage()
  const [box, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number>()
  const uid = useId().replace(/:/g, '')
  const n = labels.length
  const progress = useProgress(`${n}-${series.map((item) => item.values.join(',')).join('|')}`)
  const m = { l: 34, r: 16, t: 14, b: 26 }
  const iw = Math.max(1, width - m.l - m.r), ih = height - m.t - m.b
  const peak = Math.max(4, ...series.flatMap((item) => item.values))
  const step = peak <= 8 ? 2 : peak <= 20 ? 5 : peak <= 60 ? 10 : peak <= 200 ? 50 : 100
  const max = Math.ceil(peak / step) * step
  const x = (i: number) => m.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1))
  const y = (v: number) => m.t + ih - (v / max) * ih
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step).filter((_, i, all) => all.length <= 6 || i % Math.ceil(all.length / 5) === 0)
  const every = n <= 8 ? 1 : n <= 16 ? 2 : 5
  const pick = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const px = ((event.clientX - rect.left) * width) / rect.width
    setActive(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1)))))
  }
  const keys = (event: KeyboardEvent<SVGRectElement>) => {
    if (event.key === 'ArrowLeft') { setActive((value) => Math.max(0, (value ?? n) - 1)); event.preventDefault() }
    if (event.key === 'ArrowRight') { setActive((value) => Math.min(n - 1, (value ?? -1) + 1)); event.preventDefault() }
  }
  // End-of-line labels sit above their point, never on the x axis, and never on top of each other.
  const endLabelY = series.reduce<number[]>((placed, item) => {
    let at = y(item.values[n - 1] ?? 0) - 10
    for (const other of placed) if (Math.abs(other - at) < 13) at = other - 14
    return [...placed, Math.max(m.t + 8, at)]
  }, [])
  const tipLeft = active === undefined ? 0 : x(active) + 16 + 170 > width ? x(active) - 186 : x(active) + 16
  const tipTop = active === undefined ? 0 : Math.max(0, Math.min(...series.map((item) => y(item.values[active]))) - 34)
  return localize(<div className="adm-chart" ref={box}>
    {width > 0 && <svg width={width} height={height} role="img" aria-label={caption}>
      <defs>
        {series.map((item, index) => localize(<linearGradient key={item.name} id={`${uid}-g${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={item.color} stopOpacity={index ? 0.14 : 0.26} /><stop offset="1" stopColor={item.color} stopOpacity="0" /></linearGradient>))}
        <clipPath id={`${uid}-clip`}><rect x="0" y="0" width={width * progress} height={height} /></clipPath>
      </defs>
      <g className="adm-grid">{ticks.map((tick) => localize(<g key={tick}>{tick > 0 && <line x1={m.l} x2={width - m.r} y1={y(tick)} y2={y(tick)} />}<text x={m.l - 8} y={y(tick) + 4} textAnchor="end">{tick}</text></g>))}</g>
      <line className="adm-base" x1={m.l} x2={width - m.r} y1={y(0)} y2={y(0)} />
      <g className="adm-grid">{labels.map((label, i) => (n - 1 - i) % every === 0 && localize(<text key={i} x={x(i)} y={height - 6} textAnchor="middle">{label}</text>))}</g>
      <g clipPath={`url(#${uid}-clip)`}>
        {series.map((item, index) => {
          const points = item.values.map((v, i) => [x(i), y(v)] as [number, number])
          return localize(<g key={item.name}>
            <path d={`${smooth(points)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#${uid}-g${index})`} />
            <path className="adm-line" d={smooth(points)} stroke={item.color} />
            {n <= 8 && points.map(([px, py], i) => localize(<circle key={i} className="adm-dot" cx={px} cy={py} r={3.2} fill={item.color} />))}
            <text className="adm-endlabel" x={x(n - 1) - 8} y={endLabelY[index]} textAnchor="end">{item.values[n - 1]}</text>
          </g>)
        })}
      </g>
      {active !== undefined && <g className="adm-hover">
        <line className="adm-cross" x1={x(active)} x2={x(active)} y1={m.t} y2={y(0)} />
        {series.map((item) => localize(<g key={item.name}>
          <circle cx={x(active)} cy={y(item.values[active])} r={13} fill={item.color} opacity={0.16} />
          <circle className="adm-dot is-big" cx={x(active)} cy={y(item.values[active])} r={6.5} fill={item.color} />
        </g>))}
      </g>}
      <rect x={m.l - 10} y={0} width={iw + 20} height={height} fill="transparent" tabIndex={0} aria-label={`${caption}，用左右方向键逐日查看`} style={{ cursor: 'crosshair', outline: 'none' }}
        onPointerMove={pick} onPointerLeave={() => setActive(undefined)} onFocus={() => setActive(n - 1)} onBlur={() => setActive(undefined)} onKeyDown={keys} />
    </svg>}
    <div className={`adm-tip ${active !== undefined ? 'is-on' : ''}`} style={{ left: tipLeft, top: tipTop }} aria-hidden="true">
      {active !== undefined && <>
        <div className="adm-tip-title">{fullLabels[active]}</div>
        {series.map((item) => {
          const diff = active ? item.values[active] - item.values[active - 1] : 0
          return localize(<div className="adm-tip-row" key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span>{active > 0 && <em className={diff >= 0 ? 'up' : 'down'}>{diff >= 0 ? '+' : ''}{diff}</em>}<b>{item.values[active]}</b></div>)
        })}
      </>}
    </div>
    <table className="adm-sr"><caption>{caption}</caption><thead><tr><th>日期</th>{series.map((item) => localize(<th key={item.name}>{item.name}</th>))}</tr></thead>
      <tbody>{fullLabels.map((label, i) => localize(<tr key={label}><td>{label}</td>{series.map((item) => localize(<td key={item.name}>{item.values[i]}</td>))}</tr>))}</tbody></table>
  </div>)
}

export interface Slice { key: string; label: string; value: number; color: string; icon?: ReactNode }

function arcPath(cx: number, cy: number, r: number, r0: number, a0: number, a1: number) {
  const big = a1 - a0 > Math.PI ? 1 : 0
  const P = (rad: number, a: number) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`
  return `M${P(r, a0)}A${r},${r} 0 ${big} 1 ${P(r, a1)}L${P(r0, a1)}A${r0},${r0} 0 ${big} 0 ${P(r0, a0)}Z`
}

function useSlices(slices: Slice[], start: number, sweep: number) {
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  return useMemo(() => {
    const result: (Slice & { a0: number; a1: number; mid: number })[] = []
    for (const item of slices) {
      const a0 = result.length ? result[result.length - 1].a1 : start
      const a1 = a0 + (total ? (item.value / total) * sweep : 0)
      result.push({ ...item, a0, a1, mid: (a0 + a1) / 2 })
    }
    return result
  }, [slices, start, sweep, total])
}

/** Ring chart; hovering a slice or its legend row lifts the slice out and puts its share in the centre.
 *  Slices carry a soft tonal gradient of their own colour; legend rows with an icon also show a share bar. */
export function Donut({ slices, centerLabel, caption, size = 200 }: { slices: Slice[]; centerLabel: string; caption: string; size?: number }) {
  useLanguage()
  const uid = useId().replace(/:/g, '')
  const [active, setActive] = useState<string>()
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  const top = Math.max(1, ...slices.map((item) => item.value))
  const arcs = useSlices(slices, -Math.PI / 2, Math.PI * 2)
  const progress = useProgress(slices.map((item) => item.value).join(','), 900, 150)
  const current = arcs.find((item) => item.key === active)
  const c = 100, r = 90, r0 = 62, gap = 0.014
  return localize(<div className="adm-donut">
    <div className="adm-donut-art" style={{ ['--glow' as string]: (current ?? arcs[0])?.color }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={caption} className={active ? 'is-dim' : ''}>
        <defs>{arcs.map((item, index) => localize(<linearGradient key={item.key} id={`${uid}-s${index}`} gradientUnits="userSpaceOnUse"
          x1={c + Math.cos(item.a0) * r} y1={c + Math.sin(item.a0) * r} x2={c + Math.cos(item.a1) * r} y2={c + Math.sin(item.a1) * r}>
          <stop offset="0" style={{ stopColor: item.color }} /><stop offset="1" style={{ stopColor: `color-mix(in oklab, ${item.color} 62%, #fff)` }} />
        </linearGradient>))}</defs>
        <circle cx={c} cy={c} r={(r + r0) / 2} fill="none" stroke="var(--adm-well)" strokeWidth={r - r0} />
        {arcs.map((item, index) => item.value > 0 && localize(<path key={item.key} className={item.key === active ? 'is-on' : ''} fill={`url(#${uid}-s${index})`}
          d={arcPath(c, c, r, r0, item.a0 + gap, Math.max(item.a0 + gap, item.a0 + (item.a1 - item.a0) * progress - gap))}
          style={{ transform: item.key === active ? `translate(${Math.cos(item.mid) * 7}px, ${Math.sin(item.mid) * 7}px) scale(1.05)` : undefined, transformOrigin: '100px 100px', pointerEvents: 'none' }} />))}
        {/* Hover targets stay put while the visible slice pops out, so the pointer never slips off it and back. */}
        {arcs.map((item) => item.value > 0 && localize(<path key={`hit-${item.key}`} className="adm-hit" d={arcPath(c, c, r + 8, r0, item.a0, item.a1)} fill="transparent"
          onPointerEnter={() => setActive(item.key)} onPointerLeave={() => setActive(undefined)} />))}
        <text className="adm-donut-n" x={c} y={c + 5} textAnchor="middle">{fmt(current ? current.value : total)}</text>
        <text className="adm-donut-l" x={c} y={c + 25} textAnchor="middle">{current ? `${current.label} · ${total ? ((current.value / total) * 100).toFixed(1) : 0}%` : centerLabel}</text>
      </svg>
    </div>
    <ul className="adm-legend">{slices.map((item) => localize(<li key={item.key} className={`${item.key === active ? 'is-on' : ''} ${item.icon ? 'has-ic' : ''}`} style={{ ['--lc' as string]: item.color }}
      onPointerEnter={() => setActive(item.key)} onPointerLeave={() => setActive(undefined)}>
      {item.icon ? <span className="adm-legend-ic">{item.icon}</span> : <i />}
      <span className="adm-legend-name">{item.label}{item.icon && <em className="adm-legend-bar"><u style={{ width: `${(item.value / top) * 100}%` }} /></em>}</span>
      <b>{fmt(item.value)}</b><small>{total ? ((item.value / total) * 100).toFixed(1) : '0.0'}%</small>
    </li>))}</ul>
  </div>)
}

/** Half ring for status mix; legend chips double as hover targets. */
export function SemiDonut({ slices, caption, centerValue, centerLabel }: { slices: Slice[]; caption: string; centerValue: string; centerLabel: string }) {
  useLanguage()
  const [active, setActive] = useState<string>()
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  const arcs = useSlices(slices, Math.PI, Math.PI)
  const progress = useProgress(slices.map((item) => item.value).join(','), 900, 200)
  const current = arcs.find((item) => item.key === active)
  const c = 110, cy = 112, r = 100, r0 = 76, gap = 0.008
  return localize(<div className="adm-semi">
    <svg viewBox="0 0 220 124" role="img" aria-label={caption} className={active ? 'is-dim' : ''}>
      <path d={arcPath(c, cy, r, r0, Math.PI, Math.PI * 2)} fill="var(--adm-well)" />
      {arcs.map((item) => item.value > 0 && localize(<path key={item.key} className={item.key === active ? 'is-on' : ''} fill={item.color}
        d={arcPath(c, cy, r, r0, Math.PI + (item.a0 - Math.PI) * progress + gap, Math.PI + (item.a1 - Math.PI) * progress - gap)}
        style={{ transform: item.key === active ? `translate(${Math.cos(item.mid) * 6}px, ${Math.sin(item.mid) * 6}px)` : undefined, pointerEvents: 'none' }} />))}
      {arcs.map((item) => item.value > 0 && localize(<path key={`hit-${item.key}`} className="adm-hit" d={arcPath(c, cy, r + 6, r0, item.a0, item.a1)} fill="transparent"
        onPointerEnter={() => setActive(item.key)} onPointerLeave={() => setActive(undefined)} />))}
      <text className="adm-donut-n" x={c} y={98} textAnchor="middle">{current ? `${((current.value / total) * 100).toFixed(1)}%` : centerValue}</text>
      <text className="adm-donut-l" x={c} y={116} textAnchor="middle">{current ? `${current.label} · ${current.value} 单` : centerLabel}</text>
    </svg>
    <ul className="adm-chips">{slices.map((item) => localize(<li key={item.key} className={item.key === active ? 'is-on' : ''} onPointerEnter={() => setActive(item.key)} onPointerLeave={() => setActive(undefined)}>
      <i style={{ background: item.color }} /><span>{item.label}</span><b>{item.value}</b>
    </li>))}</ul>
  </div>)
}

export interface Ring { label: string; value: number | null; color: string; hint: string }

/** Concentric progress rings for rates; a ring with no data stays an empty track and says so. */
export function Rings({ rings, caption }: { rings: Ring[]; caption: string }) {
  useLanguage()
  const [active, setActive] = useState<number>()
  const progress = useProgress(rings.map((item) => item.value).join(','), 1400, 300)
  const known = rings.filter((item) => item.value !== null) as (Ring & { value: number })[]
  const mean = known.length ? Math.round((known.reduce((sum, item) => sum + item.value, 0) / known.length) * 100) : null
  const shown = active === undefined ? null : rings[active]
  return localize(<div className="adm-rings">
    <div className="adm-rings-art">
      <svg viewBox="0 0 200 200" role="img" aria-label={caption}>
        {rings.map((item, i) => {
          const r = 84 - i * 19, length = 2 * Math.PI * r
          return localize(<g key={item.label} transform="rotate(-90 100 100)" style={{ ['--rc' as string]: item.color }}>
            <circle className="adm-ring-track" cx={100} cy={100} r={r} />
            {item.value !== null && <circle className={`adm-ring ${active === i ? 'is-on' : ''}`} cx={100} cy={100} r={r} strokeDasharray={length} strokeDashoffset={length * (1 - item.value * progress)}
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(undefined)} />}
          </g>)
        })}
      </svg>
      <div className="adm-rings-center"><b>{shown ? (shown.value === null ? '—' : `${Math.round(shown.value * 100)}%`) : mean === null ? '—' : mean}</b><small>{shown ? shown.label : '三项平均'}</small></div>
    </div>
    <ul className="adm-ring-list">{rings.map((item, i) => localize(<li key={item.label} title={item.hint} className={active === i ? 'is-on' : ''} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(undefined)}>
      <i style={{ background: item.color }} /><span>{item.label}<small>{item.hint}</small></span><b>{item.value === null ? '暂无数据' : `${Math.round(item.value * 100)}%`}</b>
    </li>))}</ul>
  </div>)
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/** Weekday × hour heatmap on one sequential hue; empty cells stay visible as the lightest step. */
export function Heatmap({ cells, days }: { cells: number[][]; days: number }) {
  useLanguage()
  const [tip, setTip] = useState<{ left: number; top: number; text: string; value: number }>()
  const [shown, setShown] = useState(reduced())
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 300); return () => window.clearTimeout(timer) }, [])
  const peak = Math.max(0, ...cells.flat())
  const best = useMemo(() => {
    let found = { value: 0, day: 0, hour: 0 }
    cells.forEach((row, day) => row.forEach((value, hour) => { if (value > found.value) found = { value, day, hour } }))
    return found
  }, [cells])
  const level = (value: number) => (peak === 0 || value === 0 ? 0 : Math.min(4, 1 + Math.floor((value / peak) * 3.999)))
  return localize(<div className="adm-heat-wrap" ref={box}>
    <div className={`adm-heat ${shown ? 'is-in' : ''}`} onPointerLeave={() => setTip(undefined)}>
      <span />
      {Array.from({ length: 24 }, (_, hour) => localize(<span key={hour} className="adm-heat-h">{hour % 3 === 0 ? hour : ''}</span>))}
      {cells.map((row, day) => [localize(<span key={`d${day}`} className="adm-heat-d">周{WEEKDAYS[day]}</span>), ...row.map((value, hour) => localize(<i key={`${day}-${hour}`} className={`adm-heat-c l${level(value)}`} style={{ transitionDelay: `${day * 0.03 + hour * 0.018}s` }}
        onPointerMove={(event) => { const rect = box.current!.getBoundingClientRect(); setTip({ left: Math.min(event.clientX - rect.left + 14, rect.width - 170), top: event.clientY - rect.top + 14, text: `周${WEEKDAYS[day]} ${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`, value }) }} />))])}
    </div>
    <div className="adm-heat-foot"><span>少</span><i className="adm-heat-scale" /><span>多</span><em>{peak ? `近 ${days} 天高峰：周${WEEKDAYS[best.day]} ${best.hour}–${best.hour + 1} 点（${best.value} 件）` : `近 ${days} 天暂无新发布`}</em></div>
    {tip && <div className="adm-tip is-on" style={{ left: tip.left, top: tip.top }}><div className="adm-tip-title">{tip.text}</div><div className="adm-tip-row"><i style={{ background: 'var(--adm-h3)' }} /><span>新发布商品</span><b>{tip.value}</b></div></div>}
  </div>)
}

export function Bars({ items, empty }: { items: { label: string; value: number; color: string }[]; empty: ReactNode }) {
  useLanguage()
  const [grow, setGrow] = useState(reduced())
  useEffect(() => { const timer = window.setTimeout(() => setGrow(true), 350); return () => window.clearTimeout(timer) }, [])
  const top = Math.max(1, ...items.map((item) => item.value))
  if (!items.length) return localize(<>{empty}</>)
  return localize(<div className="adm-bars">{items.map((item, i) => localize(<div className="adm-bar" key={item.label} title={`${item.label}：${item.value} 次`}>
    <span>{item.label}</span>
    <div className="adm-bar-track"><i style={{ width: grow ? `${(item.value / top) * 100}%` : 0, background: item.color, transitionDelay: `${i * 0.08}s` }} /></div>
    <b>{item.value}</b>
  </div>))}</div>)
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  useLanguage()
  const uid = useId().replace(/:/g, '')
  if (values.length < 2) return null
  const lo = Math.min(...values), hi = Math.max(...values)
  const pts = values.map((v, i) => `${(i * 100) / (values.length - 1)},${36 - ((v - lo) / (hi - lo || 1)) * 30}`)
  return localize(<svg className="adm-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <path d={`M${pts.join('L')}L100,40L0,40Z`} fill={`url(#${uid}-s)`} />
    <path d={`M${pts.join('L')}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>)
}

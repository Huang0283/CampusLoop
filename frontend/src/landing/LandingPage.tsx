import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Glyph, Logo, categoryOf, type GlyphName } from '../theme/brand'
import { tagMarkup } from '../theme/spriteMarkup'
import { categoryLabels } from '../live/display'
import { useSession } from '../live/session'
import { AuroraSky } from './AuroraSky'
import { LandingHeader } from './scene'
import './landing.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const Icon = ({ d, width = 1.8, className }: { d: string; width?: number; className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const ICONS = {
  market: 'M3 9 5 4h14l2 5M3 9h18v11H3zM9 13h6',
  wanted: 'M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14zm9 16-3.5-3.5',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  meet: 'M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
  price: 'M3 12V4h8l10 10-8 8zM7.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z',
  safety: 'M12 3 5 6v5.5c0 4.4 3 7.8 7 9.5 4-1.7 7-5.1 7-9.5V6zm-3 9 2.2 2.2L15.5 10',
  check: 'm5 12 5 5 9-10',
  calendar: 'M7 5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM8 3v4M16 3v4M4 10h16',
  star: 'm12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6-4.5-4.1 6-.7z',
  bag: 'M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
}
type Key = 'market' | 'wanted' | 'chat' | 'meet' | 'price' | 'safety'

const SAMPLE_PRODUCTS: Array<[GlyphName, string, string, string, string]> = [['book', '#6C7BFF', '线性代数教材', '¥18', '八成新'], ['bike', '#1FA88E', '通勤自行车', '¥260', '九成新'], ['bulb', '#E2603F', '护眼台灯', '¥45', '全新']]
const MarketDemo = () => <div className="grid3">{SAMPLE_PRODUCTS.map(([glyph, color, name, price, condition]) => <div key={name} className="tile prod">
  <div className="ph" style={{ background: `${color}1F`, color }}><Glyph name={glyph} /></div><b>{name}</b><span><em>{price}</em> · {condition}</span>
</div>)}</div>
const WantedDemo = ({ big }: { big?: boolean }) => <div className="match">
  <div className="tile want"><small>我的求购</small><b>宿舍台灯</b><small>预算 ¥30–60<br />{big ? '最低成色 八成新' : '八成新以上'}</small></div>
  <svg className="link" viewBox="0 0 64 120" fill="none" preserveAspectRatio="none" aria-hidden="true"><path className="flow" d="M2 60 C 30 60, 34 18, 62 18 M2 60 H62 M2 60 C 30 60, 34 102, 62 102" stroke="var(--link)" strokeWidth="1.6" strokeDasharray="4 5" /></svg>
  <div className="res">{([['护眼台灯 · ¥45', '92%'], ['折叠台灯 · ¥35', '78%'], ['夹式阅读灯 · ¥28', '61%']] as const).map(([text, width]) => <div key={text} className="tile">{text}<div className="bar"><span style={{ ['--w' as string]: width }} /></div></div>)}</div>
</div>
const ChatDemo = ({ big }: { big?: boolean }) => <div className="chat">
  <div className="msg them">{big ? '这本线代还在吗？有笔记吗' : '这本线代还在吗？'}</div>
  <div className="msg me">{big ? '在的，前几章有少量铅笔笔记' : '在的，有少量铅笔笔记'}</div>
  <div className="tile offer"><div className="row">对方报价<strong>¥15</strong></div><div className="acts"><span>接受</span><span>还价</span><span>拒绝</span></div></div>
  {big && <div className="msg them">周三下午图书馆门口可以吗？</div>}
</div>
const MeetDemo = ({ big }: { big?: boolean }) => <div className="steps"><div className="line"><span /></div>
  {([...(big ? [['bag', '报价已接受，订单生成', '线性代数教材 · ¥15']] : []), ['calendar', '约定见面', '周三 15:30 · 图书馆东门'], ['check', '双方确认完成', '买家已确认 · 卖家已确认'], ['star', '互相评价', big ? '描述相符 · 沟通顺畅 · 准时守约' : '描述相符 · 准时守约']] as Array<[keyof typeof ICONS, string, string]>)
    .map(([icon, title, detail]) => <div key={title} className="step"><div className="dot"><Icon d={ICONS[icon]} width={big ? 2 : 1.6} /></div><div className="tile"><b>{title}</b><small>{detail}</small></div></div>)}
</div>
const PriceDemo = ({ big }: { big?: boolean }) => <div className={`advice${big ? ' big' : ''}`}>
  {big && <div className="tile adv-head"><div><small>线性代数教材</small><b>八成新 · 原价 ¥49</b></div><span className="chip">图书教材</span></div>}
  <div className="tile adv-range"><small>建议价格</small><strong>¥12 – ¥20</strong><div className="scale"><div className="band" /><i className="pin" /></div>{big && <div className="ticks"><span>¥0</span><span>¥25</span><span>¥49</span></div>}</div>
  <div className="factors">{(big ? ['成色：八成新', '同类成交 23 件', '规则估价'] : ['八成新', '原价 ¥49', '同类 23 件']).map((text) => <span key={text} className="tile">{text}</span>)}</div>
</div>
const SafetyDemo = ({ big }: { big?: boolean }) => <div className={`report${big ? ' big' : ''}`}>
  <div className="tile rp-card"><div className="rp-top"><Icon className="rp-ic" d={ICONS.flag} /><b>举报商品</b><span className="rp-reason">描述与实物不符</span></div>{big && <small>附图 2 张 · 仅管理员可见</small>}</div>
  <div className="rp-flow"><div className="rp-step done"><i />已提交</div><div className="rp-step done"><i />人工审核</div><div className="rp-step now"><i />已处理</div></div>
  {big && <div className="tile rp-result"><b>处理结果</b><small>商品已下架，可在「举报记录」查看</small></div>}
</div>
const DEMOS: Record<Key, (props: { big?: boolean }) => ReactNode> = { market: MarketDemo, wanted: WantedDemo, chat: ChatDemo, meet: MeetDemo, price: PriceDemo, safety: SafetyDemo }

const CHAPTERS: Array<{ key: Key; label: string; tab: string; title: string; text: string; points: string[] }> = [
  { key: 'market', label: '二手市场', tab: '市场', title: '同校的卖家，看得见的二手', text: '教材、电器、自行车……按分类、成色和价格筛一筛，多图看清细节，卖家是谁一目了然。', points: ['分类、成色、价格多重筛选', '多图浏览，参数与交易地点写清楚', '收藏、我的发布，一处管理'] },
  { key: 'wanted', label: '求购匹配', tab: '求购', title: '找不到想要的？发个求购，让好物来找你', text: '写下预算和最低成色，系统会把在售的相关商品匹配给你，并说明为什么推荐它。', points: ['预算区间、最低成色随你定', '匹配结果附相关度与原因', '直接联系卖家，不用来回翻帖'] },
  { key: 'chat', label: '聊天议价', tab: '聊天', title: '在线聊，价格当面谈不如线上先谈好', text: '就着商品直接聊，报价、还价、接受都在对话里完成，谈妥自动生成订单。', points: ['实时消息，断网后自动补齐', '报价卡片：接受、拒绝、还价、撤回', '接受报价即生成订单'] },
  { key: 'meet', label: '当面交易', tab: '交易', title: '约在校园里，见面再成交', text: '时间地点写进订单，改约有记录；双方都确认后才算完成，交易完再互相评价。', points: ['约定时间地点，可改约留痕', '买卖双方确认后完成', '分项评价，信用看得见'] },
  { key: 'price', label: '价格建议', tab: '估价', title: '不知道卖多少？先看看建议价', text: '填好分类、成色和原价，系统按同类商品给出建议区间，并写明参考了多少样本、用的是什么规则。', points: ['建议区间与影响因素一起给出', '样本量、规则或模型标识如实展示', '发布商品时可以直接查看'] },
  { key: 'safety', label: '举报与安全', tab: '安全', title: '遇到问题，一键举报', text: '商品或聊天有问题可以直接举报，由管理员人工审核处理；处理进度随时能查。', points: ['多种举报原因可选', '私密证据只有管理员可见', '处理结果与记录可查'] },
]

// [glyph, category, ring]
const BAZAAR: Array<[GlyphName, string, 0 | 1 | 2]> = [
  ['book', 'BOOKS', 0], ['laptop', 'DIGITAL', 0], ['bike', 'TRANSPORT', 0], ['sneaker', 'clothing', 0],
  ['calc', 'BOOKS', 1], ['headphones', 'DIGITAL', 1], ['mug', 'DAILY', 1], ['ball', 'SPORTS', 1], ['backpack', 'clothing', 1], ['gift', 'other', 1],
  ['pencil', 'STATIONERY', 2], ['phone', 'DIGITAL', 2], ['camera', 'DIGITAL', 2], ['bulb', 'FURNITURE', 2], ['bed', 'BEDDING', 2], ['umbrella', 'DAILY', 2], ['racket', 'SPORTS', 2], ['shirt', 'clothing', 2],
]
const BAZAAR_RINGS = [{ r: 0.2, speed: 0.16, sz: 52 }, { r: 0.33, speed: -0.1, sz: 46 }, { r: 0.46, speed: 0.07, sz: 40 }]

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })

/** Public landing page at "/". Every call to action leads to the real market or the real sign-in routes. */
export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  const user = useSession((state) => state.user)

  useGSAP(() => {
    const scope = root.current!
    const q = <T extends Element = HTMLElement>(selector: string) => [...scope.querySelectorAll<T>(selector)]
    const one = <T extends Element = HTMLElement>(selector: string) => scope.querySelector<T>(selector)!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = matchMedia('(pointer: fine)').matches
    const cleanups: Array<() => void> = []
    const listen = <K extends keyof WindowEventMap>(target: Window | Element, type: K, handler: (event: WindowEventMap[K]) => void) => {
      target.addEventListener(type, handler as EventListener)
      cleanups.push(() => target.removeEventListener(type, handler as EventListener))
    }

    // Fit the wordmark viewBox to the real glyph bounds once the display font is in.
    const wordmark = one<SVGSVGElement>('.wordmark'), text = wordmark.querySelector('text')!
    let alive = true
    document.fonts.ready.then(() => { if (!alive) return; const b = text.getBBox(); wordmark.setAttribute('viewBox', `${b.x - 4} ${b.y - 4} ${b.width + 8} ${b.height + 8}`) })
    cleanups.push(() => { alive = false })

    // Entrance: greeting → wordmark stroke → fill → copy → buttons.
    if (!reduce) {
      gsap.set(text, { strokeDasharray: 1400, strokeDashoffset: 1400 })
      gsap.set('.wordmark tspan', { fillOpacity: 0 })
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from('.hello', { autoAlpha: 0, y: 14, filter: 'blur(6px)', duration: 1.1 })
        .to(text, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0.5)
        .to('.wordmark tspan', { fillOpacity: 1, duration: 1.2, ease: 'power2.out', stagger: 0.25 }, 2.1)
        .from('.lead', { autoAlpha: 0, y: 18, duration: 1 }, 2.3)
        .from('.desc', { autoAlpha: 0, y: 18, duration: 1 }, 2.45)
        .from('.cta a', { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.1 }, 2.6)
        .from('.cue', { autoAlpha: 0, duration: 0.8 }, 3.4)
    }

    // Play whenever a section enters the viewport (scrolling either way); reset once it has fully left.
    const replayOnView = (trigger: Element, anim: gsap.core.Animation, start = 'top 85%') => {
      ScrollTrigger.create({ trigger, start, end: 'bottom 15%', onEnter: () => anim.restart(), onEnterBack: () => anim.restart() })
      ScrollTrigger.create({ trigger, start: 'top bottom', end: 'bottom top', onLeave: () => anim.pause(0), onLeaveBack: () => anim.pause(0) })
    }
    if (!reduce) {
      q('.chapter').forEach((chapter) => {
        const pick = (selector: string) => chapter.querySelectorAll(selector)
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
        replayOnView(chapter, tl)
        tl.from(pick('.copy > *, .copy li'), { autoAlpha: 0, y: 22, duration: 0.9, stagger: 0.07 })
          .from(pick('.frame'), { autoAlpha: 0, y: 40, scale: 0.97, filter: 'blur(8px)', duration: 1.1 }, 0.1)
        const key = chapter.id.replace('lp-', '')
        if (key === 'market') tl.from(pick('.prod'), { autoAlpha: 0, y: 24, rotate: (i: number) => [-4, 2, 5][i], duration: 0.9, stagger: 0.1, ease: 'back.out(1.5)' }, 0.4)
        if (key === 'wanted') tl.from(pick('.want'), { autoAlpha: 0, x: -20, duration: 0.7 }, 0.4)
          .from(pick('.flow'), { autoAlpha: 0, duration: 0.6 }, 0.7)
          .from(pick('.res .tile'), { autoAlpha: 0, x: 20, duration: 0.7, stagger: 0.12 }, 0.8)
          .from(pick('.bar span'), { scaleX: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 1.0)
        if (key === 'price') tl.from(pick('.band'), { scaleX: 0, duration: 1.2, ease: 'power3.out' }, 0.6)
          .from(pick('.pin'), { left: '0%', duration: 1.4, ease: 'expo.out' }, 0.6)
          .from(pick('.factors .tile'), { opacity: 0, y: 10, duration: 0.5, stagger: 0.1 }, 0.9)
        if (key === 'safety') tl.from(pick('.rp-card'), { opacity: 0, y: 14, duration: 0.6 }, 0.4)
          .from(pick('.rp-step'), { opacity: 0, scale: 0.6, duration: 0.5, stagger: 0.25, ease: 'back.out(2)' }, 0.7)
          .from(pick('.rp-result'), { opacity: 0, y: 14, duration: 0.6 }, 1.5)
        if (key === 'chat') tl.from(pick('.chat > *'), { autoAlpha: 0, y: 16, scale: 0.96, duration: 0.6, stagger: 0.32, ease: 'back.out(1.4)' }, 0.5)
        if (key === 'meet') tl.from(pick('.line span'), { scaleY: 0, duration: 1.6, ease: 'power2.inOut' }, 0.4)
          .from(pick('.step'), { autoAlpha: 0, x: 16, duration: 0.6, stagger: 0.3 }, 0.5)
      })
      replayOnView(one('.finale'), gsap.from('.finale > *', { paused: true, autoAlpha: 0, y: 24, duration: 1, stagger: 0.1, ease: 'expo.out' }))
      gsap.to('#lp-aurora', { attr: { x1: 640, x2: 1100 }, duration: 6, ease: 'sine.inOut', repeat: -1, yoyo: true })
      gsap.to('.flow', { strokeDashoffset: -18, duration: 1, repeat: -1, ease: 'none' })
    }

    // Planet orbit: sheets circle the logo on a tilted ellipse. Hover slows it, drag spins it,
    // clicking a back sheet brings it to the front, clicking the front sheet jumps to its chapter.
    const deck = one('.deck'), inner = one('.deck-inner'), ring = one('.orbit-ring')
    const sheets = q<HTMLAnchorElement>('.sheet'), tabs = q<HTMLButtonElement>('.deck-tabs button')
    const N = sheets.length, STEP = (Math.PI * 2) / N, TILT = (-12 * Math.PI) / 180
    const orbit = { angle: Math.PI / 2, speed: reduce ? 0 : 0.22, spread: reduce ? 1 : 0 }
    let frontIdx = 0, dragging: { x: number; a: number } | null = null, moved = false, hoverDeck = false
    const radius = () => {
      const s = parseFloat(getComputedStyle(deck).getPropertyValue('--s')) || 1
      const w = deck.clientWidth
      const x = s < 1 && w < 700 ? Math.min(270, (w / 2) / s - 140) : Math.min((w / s) * 0.4, 280)
      return { x, z: 220, y: x * 0.5 }
    }
    const fitRing = () => { const r = radius(); gsap.set(ring, { width: r.x * 2, height: r.x * 2, marginLeft: -r.x, marginTop: -r.x }) }
    fitRing(); listen(window, 'resize', fitRing)
    const place = () => {
      const r = radius(), sp = orbit.spread
      let best = -Infinity
      sheets.forEach((el, i) => {
        const t = orbit.angle - i * STEP
        const cx = Math.cos(t) * r.x * sp, depth = Math.sin(t) // 1 = front, -1 = back
        const cy = depth * r.y * sp
        gsap.set(el, { x: cx * Math.cos(TILT) - cy * Math.sin(TILT), y: cx * Math.sin(TILT) + cy * Math.cos(TILT), z: depth * r.z * sp, rotationY: -Math.cos(t) * 18, scale: 0.78 + (depth + 1) * 0.11, autoAlpha: sp })
        el.style.setProperty('--shade', String(((1 - depth) / 2) * 0.32))
        if (depth > best) { best = depth; frontIdx = i }
      })
      sheets.forEach((el, i) => { el.classList.toggle('front', i === frontIdx); el.tabIndex = i === frontIdx ? 0 : -1 })
      tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.k === sheets[frontIdx].dataset.k)))
    }
    const orbitTick = (_: number, dt: number) => {
      if (scrollY > innerHeight * 1.2) return
      if (!dragging) orbit.angle += orbit.speed * (dt / 1000)
      place()
    }
    gsap.ticker.add(orbitTick)
    cleanups.push(() => gsap.ticker.remove(orbitTick))
    const cruise = () => gsap.to(orbit, { speed: reduce ? 0 : 0.22, duration: 1.2, ease: 'power2.inOut', overwrite: 'auto' })
    const brake = () => gsap.to(orbit, { speed: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' })
    const bring = (i: number) => {
      const target = Math.PI / 2 + i * STEP
      const delta = ((target - orbit.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI
      gsap.to(orbit, { angle: orbit.angle + delta, duration: reduce ? 0 : 1.1, ease: 'expo.out', overwrite: 'auto' })
    }
    listen(deck, 'pointerenter', () => { hoverDeck = true; brake() })
    listen(deck, 'pointerleave', () => { hoverDeck = false; if (!dragging) cruise() })
    listen(deck, 'pointerdown', (event) => { dragging = { x: event.clientX, a: orbit.angle }; moved = false; gsap.killTweensOf(orbit, 'angle') })
    listen(window, 'pointermove', (event) => { if (!dragging) return; const dx = event.clientX - dragging.x; if (Math.abs(dx) > 5) moved = true; orbit.angle = dragging.a + dx * 0.008 })
    listen(window, 'pointerup', () => { if (!dragging) return; dragging = null; if (moved) bring(frontIdx); if (!hoverDeck) cruise() })
    sheets.forEach((el, i) => listen(el, 'click', (event) => {
      event.preventDefault()
      if (moved) return
      if (i !== frontIdx) bring(i)
      else scrollToId(`lp-${el.dataset.k}`)
    }))
    tabs.forEach((tab) => listen(tab, 'click', () => bring(sheets.findIndex((sheet) => sheet.dataset.k === tab.dataset.k))))
    place()

    if (!reduce) {
      if (finePointer) {
        const rx = gsap.quickTo(inner, 'rotationX', { duration: 1.2, ease: 'power3.out' }), ry = gsap.quickTo(inner, 'rotationY', { duration: 1.2, ease: 'power3.out' })
        listen(window, 'pointermove', (event) => { if (scrollY > innerHeight || dragging) return; ry((event.clientX / innerWidth - 0.5) * 14); rx(-(event.clientY / innerHeight - 0.5) * 10) })
        // The intro drifts slightly against the pointer while the hero is on screen.
        const intro = one('.intro')
        const ix = gsap.quickTo(intro, 'x', { duration: 1.2, ease: 'power3.out' }), iy = gsap.quickTo(intro, 'y', { duration: 1.2, ease: 'power3.out' })
        listen(window, 'pointermove', (event) => { if (scrollY < innerHeight) { ix(-(event.clientX / innerWidth - 0.5) * 10); iy(-(event.clientY / innerHeight - 0.5) * 10) } })
      }
      gsap.from('.deck .core', { scale: 0, autoAlpha: 0, duration: 1.2, ease: 'back.out(1.6)', delay: 2.3 })
      gsap.from('.orbit-ring', { scale: 0.4, autoAlpha: 0, duration: 1.4, ease: 'expo.out', delay: 2.4 })
      gsap.to(orbit, { spread: 1, duration: 1.6, ease: 'expo.out', delay: 2.6 })
      gsap.from('.deck-tabs', { autoAlpha: 0, y: 12, duration: 0.8, delay: 3.3 })
    }

    // 「逛逛市场」: price tags circle the logo and swing on their string; hovering one slows the sky.
    const sky = one('.bz-sky')
    const tags = q('.bz-item').map((el, i) => {
      const ringIndex = BAZAAR[i][2]
      const before = BAZAAR.slice(0, i).filter((item) => item[2] === ringIndex).length
      const count = BAZAAR.filter((item) => item[2] === ringIndex).length
      return { el, ring: ringIndex, base: (before / count) * Math.PI * 2 + ringIndex * 0.6, tilt: gsap.utils.random(-14, 14), hover: 0 }
    })
    const bz = { angle: [0, 0, 0], spread: reduce ? 1 : 0, slow: 1, px: 0, py: 0 }
    tags.forEach((tag) => {
      listen(tag.el, 'pointerenter', () => { gsap.to(tag, { hover: 1, duration: 0.35, ease: 'back.out(2)' }); gsap.to(bz, { slow: 0.15, duration: 0.5 }) })
      listen(tag.el, 'pointerleave', () => { gsap.to(tag, { hover: 0, duration: 0.4 }); gsap.to(bz, { slow: 1, duration: 0.8 }) })
    })
    let visible = false
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    io.observe(sky)
    const bazaarTick = (time: number, dt: number) => {
      if (!visible) return
      const size = sky.clientWidth
      BAZAAR_RINGS.forEach((r, i) => { if (!reduce) bz.angle[i] += r.speed * bz.slow * (dt / 1000) })
      tags.forEach((tag) => {
        const r = BAZAAR_RINGS[tag.ring], a = tag.base + bz.angle[tag.ring], rad = size * r.r * bz.spread, depth = 1 + tag.ring * 0.6
        gsap.set(tag.el, { x: Math.cos(a) * rad + bz.px * depth, y: Math.sin(a) * rad + bz.py * depth, rotation: (tag.tilt + Math.sin(time * 1.3 + tag.base * 3) * 6) * (1 - tag.hover), scale: (0.4 + 0.6 * bz.spread) * (1 + tag.hover * 0.22), opacity: bz.spread, zIndex: tag.hover ? 5 : 1 })
      })
    }
    gsap.ticker.add(bazaarTick)
    cleanups.push(() => { gsap.ticker.remove(bazaarTick); io.disconnect() })
    if (!reduce) {
      const bzIn = gsap.timeline({ paused: true })
        .to(bz, { spread: 1, duration: 1.6, ease: 'expo.out' }, 0)
        .from('.bz-copy > *, .bz-cta', { opacity: 0, y: 24, duration: 1, stagger: 0.1, ease: 'expo.out' }, 0)
      q('.stats [data-count]').forEach((el) => bzIn.from(el, { textContent: 0, duration: 1.4, ease: 'power2.out', snap: { textContent: 1 } }, 0.2))
      replayOnView(one('.bazaar'), bzIn, 'top 75%')
      q('.bz-ghosts svg').forEach((ghost, i) => gsap.to(ghost, { y: i % 2 ? 16 : -16, x: i % 3 ? 8 : -8, rotation: i % 2 ? 6 : -6, duration: 5 + i, ease: 'sine.inOut', repeat: -1, yoyo: true }))
      if (finePointer) {
        const bazaar = one('.bazaar')
        listen(bazaar, 'pointermove', (event) => { const r = sky.getBoundingClientRect(); gsap.to(bz, { px: (event.clientX - r.left - r.width / 2) * -0.03, py: (event.clientY - r.top - r.height / 2) * -0.03, duration: 1, ease: 'power3.out', overwrite: 'auto' }) })
        listen(bazaar, 'pointerleave', () => gsap.to(bz, { px: 0, py: 0, duration: 1.2 }))
      }
    }

    if (!reduce && finePointer) {
      // Magnetic call-to-action buttons.
      q('.cta a, .lp-nav .pill, .finale .acts a, .bz-cta').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })
        listen(el, 'pointermove', (event) => { const r = el.getBoundingClientRect(); x((event.clientX - r.left - r.width / 2) * 0.28); y((event.clientY - r.top - r.height / 2) * 0.4) })
        listen(el, 'pointerleave', () => { x(0); y(0) })
      })
      // Glare + gentle 3D tilt on the chapter frames, glare only on the orbit sheets.
      q('.frame').forEach((el) => {
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' })
        gsap.set(el, { transformPerspective: 1000 })
        listen(el, 'pointermove', (event) => {
          const r = el.getBoundingClientRect(), px = (event.clientX - r.left) / r.width, py = (event.clientY - r.top) / r.height
          el.style.setProperty('--mx', `${px * 100}%`); el.style.setProperty('--my', `${py * 100}%`)
          ry((px - 0.5) * 8); rx(-(py - 0.5) * 6)
        })
        listen(el, 'pointerleave', () => { rx(0); ry(0) })
      })
      sheets.forEach((el) => listen(el, 'pointermove', (event) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${((event.clientX - r.left) / r.width) * 100}%`); el.style.setProperty('--my', `${((event.clientY - r.top) / r.height) * 100}%`) }))
      // Wordmark: the gradient follows the pointer and the word leans towards it.
      const grad = one('#lp-aurora')
      const wrx = gsap.quickTo(wordmark, 'rotationX', { duration: 1, ease: 'power3.out' }), wry = gsap.quickTo(wordmark, 'rotationY', { duration: 1, ease: 'power3.out' })
      gsap.set(wordmark, { transformPerspective: 900 })
      listen(wordmark.parentElement!, 'pointermove', (event) => {
        const r = wordmark.getBoundingClientRect(), px = (event.clientX - r.left) / r.width, py = (event.clientY - r.top) / r.height
        wry((px - 0.5) * 10); wrx(-(py - 0.5) * 12)
        const vb = wordmark.viewBox.baseVal, gx = vb.x + px * vb.width
        gsap.to(grad, { attr: { x1: gx - 260, x2: gx + 200 }, duration: 0.8, ease: 'power3.out', overwrite: true })
      })
      listen(wordmark.parentElement!, 'pointerleave', () => { wrx(0); wry(0) })
    }

    if (!reduce) {
      // Scroll-linked hero exit; scrolling fast spins the orbit faster.
      gsap.fromTo('.hero .intro', { yPercent: 0, opacity: 1 }, { yPercent: -18, opacity: 0.15, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
      gsap.to('.deck', { scale: 0.82, rotationX: 14, y: 60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
      ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / 1200, 3)
        if (v > 0.2 && !hoverDeck) { orbit.speed = 0.22 + v * 0.9; cruise() }
      } })
    }
    return () => cleanups.forEach((run) => run())
  }, { scope: root })

  const enter = user ? <Link className="go" to="/market">进入市场</Link> : <Link className="go" to="/login">登录 / 注册</Link>
  return <div className="lp" ref={root}>
    <AuroraSky mode="landing" />
    <LandingHeader />
    <section className="hero">
      <div className="intro">
        <p className="hello">{user ? `你好，${user.nickname}，欢迎回到` : '你好，欢迎来到'}</p>
        <h1 aria-label="CampusLoop">
          <svg className="wordmark" viewBox="0 0 900 140" aria-hidden="true"><defs><linearGradient id="lp-aurora" gradientUnits="userSpaceOnUse" x1="440" y1="0" x2="900" y2="0" spreadMethod="reflect"><stop offset="0" style={{ stopColor: 'var(--g1)' }} /><stop offset=".55" style={{ stopColor: 'var(--g2)' }} /><stop offset="1" style={{ stopColor: 'var(--g3)' }} /></linearGradient></defs><text x="4" y="112"><tspan className="solid">Campus</tspan><tspan className="hollow">Loop</tspan></text></svg>
        </h1>
        <p className="lead">让闲置在校园里<span className="grad">继续流转</span></p>
        <p className="desc">同校同学之间买卖二手、发布求购、在线议价，约在校园里当面交易。从上架到评价，每一步都有记录。</p>
        <div className="cta">{enter}<Link className="ghost" to="/market">先逛逛市场 →</Link></div>
      </div>

      <div className="deck" aria-label="功能预览">
        <div className="deck-inner">
          <div className="orbit-ring" aria-hidden="true" />
          <div className="core" aria-hidden="true"><Logo className="logo" /></div>
          {CHAPTERS.map(({ key, label }) => {
            const Demo = DEMOS[key]
            return <a key={key} className="sheet glare" href={`#lp-${key}`} data-k={key} aria-label={`${label}：查看介绍`}>
              <div className="sheet-bar"><i><span /></i>{label}<em>查看介绍 →</em></div>
              <div className="sheet-body"><Demo /></div>
              <span className="shine" />
            </a>
          })}
        </div>
        <div className="deck-tabs" role="tablist" aria-label="切换预览">
          {CHAPTERS.map(({ key, tab }) => <button key={key} type="button" role="tab" data-k={key} aria-selected={key === 'market'}>{tab}</button>)}
        </div>
        <p className="deck-note">卡片内容为示例</p>
      </div>

      <a className="cue" href="#story" onClick={(event) => { event.preventDefault(); scrollToId('story') }}><span />向下滚动，看看怎么用</a>
    </section>

    <div className="story" id="story">
      {CHAPTERS.map(({ key, label, title, text, points }, index) => {
        const Demo = DEMOS[key]
        return <section key={key} className={`chapter${index % 2 ? ' flip' : ''}`} id={`lp-${key}`}>
          <div className="copy">
            <div className="label"><Icon d={ICONS[key]} />{label}</div>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>{points.map((point) => <li key={point}><Icon d={ICONS.check} width={2} />{point}</li>)}</ul>
          </div>
          <div className="frame glare" data-title={label}><div className="panel"><Demo big /><span className="demo">示例内容</span></div><span className="shine" /></div>
        </section>
      })}
    </div>

    <section className="bazaar" id="bazaar">
      <div className="bz-ghosts" aria-hidden="true">{(['book', 'bike', 'headphones', 'backpack', 'ball'] as GlyphName[]).map((glyph, i) => <Glyph key={glyph} name={glyph} className={`g${i + 1}`} />)}</div>
      <div className="bz-copy">
        <h3>每一件闲置，一目了然。</h3>
        <p>图书教材、数码电子、生活用品……按分类逛市场，不用登录也能看。</p>
        <div className="stats">
          <div><span>商品分类</span><strong data-count="6">6</strong></div>
          <div><span>成色分档</span><strong data-count="4">4</strong></div>
          <div><span>浏览门槛</span><strong className="word">免登录</strong></div>
        </div>
      </div>
      <nav className="bz-sky" aria-label="市场分类">
        <div className="bz-ring r1" /><div className="bz-ring r2" /><div className="bz-ring r3" />
        <div className="bz-core" aria-hidden="true"><Logo className="logo" /></div>
        {BAZAAR.map(([glyph, category, ring]) => <Link key={glyph} className="bz-item" to={`/market?category=${category}`} data-tip={categoryLabels[category]} aria-label={`逛逛${categoryLabels[category]}`}
          style={{ ['--ic' as string]: categoryOf(category).color, ['--sz' as string]: `${BAZAAR_RINGS[ring].sz}px` }}>
          <svg className="tag" viewBox="0 0 40 48" aria-hidden="true" dangerouslySetInnerHTML={{ __html: tagMarkup }} />
          <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true"><use href={`#g-${glyph}`} /></svg>
        </Link>)}
      </nav>
      <Link className="bz-cta" to="/market">打开市场</Link>
    </section>

    <section className="finale">
      <h3>让闲置，在校园里继续流转</h3>
      <p>{user ? '发布、求购和聊天都在市场里，去看看今天有什么新东西。' : '登录后就能发布、求购和聊天；不登录也可以先逛逛市场。'}</p>
      <div className="acts">{user ? <Link to="/publish">发布闲置</Link> : <Link to="/login">登录 / 注册</Link>}<Link to="/market">先逛逛市场</Link></div>
    </section>
    <footer><span>CampusLoop · 校园二手交易</span><span>教学演示项目</span></footer>
  </div>
}

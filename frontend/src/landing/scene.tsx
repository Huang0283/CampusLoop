import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from 'antd'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Glyph, Logo, categoryOf, type GlyphName } from '../theme/brand'
import { ThemeToggle } from '../theme/AppTheme'
import { useSession } from '../live/session'

/** Top bar shared by the landing page and the sign-in views. */
export function LandingHeader({ auth }: { auth?: 'login' | 'register' }) {
  const user = useSession((state) => state.user)
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    const header = ref.current!
    const onScroll = () => header.classList.toggle('stuck', scrollY > 20)
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  })
  return <header className="lp-header" ref={ref}>
    <Link className="brand" to="/" aria-label="CampusLoop 首页"><Logo className="logo" />CampusLoop</Link>
    <nav className="lp-nav" aria-label="主导航">
      {!auth && <><Link className="lp-link" to="/market">市场</Link><Link className="lp-link" to="/wanted">求购</Link><a className="lp-link" href="#story" onClick={(event) => { event.preventDefault(); document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' }) }}>怎么用</a></>}
      <ThemeToggle />
      {auth ? <span className="auth-nav">{auth === 'register' ? <>已有账号？<Link to="/login">登录</Link></> : <>还没有账号？<Link to="/register">注册</Link></>}</span>
        : user ? <Link className="lp-user" to="/market" aria-label={`进入市场：${user.nickname}`}><Avatar size={30} src={user.avatar}>{user.nickname.slice(0, 1)}</Avatar>{user.nickname}</Link>
          : <><Link className="lp-login" to="/login">登录</Link><Link className="pill" to="/register">注册</Link></>}
    </nav>
  </header>
}

// [glyph, category, ring 0 = inner / 1 = outer]
const ORBS: Array<[GlyphName, string, 0 | 1]> = [['book', 'BOOKS', 0], ['headphones', 'DIGITAL', 0], ['sneaker', 'clothing', 0], ['mug', 'DAILY', 0],
  ['laptop', 'DIGITAL', 1], ['bike', 'SPORTS', 1], ['backpack', 'clothing', 1], ['umbrella', 'DAILY', 1], ['gift', 'other', 1]]
const ORB_RINGS = [{ rx: 0.86, ry: 0.52, speed: 0.032, sz: 58 }, { rx: 1.22, ry: 0.74, speed: -0.02, sz: 50 }]
const SPARKS = ['#8F9BFF', '#4FE3C8', '#FFA48E', '#E0569E']

/** Sign-in backdrop: rotating halo plus glass-planet category orbs, clipped to the viewport so nothing can push a scrollbar. */
export function AuthBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const host = ref.current!
    const halo = host.querySelector('.halo')!
    const spinners = reduce ? [] : [gsap.to('.halo .glow', { rotate: 360, duration: 26, repeat: -1, ease: 'none' }), gsap.to('.halo .line', { rotate: -360, duration: 40, repeat: -1, ease: 'none' })]
    if (!reduce) gsap.fromTo(halo, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: 'expo.out' })

    const counts = [0, 0], seen = [0, 0]
    ORBS.forEach(([, , ring]) => counts[ring]++)
    const nodes = [...host.querySelectorAll<HTMLElement>('.orb')].map((el, index) => {
      if (index < ORBS.length) { const ring = ORBS[index][2]; return { el, ring, base: (seen[ring]++ / counts[ring]) * Math.PI * 2 + ring * 0.35, bob: Math.random() * 6.28 } }
      return { el, ring: -1, base: (index - ORBS.length) * Math.PI / 2 + 0.4, bob: 0 }
    })
    const st = { angle: 0, spread: reduce ? 1 : 0 }
    if (!reduce) gsap.to(st, { spread: 1, duration: 1.8, ease: 'expo.out', delay: 0.35 })
    const TILT = -14 * Math.PI / 180, ct = Math.cos(TILT), sn = Math.sin(TILT)
    const tick = (time: number, dt: number) => {
      st.angle += reduce ? 0 : dt / 1000
      const R = Math.min(innerWidth * 0.5, 680) * 0.8, haloR = Math.min(760, innerWidth * 1.2) * 0.41
      nodes.forEach((n) => {
        let x: number, y: number, depth: number
        if (n.ring < 0) {
          const a = n.base - st.angle * 0.08
          x = Math.cos(a) * haloR; y = Math.sin(a) * haloR; depth = 0.6
        } else {
          const r = ORB_RINGS[n.ring], a = n.base + st.angle * r.speed * 2.2
          const ex = Math.cos(a) * R * r.rx, ey = Math.sin(a) * R * r.ry
          x = ex * ct - ey * sn; y = ex * sn + ey * ct + Math.sin(time * 0.8 + n.bob) * 6
          depth = (Math.sin(a) + 1) / 2 // 0 = behind, 1 = in front
        }
        const sp = st.spread
        gsap.set(n.el, { x: x * (0.6 + 0.4 * sp), y: y * (0.6 + 0.4 * sp), scale: (0.8 + depth * 0.3) * sp, opacity: sp * (0.82 + depth * 0.18), zIndex: Math.round(depth * 10) })
      })
    }
    gsap.ticker.add(tick)

    // Focusing a field speeds up and brightens the halo; typing gives it a small pulse.
    const inForm = (target: EventTarget | null) => target instanceof HTMLInputElement && Boolean(target.closest('.auth .card'))
    const focusIn = (event: FocusEvent) => { if (!inForm(event.target)) return; halo.classList.add('hot'); spinners.forEach((tween) => gsap.to(tween, { timeScale: 1.6, duration: 0.8 })) }
    const focusOut = (event: FocusEvent) => { if (!inForm(event.target)) return; halo.classList.remove('hot'); spinners.forEach((tween) => gsap.to(tween, { timeScale: 1, duration: 1.2 })) }
    const typed = (event: Event) => { if (!reduce && inForm(event.target)) gsap.fromTo(halo, { scale: 1.035 }, { scale: 1, duration: 0.5, ease: 'power2.out', overwrite: 'auto' }) }
    document.addEventListener('focusin', focusIn); document.addEventListener('focusout', focusOut); document.addEventListener('input', typed)
    return () => {
      gsap.ticker.remove(tick)
      document.removeEventListener('focusin', focusIn); document.removeEventListener('focusout', focusOut); document.removeEventListener('input', typed)
    }
  }, { scope: ref })
  return <div className="auth-bg" ref={ref} aria-hidden="true">
    <div className="halo"><div className="glow" /><div className="line" /></div>
    <div className="orbitals">
      {ORBS.map(([glyph, category, ring]) => <div key={glyph} className="orb" style={{ ['--ic' as string]: categoryOf(category).color, ['--sz' as string]: `${ORB_RINGS[ring].sz}px` }}><Glyph name={glyph} /></div>)}
      {SPARKS.map((color) => <div key={color} className="orb spark" style={{ ['--ic' as string]: color }} />)}
    </div>
  </div>
}

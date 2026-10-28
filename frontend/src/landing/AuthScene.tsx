import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Logo } from '../theme/brand'
import { AuroraSky } from './AuroraSky'
import { AuthBackdrop, LandingHeader } from './scene'
import './landing.css'

/** Sign-in / registration layout: aurora + halo backdrop, the form card tilts towards the pointer but never moves. */
export function AuthScene({ registering, children }: { registering: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .fromTo('.auth-head > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.2)
      .fromTo('.auth .card', { autoAlpha: 0, y: 30, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, clearProps: 'filter' }, 0.3)
      .fromTo('.back', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.8)
    if (!matchMedia('(pointer: fine)').matches) return
    const card = root.current!.querySelector<HTMLElement>('.auth .card')!
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3.out' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3.out' })
    gsap.set(card, { transformPerspective: 1000 })
    const move = (event: PointerEvent) => {
      const r = card.getBoundingClientRect(), px = (event.clientX - r.left) / r.width, py = (event.clientY - r.top) / r.height
      card.style.setProperty('--mx', `${px * 100}%`); card.style.setProperty('--my', `${py * 100}%`)
      ry((px - 0.5) * 8); rx(-(py - 0.5) * 6)
    }
    const leave = () => { rx(0); ry(0) }
    card.addEventListener('pointermove', move); card.addEventListener('pointerleave', leave)
    return () => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave) }
  }, { scope: root })
  // Switching between login and register keeps the scene and just refreshes the copy.
  useGSAP(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo('.auth-head > *, .auth .card .ant-form-item, .auth .card .note', { autoAlpha: 0.2, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out' })
  }, { scope: root, dependencies: [registering], revertOnUpdate: false })

  return <div className="lp lp-auth" ref={root}>
    <AuroraSky mode="auth" />
    <LandingHeader auth={registering ? 'register' : 'login'} />
    <section className="auth" aria-labelledby="auth-title">
      <AuthBackdrop />
      <div className="auth-box">
        <div className="auth-brand" aria-hidden="true"><Logo className="logo" /></div>
        <div className="auth-head"><h1 id="auth-title">{registering ? '加入 CampusLoop' : '欢迎回来'}</h1><p>{registering ? '创建账号，开始买卖与求购' : '登录 CampusLoop，继续你的交易'}</p></div>
        <div className="card glare">{children}<span className="shine" /></div>
        <Link className="back" to="/">← 返回首页</Link>
      </div>
    </section>
  </div>
}

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const VERTEX = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'
// Fluid aurora: three theme-coloured blobs warped by fbm noise, pushed aside by the pointer like a lens.
// MODE moves the blobs from the landing layout (0) to the sign-in layout (1).
const FRAGMENT = `precision mediump float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform float MI;uniform vec3 BG,C1,C2,C3;uniform float MODE,DARK;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float blob(vec2 p,vec2 c,float r){return exp(-dot(p-c,p-c)/(r*r));}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
  vec2 m=(M-.5*R)/R.y;
  vec2 dm=p-m;float dd=dot(dm,dm);
  p-=dm*.22*exp(-dd*7.)*MI;
  float t=T*.06;
  vec2 w=vec2(fbm(p*1.3+t),fbm(p*1.3-t+4.1))-.5;
  vec2 q=p+w*.55;
  float ax=R.x/R.y*.5;
  vec2 a1=mix(vec2(-ax*.85,.42),vec2(ax*.25,-.18),MODE)+.18*vec2(sin(t*1.7),cos(t*1.3));
  vec2 a2=mix(vec2(-.05,-.5),vec2(-ax*.7,-.15),MODE)+.2*vec2(cos(t*1.1),sin(t*1.9));
  vec2 a3=mix(vec2(ax*.85,.5),vec2(-.1,.55),MODE)+.16*vec2(sin(t*1.4+2.),cos(t*.9));
  float b1=blob(q,a1,.62),b2=blob(q,a2,.58),b3=blob(q,a3,.55);
  vec3 col=BG;
  float k=mix(.62,.55,DARK);
  col=mix(col,C1,b1*k);col=mix(col,C2,b2*k*.85);col=mix(col,C3,b3*k*.9);
  float glow=exp(-dd*5.)*MI;
  col+=mix(vec3(.10,.11,.22),vec3(.16,.17,.32),DARK)*glow*mix(.6,1.,DARK);
  col+=(h(gl_FragCoord.xy+T)-.5)/255.*2.;
  gl_FragColor=vec4(col,1.);
}`

const hex = (value: string) => {
  const c = value.trim().replace('#', '')
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255 || 0)
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Fixed background for the landing and sign-in views: WebGL aurora with the CSS blobs as fallback. */
export function AuroraSky({ mode }: { mode: 'landing' | 'auth' }) {
  const skyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode === 'auth' ? 1 : 0)
  useEffect(() => { modeRef.current = mode === 'auth' ? 1 : 0 }, [mode])

  useEffect(() => {
    const sky = skyRef.current!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = matchMedia('(pointer: fine)').matches
    const root = document.documentElement
    const ctx = gsap.context(() => {
      if (reduce) return
      sky.querySelectorAll('.blob').forEach((el, i) => {
        gsap.to(el, { xPercent: gsap.utils.random(-14, 14), yPercent: gsap.utils.random(-12, 12), scale: gsap.utils.random(0.9, 1.12), duration: gsap.utils.random(9, 14), ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i })
      })
    }, sky)
    const cleanups: Array<() => void> = [() => ctx.revert()]

    if (finePointer && !reduce) {
      const spot = sky.querySelector('.spot')!
      const sx = gsap.quickTo(spot, 'x', { duration: 0.6, ease: 'power3.out' }), sy = gsap.quickTo(spot, 'y', { duration: 0.6, ease: 'power3.out' })
      const pulls = [...sky.querySelectorAll('.blob')].map((el) => ({ x: gsap.quickTo(el, 'x', { duration: 2.4, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 2.4, ease: 'power3.out' }) }))
      gsap.set(spot, { x: innerWidth / 2, y: innerHeight / 2 })
      const move = (e: PointerEvent) => {
        sx(e.clientX); sy(e.clientY)
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5
        pulls.forEach((p, i) => { const k = [180, 120, 160][i]; p.x(nx * k); p.y(ny * k) })
      }
      addEventListener('pointermove', move)
      cleanups.push(() => removeEventListener('pointermove', move))
    }

    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false })
    if (gl) {
      const shader = (type: number, src: string) => {
        const o = gl.createShader(type)!
        gl.shaderSource(o, src); gl.compileShader(o)
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader')
        return o
      }
      const prog = gl.createProgram()!
      try {
        gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAGMENT)); gl.linkProgram(prog)
        gl.useProgram(prog)
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
        const U = Object.fromEntries(['R', 'T', 'M', 'MI', 'BG', 'C1', 'C2', 'C3', 'MODE', 'DARK'].map((k) => [k, gl.getUniformLocation(prog, k)]))
        const SCALE = 0.5 // half resolution: the picture is blurry anyway and it saves battery
        const size = () => { canvas.width = Math.max(2, Math.round(innerWidth * SCALE)); canvas.height = Math.max(2, Math.round(innerHeight * SCALE)); gl.viewport(0, 0, canvas.width, canvas.height) }
        size(); addEventListener('resize', size)
        const target = { bg: [0, 0, 0], c1: [0, 0, 0], c2: [0, 0, 0], c3: [0, 0, 0] }
        let cur: typeof target | null = null
        const u = { mx: innerWidth / 2, my: innerHeight / 2, mi: 0, miT: 0, mode: 0, dark: 0, darkTarget: 0 }
        const readTheme = () => {
          const cs = getComputedStyle(root)
          target.bg = hex(cs.getPropertyValue('--bg')); target.c1 = hex(cs.getPropertyValue('--blob1')); target.c2 = hex(cs.getPropertyValue('--blob2')); target.c3 = hex(cs.getPropertyValue('--blob3'))
          u.darkTarget = root.dataset.theme === 'dark' ? 1 : 0
          if (!cur) { cur = { bg: [...target.bg], c1: [...target.c1], c2: [...target.c2], c3: [...target.c3] }; u.dark = u.darkTarget }
        }
        readTheme()
        const observer = new MutationObserver(readTheme)
        observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
        const move = (e: PointerEvent) => { u.mx = e.clientX; u.my = e.clientY; u.miT = 1 }
        const leave = () => { u.miT = 0 }
        addEventListener('pointermove', move); document.addEventListener('pointerleave', leave)
        sky.classList.add('gl')
        const t0 = performance.now(), sm = { x: u.mx, y: u.my }
        const tick = () => {
          if (document.hidden || !cur) return
          const T = reduce ? 20 : (performance.now() - t0) / 1000
          sm.x = lerp(sm.x, u.mx, 0.08); sm.y = lerp(sm.y, u.my, 0.08)
          u.mi = lerp(u.mi, finePointer && !reduce ? u.miT : 0, 0.05)
          u.mode = reduce ? modeRef.current : lerp(u.mode, modeRef.current, 0.035)
          u.dark = lerp(u.dark, u.darkTarget, 0.06)
          for (const key of ['bg', 'c1', 'c2', 'c3'] as const) cur[key] = cur[key].map((v, i) => lerp(v, target[key][i], 0.06))
          gl.uniform2f(U.R, canvas.width, canvas.height); gl.uniform1f(U.T, T)
          gl.uniform2f(U.M, sm.x * SCALE, (innerHeight - sm.y) * SCALE); gl.uniform1f(U.MI, u.mi)
          gl.uniform3fv(U.BG, cur.bg); gl.uniform3fv(U.C1, cur.c1); gl.uniform3fv(U.C2, cur.c2); gl.uniform3fv(U.C3, cur.c3)
          gl.uniform1f(U.MODE, u.mode); gl.uniform1f(U.DARK, u.dark)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
        }
        gsap.ticker.add(tick)
        cleanups.push(() => {
          gsap.ticker.remove(tick); observer.disconnect()
          removeEventListener('resize', size); removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave)
          sky.classList.remove('gl')
        })
      } catch (error) {
        console.warn('aurora fallback', error)
      }
    }
    return () => cleanups.forEach((run) => run())
  }, [])

  return <div className="sky" ref={skyRef} aria-hidden="true">
    <canvas className="aurora" ref={canvasRef} />
    <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
    <div className="dots" />
    <div className="spot" />
  </div>
}

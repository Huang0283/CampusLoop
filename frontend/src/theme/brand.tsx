/* eslint-disable react-refresh/only-export-components -- Brand assets and their lookup tables live together. */
import type { CSSProperties } from 'react'
import { spriteMarkup, tagMarkup } from './spriteMarkup'

export type GlyphName = 'book' | 'calc' | 'pencil' | 'laptop' | 'headphones' | 'phone' | 'camera' | 'mug' | 'bulb' | 'umbrella' | 'bike' | 'ball' | 'racket' | 'sneaker' | 'backpack' | 'shirt' | 'gift'

/** Category colour + representative glyph. Keys match the backend category values in display.ts. */
export const categoryMeta: Record<string, { color: string; glyph: GlyphName }> = {
  BOOKS: { color: 'var(--cat-BOOKS)', glyph: 'book' },
  DIGITAL: { color: 'var(--cat-DIGITAL)', glyph: 'laptop' },
  DAILY: { color: 'var(--cat-DAILY)', glyph: 'mug' },
  SPORTS: { color: 'var(--cat-SPORTS)', glyph: 'bike' },
  clothing: { color: 'var(--cat-clothing)', glyph: 'sneaker' },
  other: { color: 'var(--cat-other)', glyph: 'gift' },
}
export const categoryOf = (category?: string) => categoryMeta[category ?? ''] ?? categoryMeta.other

/** Mounted once at the app root; everything else references these ids with <use>. */
export function SpriteDefs() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false"><defs dangerouslySetInnerHTML={{ __html: spriteMarkup }} /></svg>
}

export function Logo({ size = 30, className = '' }: { size?: number; className?: string }) {
  return <svg className={`cl-logo ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href="#logo" /></svg>
}

export function Glyph({ name, size, className = '', style }: { name: GlyphName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg className={`cl-glyph ${className}`} width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true" focusable="false"><use href={`#g-${name}`} /></svg>
}

/** Glyph hung on a second-hand price tag (the 「逛逛市场」 style). */
export function PriceTag({ glyph, color, className = '', style }: { glyph: GlyphName; color: string; className?: string; style?: CSSProperties }) {
  return <span className={`cl-tag ${className}`} style={{ ...style, ['--ic' as string]: color }} aria-hidden="true">
    <svg className="cl-tag-shape" viewBox="0 0 40 48" dangerouslySetInnerHTML={{ __html: tagMarkup }} />
    <Glyph name={glyph} className="cl-tag-glyph" />
  </span>
}

import type { Product } from '../sdk/generated/types.gen'

const STORAGE_KEY = 'campusloop:phase2:managed-products'

export const seedManagedProducts = [
  {
    id: 20001,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '戴尔 27 英寸显示器',
    category: '数码',
    condition: '九成新',
    description: '2K 分辨率，显示正常，无明显坏点。',
    originalPrice: 1899,
    price: 899,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/monitor/128/128'],
    status: 'ON_SALE',
    createdAt: '2026-09-28T10:00:00+08:00',
    updatedAt: '2026-09-28T10:00:00+08:00',
  },
  {
    id: 20002,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '高等数学教材',
    category: '书籍',
    condition: '八成新',
    description: '有少量笔记，页面完整。',
    originalPrice: 78,
    price: 35,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/textbook/128/128'],
    status: 'RESERVED',
    createdAt: '2026-09-25T09:30:00+08:00',
    updatedAt: '2026-09-28T14:00:00+08:00',
  },
  {
    id: 20003,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '宿舍收纳架',
    category: '宿舍',
    condition: '九成新',
    description: '结构稳固，配件齐全。',
    originalPrice: 69,
    price: 28,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/shelf/128/128'],
    status: 'SOLD',
    createdAt: '2026-09-20T12:00:00+08:00',
    updatedAt: '2026-09-27T16:00:00+08:00',
  },
  {
    id: 20004,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '机械键盘',
    category: '数码',
    condition: '八成新',
    description: '青轴键盘，灯光与按键功能正常。',
    originalPrice: 499,
    price: 220,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/keyboard/128/128'],
    status: 'HIDDEN',
    createdAt: '2026-09-18T15:00:00+08:00',
    updatedAt: '2026-09-24T11:00:00+08:00',
  },
  {
    id: 20005,
    seller: { id: 301, nickname: '我', avatar: 'https://i.pravatar.cc/64?img=41', rating: 4.9, transactionCount: 18 },
    title: '人体工学椅',
    category: '生活用品',
    condition: '八成新',
    description: '升降和后仰功能正常。',
    originalPrice: 999,
    price: 450,
    campusLocation: '清华大学',
    images: ['https://picsum.photos/seed/chair/128/128'],
    status: 'ON_SALE',
    createdAt: '2026-09-29T08:30:00+08:00',
    updatedAt: '2026-09-29T08:30:00+08:00',
  },
] satisfies Product[]

const isProductArray = (value: unknown): value is Product[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const product = item as Partial<Product>
    return typeof product.id === 'number' && typeof product.title === 'string'
  })

export function readManagedProducts(): Product[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return structuredClone(seedManagedProducts)
    const parsed: unknown = JSON.parse(stored)
    return isProductArray(parsed) ? parsed : structuredClone(seedManagedProducts)
  } catch {
    return structuredClone(seedManagedProducts)
  }
}

export function writeManagedProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export function findManagedProduct(productId: number): Product | undefined {
  return readManagedProducts().find((product) => product.id === productId)
}

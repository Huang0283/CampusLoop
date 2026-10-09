import type { Wanted } from '../sdk/generated/types.gen'

const STORAGE_KEY = 'campusloop:phase2:wanted-items'

export const seedWantedItems = [
  {
    id: 30001,
    owner: { id: 1, nickname: '演示学生', avatar: 'https://i.pravatar.cc/64?img=12', rating: 4.9, transactionCount: 18 },
    title: '求购 24-27 英寸显示器',
    description: '用于宿舍学习，希望支持 HDMI，屏幕无明显坏点。',
    budgetMin: 500,
    budgetMax: 1200,
    condition: '八成新',
    location: '清华大学',
    status: 'OPEN',
    expireAt: '2026-11-30T23:59:59+08:00',
    createdAt: '2026-09-29T09:00:00+08:00',
  },
  {
    id: 30002,
    owner: { id: 402, nickname: '王同学', avatar: 'https://i.pravatar.cc/64?img=13', rating: 4.7, transactionCount: 9 },
    title: '求购数据结构与算法教材',
    description: '版本不限，内容完整即可，有少量笔记可以接受。',
    budgetMin: 20,
    budgetMax: 80,
    condition: '七成新',
    location: '北京大学',
    status: 'OPEN',
    expireAt: '2026-11-20T23:59:59+08:00',
    createdAt: '2026-09-28T14:20:00+08:00',
  },
  {
    id: 30003,
    owner: { id: 403, nickname: '赵同学', avatar: 'https://i.pravatar.cc/64?img=14', rating: 4.8, transactionCount: 12 },
    title: '求购校园通勤自行车',
    description: '车况正常，刹车可靠，外观划痕不影响。',
    budgetMin: 200,
    budgetMax: 600,
    condition: '七成新',
    location: '中国人民大学',
    status: 'MATCHED',
    expireAt: '2026-11-15T23:59:59+08:00',
    createdAt: '2026-09-27T11:30:00+08:00',
  },
  {
    id: 30004,
    owner: { id: 1, nickname: '演示学生', avatar: 'https://i.pravatar.cc/64?img=12', rating: 4.9, transactionCount: 18 },
    title: '求购机械键盘',
    description: '优先茶轴或红轴，键帽和灯光正常。',
    budgetMin: 100,
    budgetMax: 350,
    condition: '八成新',
    location: '清华大学',
    status: 'CLOSED',
    expireAt: '2026-10-30T23:59:59+08:00',
    createdAt: '2026-09-25T16:00:00+08:00',
  },
] satisfies Wanted[]

const isWantedArray = (value: unknown): value is Wanted[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const wanted = item as Partial<Wanted>
    return typeof wanted.id === 'number' && typeof wanted.title === 'string'
  })

export function readWantedItems(): Wanted[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return structuredClone(seedWantedItems)
    const parsed: unknown = JSON.parse(stored)
    return isWantedArray(parsed) ? parsed : structuredClone(seedWantedItems)
  } catch {
    return structuredClone(seedWantedItems)
  }
}

export function writeWantedItems(items: Wanted[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function findWantedItem(wantedId: number): Wanted | undefined {
  return readWantedItems().find((item) => item.id === wantedId)
}

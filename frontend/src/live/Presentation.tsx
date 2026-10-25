import { useState, type ReactNode } from 'react'
import { Avatar, Button, Empty, Image, Tag, Typography } from 'antd'
import { CalendarOutlined, EnvironmentOutlined, FileProtectOutlined, FileTextOutlined, InboxOutlined, LeftOutlined, RightOutlined, StarOutlined, SwapOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import type { Product, UserBrief } from '../sdk'
import { categoryLabels, conditionLabels, productStatusLabels, displayDate } from './display'

export function Brand() {
  return <span className="campus-brand"><svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 1 8l11 5L23 8 12 3ZM5 12v5c4 4 10 4 14 0v-5l-7 3-7-3ZM22 11v7h-2v-6l2-1Z" /></svg><strong>CampusLoop</strong></span>
}

export function Person({ person, detail }: { person: UserBrief; detail?: ReactNode }) {
  return <div className="person"><Avatar size={52} src={person.avatar}>{person.nickname.slice(0, 1)}</Avatar><div className="person-copy"><strong>{person.nickname}</strong><div className="muted">{detail ?? `已完成 ${person.transactionCount ?? 0} 次交易 · ${person.rating > 0 ? '评分 ' + person.rating.toFixed(1) : '暂无评价'}`}</div></div></div>
}

export function ProductSummary({ product, children }: { product: Product; children?: ReactNode }) {
  return <div className="product-summary">{product.images[0] ? <img src={product.images[0]} alt={product.title} /> : <div className="product-summary-placeholder"><InboxOutlined /></div>}<div className="product-summary-copy"><Link to={`/product/${product.id}`}>{product.title}</Link><div className="price">¥{product.price.toFixed(2)}</div><Tag color={product.status === 'ON_SALE' ? 'green' : undefined}>{productStatusLabels[product.status]}</Tag>{children}</div></div>
}

export function ProductDetail({ item, actions, feedback }: { item: Product; actions: ReactNode; feedback: ReactNode }) {
  const [image, setImage] = useState(0)
  const current = Math.min(image, Math.max(0, item.images.length - 1))
  const specs = [
    { icon: <InboxOutlined />, label: '分类', value: categoryLabels[item.category] || item.category },
    { icon: <FileProtectOutlined />, label: '商品状态', value: productStatusLabels[item.status] },
    { icon: <CalendarOutlined />, label: '发布时间', value: displayDate(item.createdAt) },
    { icon: <StarOutlined />, label: '卖家评分', value: item.seller.rating > 0 ? item.seller.rating.toFixed(1) : '暂无评价' },
    { icon: <SwapOutlined />, label: '交易次数', value: `${item.seller.transactionCount ?? 0} 次` },
    { icon: <FileProtectOutlined />, label: '成色', value: conditionLabels[item.condition] || item.condition },
  ]
  return <div className="product-detail-grid">
    <div className="product-detail-left">
      <section aria-label="商品图片" className="product-gallery">
        <div className="product-gallery-main">
          {item.images.length ? <Image src={item.images[current]} alt={item.title} /> : <Empty description="暂无商品图片" />}
          {item.images.length > 1 && <><Button aria-label="上一张图片" shape="circle" icon={<LeftOutlined />} onClick={() => setImage((current + item.images.length - 1) % item.images.length)} /><Button aria-label="下一张图片" shape="circle" icon={<RightOutlined />} onClick={() => setImage((current + 1) % item.images.length)} /></>}
          {item.images.length > 0 && <span className="gallery-count">{current + 1} / {item.images.length}</span>}
        </div>
        <div className="product-thumbnails">{item.images.map((url, index) => <button key={`${url}-${index}`} aria-label={`查看第 ${index + 1} 张图片`} aria-pressed={current === index} onClick={() => setImage(index)}><img src={url} alt={`缩略图 ${index + 1}`} /></button>)}</div>
      </section>
      <section className="surface product-description"><h2><FileTextOutlined aria-hidden /> 商品描述</h2><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{item.description || '卖家暂未填写商品描述。'}</Typography.Paragraph></section>
    </div>
    <div className="product-detail-right">
      <h1>{item.title}</h1><div className="product-price-row"><span className="product-price">¥ {item.price.toFixed(2)}</span><Tag color="green">{conditionLabels[item.condition] || item.condition}</Tag></div>
      <div className="muted original-price">原价 {item.originalPrice != null ? <s>¥ {item.originalPrice.toFixed(2)}</s> : '未填写'}</div>
      <div className="product-specs">{specs.map((spec) => <div className="product-spec" key={spec.label}><span className="spec-icon">{spec.icon}</span><div><div className="muted">{spec.label}</div><strong>{spec.value}</strong></div></div>)}</div>
      <section aria-label="卖家信息" className="surface seller-card"><Person person={item.seller} />{feedback}<div className="seller-actions">{actions}</div></section>
      <section className="surface location-card"><h2><EnvironmentOutlined aria-hidden /> 交易地点</h2><div className="location-detail"><span className="location-icon"><EnvironmentOutlined aria-hidden /></span><div><strong>{item.campusLocation || '地点未填写'}</strong><p className="muted">具体时间与交易方式请与卖家协商，见面时当面验货。</p></div></div></section>
    </div>
  </div>
}

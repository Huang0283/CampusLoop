import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Image, Input, InputNumber, Pagination, Row, Select, Space, Tag, Typography } from 'antd'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { Product, ProductWriteRequest, WantedWriteRequest, PriceAdviceRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'
import { ReportButton } from './ReportButton'
import { ImageQueue } from './ImageQueue'
import { useAttemptKey } from './idempotency'

const categories = [{ value: 'BOOKS', label: '图书教材' }, { value: 'DIGITAL', label: '数码电子' }, { value: 'DAILY', label: '生活用品' }, { value: 'SPORTS', label: '运动户外' }, { value: 'clothing', label: '服饰鞋包' }, { value: 'other', label: '其他' }]
const conditions = [{ value: 'NEW', label: '全新' }, { value: 'LIKE_NEW', label: '九成新' }, { value: 'GOOD', label: '八成新' }, { value: 'FAIR', label: '七成新' }]
const searchModeOptions: Array<{ value: 'keyword' | 'hybrid' | 'semantic'; label: string }> = [{ value: 'keyword', label: '关键词' }, { value: 'hybrid', label: '混合' }, { value: 'semantic', label: '语义' }]
const searchModeLabel: Record<'keyword' | 'hybrid' | 'semantic', string> = { keyword: '关键词检索', hybrid: '混合检索', semantic: '语义检索' }
const searchExplanation: Record<api.SearchResult['mode'], string> = { keyword: '当前结果来自关键词检索；分类、成色与排序条件仍然生效。', hybrid: '后端返回混合检索结果；筛选条件仍然生效。', semantic: '后端返回语义检索结果；筛选条件仍然生效。' }
const stateLabel: Record<string, string> = { ON_SALE: '在售', HIDDEN: '已下架', RESERVED: '已预订', SOLD: '已售出' }

function requireStudent(navigate: ReturnType<typeof useNavigate>, from: string) {
  const user = useSession.getState().user
  if (!user) { navigate('/login', { state: { from } }); return false }
  if (user.role !== 'USER') throw new Error('请使用普通用户账号。')
  return true
}

export function ProductCards({ products, from, actions }: { products: Product[]; from?: string; actions?: (product: Product) => React.ReactNode }) {
  return <Row gutter={[16, 16]}>{products.map((product) => <Col key={product.id} xs={24} sm={12} lg={8}>
    <Card cover={<Link to={`/product/${product.id}`} state={{ from }}>{product.images[0] ? <img src={product.images[0]} alt={product.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} /> : <div style={{ height: 180, display: 'grid', placeItems: 'center', background: '#f5f5f5', color: '#595959' }}>暂无商品图片</div>}</Link>}>
      <Link to={`/product/${product.id}`} state={{ from }}>{product.title}</Link>
      <Typography.Title level={4}>¥{product.price.toFixed(2)}</Typography.Title>
      <Space wrap><Tag>{stateLabel[product.status]}</Tag><span>{product.condition}</span><span>{product.campusLocation}</span></Space>
      <div style={{ marginTop: 12 }}>{actions?.(product)}</div>
    </Card>
  </Col>)}</Row>
}

export function CatalogPage({ mode = 'public' }: { mode?: 'public' | 'mine' | 'favorites' }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('query') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const sort = params.get('sort') === 'price_asc' ? 'price_asc' : params.get('sort') === 'price_desc' ? 'price_desc' : 'newest'
  const rawSearchMode = params.get('searchMode')
  const searchMode: 'keyword' | 'hybrid' | 'semantic' = rawSearchMode === 'keyword' || rawSearchMode === 'semantic' ? rawSearchMode : 'hybrid'
  const category = params.get('category') || undefined
  const condition = params.get('condition') || undefined
  // FE4-04 搜索降级：先按所选模式请求，503 且非 keyword 时自动用 keyword 重试一次，仍失败才交给 error 状态。
  const loadCatalog = async (signal: AbortSignal) => {
    if (mode === 'mine') return api.data(api.listMyProducts({ signal, query: { query, page, pageSize: 12 } }))
    if (mode === 'favorites') return api.data(api.listFavorites({ signal, query: { page, pageSize: 12 } }))
    if (!query.trim()) return api.data(api.listProducts({ signal, query: { query, page, pageSize: 12, sort, category, condition } }))
    const runSearch = (searchModeArg: 'keyword' | 'hybrid' | 'semantic') => api.data(api.searchProducts({ signal, query: { query, page, pageSize: 12, sort, category, condition, mode: searchModeArg } }))
    try {
      return await runSearch(searchMode)
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 503 && searchMode !== 'keyword') {
        const fallback = await runSearch('keyword')
        return { ...fallback, degraded: true, degradationReason: `智能搜索暂不可用，已自动改用关键词。${fallback.degradationReason || error.code}` }
      }
      throw error
    }
  }
  const remote = useRemote(`catalog-${mode}-${params.toString()}`, loadCatalog)
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const change = (field: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(field, value); else next.delete(field); if (field !== 'page') next.delete('page'); setParams(next) }
  const searchResult = remote.value && 'mode' in remote.value ? remote.value as api.SearchResult : undefined
  const canRecoverSearch = mode === 'public' && query.trim() && searchMode !== 'keyword' && remote.error instanceof api.ApiError && (remote.error.status === 0 || remote.error.status >= 500)
  return <Page title={mode === 'mine' ? '我的发布' : mode === 'favorites' ? '我的收藏' : '校园市场'} extra={<Button type="primary" onClick={() => { if (requireStudent(navigate, '/publish')) navigate('/publish') }}>发布商品</Button>}>
    <Space wrap style={{ marginBottom: 20 }}><Input.Search aria-label="搜索商品" placeholder="搜索商品关键词" defaultValue={query} onSearch={(value) => change('query', value)} allowClear />
      {mode === 'public' && <><Select aria-label="搜索模式" value={searchMode} options={searchModeOptions} onChange={(value) => change('searchMode', value)} style={{ width: 120 }} />
        <Select aria-label="商品分类" placeholder="全部分类" allowClear style={{ width: 140 }} options={categories} value={params.get('category') || undefined} onChange={(value) => change('category', value || '')} />
        <Select aria-label="商品成色" placeholder="全部成色" allowClear style={{ width: 140 }} options={conditions} value={params.get('condition') || undefined} onChange={(value) => change('condition', value || '')} />
        <Select aria-label="商品排序" value={sort} options={[{ value: 'newest', label: '最新发布' }, { value: 'price_asc', label: '价格从低到高' }, { value: 'price_desc', label: '价格从高到低' }]} onChange={(value) => change('sort', value)} style={{ width: 160 }} /></>}
      <Button onClick={remote.reload}>刷新</Button>
    </Space>
    <Failure error={mutation.error} />
    {canRecoverSearch && <Button style={{ marginBottom: 16 }} onClick={() => change('searchMode', 'keyword')}>改用关键词搜索</Button>}
    <Resource {...remote}>
      {searchResult?.degraded && <Alert type="warning" title="搜索正在使用关键词降级结果" description={searchResult.degradationReason || '智能检索不可用，当前展示关键词结果。'} style={{ marginBottom: 16 }} />}
      {searchResult && <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">当前使用：{searchModeLabel[searchResult.mode]}</Typography.Text>
        <div>结果版本：{searchResult.resultVersion || '后端未提供'}</div>
        <Typography.Paragraph type="secondary">检索说明：{searchExplanation[searchResult.mode]}</Typography.Paragraph>
      </div>}
      {remote.value?.items.length ? <ProductCards products={remote.value.items} from={location.pathname + location.search} actions={mode === 'mine' ? (product) => <Space wrap>
        <Button disabled={['SOLD', 'RESERVED'].includes(product.status)} onClick={() => navigate(`/product/${product.id}/edit`)}>编辑</Button>
        <Button disabled={['SOLD', 'RESERVED'].includes(product.status)} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.updateProductStatus({ path: { productId: product.id }, body: { status: product.status === 'ON_SALE' ? 'HIDDEN' : 'ON_SALE' } }); remote.reload() })}>{product.status === 'ON_SALE' ? '下架' : '上架'}</Button>
        <Button danger disabled={['SOLD', 'RESERVED'].includes(product.status)} onClick={() => void mutation.run(async () => { await api.deleteProduct({ path: { productId: product.id } }); remote.reload() })}>删除</Button>
      </Space> : mode === 'favorites' ? (product) => <Button onClick={() => void mutation.run(async () => { await api.removeFavorite({ path: { productId: product.id } }); remote.reload() })}>取消收藏</Button> : undefined} /> : <NoItems filtered={Boolean(query || params.get('category') || params.get('condition'))} />}
      {remote.value && <Pagination style={{ marginTop: 24 }} current={page} pageSize={12} total={remote.value.pagination.total} showSizeChanger={false} onChange={(value) => change('page', String(value))} />}
    </Resource>
  </Page>
}

export function ProductPage() {
  const { id } = useParams()
  const user = useSession((state) => state.user)
  const remote = useRemote(`product-${id}-${user?.id}`, (signal) => api.data(api.getProduct({ path: { productId: Number(id) }, signal, headers: user ? { Authorization: 'Bearer ' + api.accessToken() } : undefined })))
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/market') ? location.state.from : '/market'
  const item = remote.value
  return <Page title="商品详情" extra={<Link to={from}>返回列表</Link>}><Resource {...remote}>
    {item && <Card><Row gutter={24}><Col xs={24} md={12}><Image.PreviewGroup>{item.images.map((url) => <Image key={url} src={url} width="100%" />)}</Image.PreviewGroup></Col><Col xs={24} md={12}>
      <Typography.Title level={3}>{item.title}</Typography.Title><Typography.Title level={2}>¥{item.price.toFixed(2)}</Typography.Title><Tag>{stateLabel[item.status]}</Tag>
      <Typography.Paragraph>{item.description}</Typography.Paragraph><Typography.Paragraph>卖家：{item.seller.nickname} · {item.campusLocation} · {item.condition}</Typography.Paragraph>
      <Failure error={mutation.error} /><Space wrap>
        <Button onClick={() => void mutation.run(async () => { if (!requireStudent(navigate, location.pathname)) return; await api.addFavorite({ path: { productId: item.id } }) })}>收藏</Button>
        <Button type="primary" disabled={item.status !== 'ON_SALE' || user?.id === item.seller.id} loading={mutation.busy} onClick={() => void mutation.run(async () => {
          if (!requireStudent(navigate, location.pathname)) return
          const session = await api.data(api.createChatSession({ body: { productId: item.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) }))
          navigate(`/chat/${session.id}`)
        })}>联系卖家</Button>
        {user?.id === item.seller.id && <Link to={`/product/${item.id}/edit`}>编辑商品</Link>}
        {user?.role === 'USER' && <ReportButton targetType="PRODUCT" targetId={item.id} />}
      </Space>
    </Col></Row></Card>}
  </Resource></Page>
}

export function ProductFormPage() {
  const { id } = useParams()
  const remote = useRemote(`edit-product-${id}`, (signal) => id ? api.data(api.getProduct({ path: { productId: Number(id) }, headers: { Authorization: 'Bearer ' + api.accessToken() }, signal })) : Promise.resolve(null))
  const [form] = Form.useForm<ProductWriteRequest>()
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const navigate = useNavigate()
  useEffect(() => {
    if (!remote.value) return
    // Read models intentionally retain legacy strings; the write form accepts only
    // the canonical contract values. Unknown legacy values require owner selection.
    const { category, condition, ...fields } = remote.value
    form.setFieldsValue({ ...fields,
      category: categories.some((entry) => entry.value === category) ? category as ProductWriteRequest['category'] : undefined,
      condition: conditions.some((entry) => entry.value === condition) ? condition as ProductWriteRequest['condition'] : undefined,
      campusLocation: fields.campusLocation || '', description: fields.description || '' })
  }, [remote.value, form])
  return <Page title={id ? '编辑商品' : '发布商品'} extra={<Link to="/my-products">我的发布</Link>}><Resource {...remote}><Card>
    <Failure error={mutation.error} />
    <Form form={form} layout="vertical" initialValues={{ images: [], category: 'BOOKS', condition: 'GOOD' }} onFinish={(body) => void mutation.run(async () => {
      const payload = { ...body, originalPrice: body.originalPrice ?? null }
      const result = id ? await api.data(api.updateProduct({ path: { productId: Number(id) }, body: payload })) : await api.data(api.createProduct({ body: payload, headers: api.idempotencyHeaders(attemptKey(payload)) }))
      navigate(`/product/${result.id}`)
    })}>
      <Form.Item name="title" label="商品名称" rules={[{ required: true, whitespace: true, max: 100 }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="images" label="商品图片" rules={[{ type: 'array', required: true, min: 1, max: 5 }]}><ImageQueue onBusyChange={setUploadBlocked} /></Form.Item>
      <Row gutter={16}><Col span={12}><Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={categories} /></Form.Item></Col><Col span={12}><Form.Item name="condition" label="成色" rules={[{ required: true }]}><Select options={conditions} /></Form.Item></Col></Row>
      <Form.Item name="price" label="出售价格（元）" rules={[{ required: true }]}><InputNumber min={0} max={99999999.99} precision={2} /></Form.Item>
      <Form.Item name="originalPrice" label="原价（可选）"><InputNumber min={0} precision={2} /></Form.Item>
      <Form.Item name="campusLocation" label="校内交易地点" rules={[{ required: true, whitespace: true, max: 128 }]}><Input /></Form.Item>
      <Form.Item name="description" label="描述"><Input.TextArea maxLength={3000} rows={4} /></Form.Item>
      <Space><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploadBlocked}>保存商品</Button><Link to="/publish/price-advice">查看规则价格建议</Link></Space>
    </Form>
  </Card></Resource></Page>
}

export function WantedListPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('query') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const remote = useRemote(`wanted-${params.toString()}`, (signal) => api.data(api.listWanted({ query: { query, page, pageSize: 12 }, signal })))
  const user = useSession((state) => state.user)
  const navigate = useNavigate()
  return <Page title="求购广场" extra={<Button type="primary" onClick={() => { if (requireStudent(navigate, '/wanted/publish')) navigate('/wanted/publish') }}>发布求购</Button>}>
    <Input.Search aria-label="搜索求购" placeholder="搜索求购" defaultValue={query} onSearch={(value) => setParams(value ? { query: value } : {})} style={{ maxWidth: 360, marginBottom: 20 }} />
    <Resource {...remote}>{remote.value?.items.length ? remote.value.items.map((item) => <Card key={item.id} style={{ marginBottom: 12 }}>
      <Typography.Title level={4}><Link to={`/wanted/${item.id}`}>{item.title}</Link></Typography.Title>
      <Space wrap><span>预算 ¥{item.budgetMin}–{item.budgetMax}</span><span>{item.owner.nickname}</span><span>{item.location}</span><Tag>{item.status}</Tag>
        {user?.id === item.owner.id && <Link to={`/wanted/${item.id}/matches`}>查看匹配</Link>}
      </Space>
    </Card>) : <NoItems filtered={Boolean(query)} />}
      {remote.value && <Pagination current={page} pageSize={12} total={remote.value.pagination.total} onChange={(next) => setParams({ query, page: String(next) })} showSizeChanger={false} />}
    </Resource>
  </Page>
}

export function WantedDetailPage() {
  const { id } = useParams()
  const user = useSession((state) => state.user)
  const remote = useRemote(`wanted-detail-${id}`, (signal) => api.data(api.getWanted({ path: { wantedId: Number(id) }, signal })))
  const mutation = useMutation()
  const navigate = useNavigate()
  const item = remote.value
  return <Page title="求购详情" extra={<Link to="/wanted">返回广场</Link>}><Resource {...remote}><Failure error={mutation.error} />{item && <Card>
    <Typography.Title level={3}>{item.title}</Typography.Title><Typography.Paragraph>{item.description}</Typography.Paragraph>
    <Typography.Paragraph>预算 ¥{item.budgetMin}–{item.budgetMax} · {item.condition} · {item.location} · 到期 {new Date(item.expireAt).toLocaleString()}</Typography.Paragraph>
    <Tag>{item.status}</Tag><Space wrap>{user?.id === item.owner.id ? <><Link to={`/wanted/${item.id}/matches`}>规则匹配结果</Link><Link to={`/wanted/${item.id}/edit`}>编辑求购</Link>
      <Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => { await api.closeWanted({ path: { wantedId: item.id } }); remote.reload() })}>关闭求购</Button></> : <Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => {
        if (!requireStudent(navigate, `/wanted/${item.id}`)) return
        const session = await api.data(api.createChatSession({ body: { wantedId: item.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) })); navigate(`/chat/${session.id}`)
      })}>联系发布者</Button>}</Space>
  </Card>}</Resource></Page>
}

export function WantedFormPage() {
  const [defaultExpiry] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString())
  const { id } = useParams()
  const remote = useRemote(`wanted-edit-${id}`, (signal) => id ? api.data(api.getWanted({ path: { wantedId: Number(id) }, signal })) : Promise.resolve(null))
  const [form] = Form.useForm<WantedWriteRequest>()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const navigate = useNavigate()
  useEffect(() => { if (remote.value) form.setFieldsValue(remote.value) }, [remote.value, form])
  return <Page title={id ? '编辑求购' : '发布求购'}><Resource {...remote}><Card><Failure error={mutation.error} />
    <Form form={form} layout="vertical" initialValues={{ condition: 'ANY', location: 'ANY', expireAt: defaultExpiry }} onFinish={(body) => void mutation.run(async () => {
      const result = id ? await api.data(api.updateWanted({ path: { wantedId: Number(id) }, body })) : await api.data(api.createWanted({ body, headers: api.idempotencyHeaders(attemptKey(body)) })); navigate(`/wanted/${result.id}`)
    })}>
      <Form.Item name="title" label="想买什么" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
      <Space><Form.Item name="budgetMin" label="最低预算" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item><Form.Item name="budgetMax" label="最高预算" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item></Space>
      <Form.Item name="condition" label="最低成色" rules={[{ required: true }]}><Select options={[{ value: 'ANY', label: '不限成色' }, ...conditions]} /></Form.Item>
      <Form.Item name="location" label="地点（ANY 表示不限）" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="expireAt" label="到期时间" rules={[{ required: true }]} getValueProps={(value: string) => ({ value: value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })} normalize={(value: string) => value ? new Date(value).toISOString() : ''}><Input type="datetime-local" /></Form.Item>
      <Form.Item name="description" label="需求说明"><Input.TextArea maxLength={3000} /></Form.Item>
      <Button htmlType="submit" type="primary" loading={mutation.busy}>保存求购</Button>
    </Form>
  </Card></Resource></Page>
}

export function MatchesPage() {
  const { wantedId } = useParams()
  const remote = useRemote(`matches-${wantedId}`, (signal) => api.data(api.listWantedMatches({ path: { wantedId: Number(wantedId) }, signal })))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  return <Page title="供需匹配结果" extra={<Space><Link to="/notifications">查看匹配通知</Link><Button onClick={remote.reload}>刷新匹配</Button></Space>}><Resource {...remote}>
    {remote.value?.degraded && <Alert type="warning" title="正在使用关键词/规则降级结果" description={remote.value.degradationReason} style={{ marginBottom: 16 }} />}
    {remote.value?.items.length ? <ProductCards products={remote.value.items.map((item) => item.product)} actions={(product) => {
      const match = remote.value?.items.find((item) => item.product.id === product.id)
      const expiresAt = Date.parse(match?.expiresAt || '')
      const expiryKnown = Number.isFinite(expiresAt)
      const isExpired = expiryKnown && expiresAt <= now
      return <>
        <Typography.Paragraph type="secondary">匹配原因：{match?.reasons.join(' · ') || '后端未提供'}<br />相关度：{Math.round((match?.relevanceScore || 0) * 100)}%（不是成交概率）</Typography.Paragraph>
        <div>硬约束：{match?.constraints?.join(' · ') || '后端未提供约束明细'}</div>
        <div>结果版本：{match?.resultVersion || '后端未提供'}</div>
        {expiryKnown ? <div>有效期至：{new Date(expiresAt).toLocaleString()}</div> : <Tag color="warning">有效期未知，请刷新确认</Tag>}
        {isExpired && <><Tag color="warning">已过期</Tag><Typography.Paragraph type="warning">结果仅供历史参考，请刷新匹配确认当前商品。</Typography.Paragraph></>}
      </>
    }} /> : <NoItems />}
  </Resource></Page>
}

export function PricePage() {
  const mutation = useMutation()
  const [result, setResult] = useState<api.PriceAdvice>()
  // Read LOW_CONFIDENCE defensively until M6's updated generated SDK reaches this branch.
  let alertType: 'info' | 'warning' = 'info'
  let alertTitle = ''
  let rangeText = ''
  let bodyRange = false
  if (result) {
    const hasRange = result.method !== 'unavailable' && result.lower != null && result.upper != null && Number.isFinite(result.lower) && Number.isFinite(result.upper) && result.lower >= 0 && result.upper >= result.lower
    const source = result.method === 'model' ? '模型' : '规则'
    rangeText = hasRange ? `${source}参考区间：¥${result.lower}–¥${result.upper}` : ''
    if (result.status === 'UNAVAILABLE' || result.method === 'unavailable') {
      alertType = 'warning'
      alertTitle = '暂不可用，请手动定价'
    } else if (result.status === 'INSUFFICIENT_DATA') {
      alertType = 'warning'
      bodyRange = hasRange && result.method === 'rule'
      alertTitle = bodyRange ? '样本不足，以下为规则区间参考' : '样本不足，请手动定价'
    } else if (String(result.status) === 'LOW_CONFIDENCE') {
      alertType = 'warning'
      alertTitle = hasRange ? '置信度较低，请结合实际情况手动定价' : '置信度较低，暂无法给出区间，请手动定价'
      bodyRange = hasRange
    } else {
      alertType = !hasRange || result.degraded ? 'warning' : 'info'
      alertTitle = hasRange ? rangeText : '数据不足或服务不可用，请手动定价。'
    }
  }
  return <Page title="价格建议"><Card><Failure error={mutation.error} />
    {mutation.error != null && !result && <Alert type="warning" title="价格建议获取失败，请重试或手动定价。" style={{ marginBottom: 16 }} />}
    <Form layout="vertical" disabled={mutation.busy} initialValues={{ category: 'BOOKS', condition: 'GOOD' }} onValuesChange={() => setResult(undefined)} onFinish={(body: PriceAdviceRequest) => void mutation.run(async () => {
      setResult(undefined)
      setResult(await api.data(api.getPriceAdvice({ body })))
    })}>
      <Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={categories} /></Form.Item>
      <Form.Item name="condition" label="成色" rules={[{ required: true }]}><Select options={conditions} /></Form.Item>
      <Form.Item name="originalPrice" label="原价（元）" rules={[{ type: 'number', min: 0.01, max: 99999999.99 }]}><InputNumber min={0.01} max={99999999.99} precision={2} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.busy}>计算区间</Button>
    </Form>
    {result && <Alert style={{ marginTop: 20 }} type={alertType} title={alertTitle} description={<>
      {bodyRange && <div>{rangeText}</div>}
      {result.sampleSize != null && <div>基于 {result.sampleSize} 个样本</div>}
      {result.degraded && <div>已降级：{result.degradationReason || '智能服务不可用，当前仅供参考。'}</div>}
      {!result.degraded && result.degradationReason && <div>{result.degradationReason}</div>}
      <div>影响因素：{result.factors.join(' · ') || '后端未提供'}</div>
      <div>{result.disclaimer || '仅供参考，不保证成交价，请自主协商。'}</div>
      <small>结果版本：{result.resultVersion || '后端未提供'}</small>
    </>} />}
  </Card></Page>
}

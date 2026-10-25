import { useEffect, useState } from 'react'
import { Alert, Avatar, Breadcrumb, Button, Card, Col, Form, Input, InputNumber, message, Pagination, Row, Select, Space, Tag, Typography } from 'antd'
import { HeartFilled, HeartOutlined, MessageFilled, EnvironmentOutlined, ClockCircleOutlined, FileTextOutlined, InboxOutlined, RobotOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { Product, ProductWriteRequest, WantedWriteRequest, PriceAdviceRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'
import { ReportButton } from './ReportButton'
import { ImageQueue } from './ImageQueue'
import { useAttemptKey } from './idempotency'
import { ProductDetail, Person } from './Presentation'
import { categoryLabels, conditionLabels, wantedStatusLabels, displayDate } from './display'

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
  return <Row gutter={[24, 24]}>{products.map((product) => <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
    <Card className="catalog-card" hoverable style={{ height: '100%', borderRadius: 12, overflow: 'hidden' }} styles={{ body: { padding: 16 } }} cover={<Link to={`/product/${product.id}`} state={{ from }}>{product.images[0] ? <img src={product.images[0]} alt={product.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 180, display: 'grid', placeItems: 'center', background: '#f5f5f5', color: '#595959' }}>暂无商品图片</div>}</Link>}>
      <Link to={`/product/${product.id}`} state={{ from }} style={{ display: 'block', color: 'inherit', fontSize: 15, fontWeight: 600 }}>{product.title}</Link>
      <Typography.Title level={4} style={{ color: '#1677ff', margin: '8px 0' }}>¥{product.price.toFixed(2)}</Typography.Title>
      <Space wrap><Tag color={product.status === 'ON_SALE' ? 'green' : undefined}>{stateLabel[product.status]}</Tag><span>{conditions.find((entry) => entry.value === product.condition)?.label || product.condition}</span></Space>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>{product.campusLocation || '地点未填写'}</Typography.Paragraph>
      <div className="catalog-seller"><Avatar size={24} src={product.seller.avatar}>{product.seller.nickname.slice(0, 1)}</Avatar><span>{product.seller.nickname}</span></div>
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
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => {
    if (remote.error instanceof api.ApiError && remote.error.status === 0) void messageApi.error('网络异常，请检查网络后重试')
  }, [remote.error, messageApi])
  return <><Page title={mode === 'mine' ? '我的发布' : mode === 'favorites' ? '我的收藏' : '校园市场'} subtitle={mode === 'public' ? '让闲置流转，让校园生活更轻松' : mode === 'mine' ? '管理你发布的商品与在售状态' : '收藏喜欢的校园好物'} extra={<Button type="primary" size="large" onClick={() => { if (requireStudent(navigate, '/publish')) navigate('/publish') }}>发布商品</Button>}>
    <div className="surface catalog-filters">
    {mode === 'public' && <Space wrap aria-label="商品分类快捷筛选" style={{ marginBottom: 20 }}>
      {[{ value: '', label: '全部' }, ...categories].map((entry) => <Button key={entry.value} shape="round" type={(category || '') === entry.value ? 'primary' : 'default'} aria-pressed={(category || '') === entry.value} onClick={() => change('category', entry.value)}>{entry.label}</Button>)}
    </Space>}
    <Space wrap style={{ marginBottom: 20 }}><Input.Search aria-label="搜索商品" placeholder="搜索商品关键词" defaultValue={query} onSearch={(value) => change('query', value)} allowClear maxLength={200} />
      {mode === 'public' && <><Select aria-label="搜索模式" value={searchMode} options={searchModeOptions} onChange={(value) => change('searchMode', value)} style={{ width: 120 }} />
        <Select aria-label="商品分类" placeholder="全部分类" allowClear style={{ width: 140 }} options={categories} value={params.get('category') || undefined} onChange={(value) => change('category', value || '')} />
        <Select aria-label="商品成色" placeholder="全部成色" allowClear style={{ width: 140 }} options={conditions} value={params.get('condition') || undefined} onChange={(value) => change('condition', value || '')} />
        <Select aria-label="商品排序" value={sort} options={[{ value: 'newest', label: '最新发布' }, { value: 'price_asc', label: '价格从低到高' }, { value: 'price_desc', label: '价格从高到低' }]} onChange={(value) => change('sort', value)} style={{ width: 160 }} /></>}
      <Button onClick={remote.reload}>刷新</Button>
    </Space>
    </div>
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
  </Page>{contextHolder}</>
}

export function ProductPage() {
  const { id } = useParams()
  const user = useSession((state) => state.user)
  const remote = useRemote(`product-${id}-${user?.id}`, (signal) => api.data(api.getProduct({ path: { productId: Number(id) }, signal, headers: user ? { Authorization: 'Bearer ' + api.accessToken() } : undefined })))
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const [savedFavorite, setSavedFavorite] = useState<{ key: string; value: boolean }>()
  const favoriteKey = `${user?.id}-${id}`
  const favoriteState = useRemote(`product-favorite-${favoriteKey}`, async (signal) => {
    if (user?.role !== 'USER') return false
    // The current contract exposes favorites as a paged list, not a flag on Product.
    for (let page = 1; ; page++) {
      const result = await api.data(api.listFavorites({ query: { page, pageSize: 100 }, signal }))
      if (result.items.some((product) => product.id === Number(id))) return true
      if (!result.items.length || page * 100 >= result.pagination.total) return false
    }
  })
  const favorite = savedFavorite?.key === favoriteKey ? savedFavorite.value : favoriteState.value === true
  const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/market') ? location.state.from : '/market'
  const item = remote.value
  return <div className="campus-page"><Breadcrumb style={{ marginBottom: 20 }} items={[{ title: <Link to={from}>返回列表</Link> }, { title: item ? categoryLabels[item.category] || item.category : '商品' }, { title: '商品详情' }]} /><Resource {...remote}>
    {item && <ProductDetail key={item.id} item={item} feedback={<><Failure error={mutation.error} /><Failure error={favoriteState.error} retry={favoriteState.reload} /></>} actions={<>
        <Button icon={favorite ? <HeartFilled aria-hidden /> : <HeartOutlined aria-hidden />} loading={mutation.busy || (user?.role === 'USER' && favoriteState.loading)} disabled={user?.role === 'USER' && Boolean(favoriteState.error)} onClick={() => void mutation.run(async () => {
          if (!requireStudent(navigate, location.pathname)) return
          if (favorite) await api.removeFavorite({ path: { productId: item.id } })
          else await api.addFavorite({ path: { productId: item.id } })
          setSavedFavorite({ key: favoriteKey, value: !favorite })
        })}>{favorite ? '取消收藏' : '收藏'}</Button>
        <Button type="primary" icon={<MessageFilled aria-hidden />} disabled={item.status !== 'ON_SALE' || user?.id === item.seller.id} loading={mutation.busy} onClick={() => void mutation.run(async () => {
          if (!requireStudent(navigate, location.pathname)) return
          const session = await api.data(api.createChatSession({ body: { productId: item.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) }))
          navigate(`/chat/${session.id}`)
        })}>联系卖家</Button>
        <div className="seller-secondary-actions">{user?.id === item.seller.id && <Link to={`/product/${item.id}/edit`}>编辑商品</Link>}
        {user?.role === 'USER' && <><ReportButton label="举报商品" targetType="PRODUCT" targetId={item.id} /><ReportButton label="举报卖家" targetType="USER" targetId={item.seller.id} /></>}</div>
      </>} />}
  </Resource></div>
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
  return <Page title={id ? '编辑商品' : '发布商品'} subtitle="给闲置一个新去处" extra={<Link to="/my-products">我的发布</Link>}><Resource {...remote}><Card className="form-surface">
    <p className="form-intro">填写商品信息，清楚描述成色和瑕疵，方便同学了解你的好物。</p>
    <Failure error={mutation.error} />
    <Form form={form} layout="vertical" size="large" initialValues={{ images: [], category: 'BOOKS', condition: 'GOOD' }} onFinish={(body) => void mutation.run(async () => {
      const payload = { ...body, originalPrice: body.originalPrice ?? null }
      const result = id ? await api.data(api.updateProduct({ path: { productId: Number(id) }, body: payload })) : await api.data(api.createProduct({ body: payload, headers: api.idempotencyHeaders(attemptKey(payload)) }))
      navigate(`/product/${result.id}`)
    })}>
      <h2 className="form-section-title"><InboxOutlined /> 商品信息</h2>
      <Form.Item name="title" label="商品名称" rules={[{ required: true, whitespace: true, max: 100 }]}><Input maxLength={100} placeholder="清楚写出商品名称、品牌或型号" /></Form.Item>
      <Form.Item name="images" label="商品图片" rules={[{ type: 'array', required: true, min: 1, max: 5 }]}><ImageQueue onBusyChange={setUploadBlocked} /></Form.Item>
      <Row gutter={16}><Col span={12}><Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={categories} /></Form.Item></Col><Col span={12}><Form.Item name="condition" label="成色" rules={[{ required: true }]}><Select options={conditions} /></Form.Item></Col></Row>
      <h2 className="form-section-title">价格与交易</h2>
      <Form.Item name="price" label="出售价格（元）" rules={[{ required: true }]}><InputNumber min={0} max={99999999.99} precision={2} /></Form.Item>
      <Form.Item name="originalPrice" label="原价（可选）" dependencies={['price']} extra="不知道原价可留空；填写时不能低于出售价格。" rules={[({ getFieldValue }) => ({
        validator(_, value) {
          const price = getFieldValue('price')
          return value == null || price == null || value >= price ? Promise.resolve() : Promise.reject(new Error('原价不能低于出售价格；不知道原价时可留空。'))
        },
      })]}><InputNumber min={0} max={99999999.99} precision={2} /></Form.Item>
      <Form.Item name="campusLocation" label="校内交易地点" rules={[{ required: true, whitespace: true, max: 128 }]}><Input /></Form.Item>
      <Form.Item name="description" label="描述"><Input.TextArea maxLength={3000} rows={5} showCount placeholder="使用情况、瑕疵、配件，以及其他希望买家了解的信息" /></Form.Item>
      <div className="form-actions"><Link to="/publish/price-advice">查看规则价格建议</Link><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploadBlocked}>保存商品</Button></div>
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
  return <Page title="求购广场" subtitle="看看同学们正在寻找什么" extra={<Button type="primary" size="large" onClick={() => { if (requireStudent(navigate, '/wanted/publish')) navigate('/wanted/publish') }}>发布求购</Button>}>
    <Input.Search aria-label="搜索求购" placeholder="搜索求购" defaultValue={query} onSearch={(value) => setParams(value ? { query: value } : {})} maxLength={200} style={{ maxWidth: 360, marginBottom: 20 }} />
    <Resource {...remote}>{remote.value?.items.length ? <div className="wanted-grid">{remote.value.items.map((item) => <Card className="wanted-card" key={item.id}>
      <h2><Link to={`/wanted/${item.id}`}>{item.title}</Link> <Tag color={item.status === 'OPEN' ? 'blue' : undefined}>{wantedStatusLabels[item.status]}</Tag></h2>
      <div className="wanted-description">{item.description || '发布者暂未填写补充说明。'}</div>
      <div className="wanted-facts"><span>预算 <strong className="price" style={{ fontSize: 18 }}>¥{item.budgetMin}–{item.budgetMax}</strong></span><span>最低成色：{conditionLabels[item.condition] || item.condition}</span></div>
      <div className="wanted-footer"><Avatar size={28} src={item.owner.avatar}>{item.owner.nickname.slice(0, 1)}</Avatar><span>{item.owner.nickname}</span><span><EnvironmentOutlined /> {item.location === 'ANY' ? '不限地点' : item.location}</span><span><ClockCircleOutlined /> {displayDate(item.createdAt)}</span>
        {user?.id === item.owner.id && <Link to={`/wanted/${item.id}/matches`}>查看匹配</Link>}</div>
    </Card>)}</div> : <NoItems filtered={Boolean(query)} />}
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
  return <Page title="求购详情" extra={<Link to="/wanted">返回广场</Link>}><Resource {...remote}><Failure error={mutation.error} />{item && <div className="detail-columns"><section className="surface">
    <Typography.Title level={3}>{item.title}</Typography.Title><Tag color="blue">{wantedStatusLabels[item.status]}</Tag><p className="muted">发布于 {displayDate(item.createdAt)} · 有效期至 {displayDate(item.expireAt)}</p>
    <h2 style={{ marginTop: 28 }}><FileTextOutlined /> 需求描述</h2><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{item.description || '暂无补充说明。'}</Typography.Paragraph>
    <h2 style={{ marginTop: 28 }}>需求条件</h2><div className="fact-grid"><div className="fact-tile"><span className="muted">预算范围</span><strong>¥{item.budgetMin}–{item.budgetMax}</strong></div><div className="fact-tile"><span className="muted">最低成色</span><strong>{conditionLabels[item.condition] || item.condition}</strong></div><div className="fact-tile"><span className="muted">交易地点</span><strong>{item.location === 'ANY' ? '不限地点' : item.location}</strong></div></div>
    </section><aside className="surface"><Person person={item.owner} /><div className="form-actions">{user?.id === item.owner.id ? <><Link to={`/wanted/${item.id}/matches`}>规则匹配结果</Link><Link to={`/wanted/${item.id}/edit`}>编辑求购</Link>
      <Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => { await api.closeWanted({ path: { wantedId: item.id } }); remote.reload() })}>关闭求购</Button></> : <Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => {
        if (!requireStudent(navigate, `/wanted/${item.id}`)) return
        const session = await api.data(api.createChatSession({ body: { wantedId: item.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) })); navigate(`/chat/${session.id}`)
    })}>联系发布者</Button>}</div></aside></div>}</Resource></Page>
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
  return <Page title={id ? '编辑求购' : '发布求购'} subtitle="告诉同学们你想寻找的好物" extra={<Link to="/wanted">返回求购广场</Link>}><Resource {...remote}><Card className="form-surface"><Failure error={mutation.error} />
    <Form form={form} layout="vertical" size="large" initialValues={{ condition: 'ANY', location: 'ANY', expireAt: defaultExpiry }} onFinish={(body) => void mutation.run(async () => {
      const result = id ? await api.data(api.updateWanted({ path: { wantedId: Number(id) }, body })) : await api.data(api.createWanted({ body, headers: api.idempotencyHeaders(attemptKey(body)) })); navigate(`/wanted/${result.id}`)
    })}>
      <h2 className="form-section-title">求购信息</h2><Form.Item name="title" label="想买什么" rules={[{ required: true, whitespace: true, max: 100 }]}><Input placeholder="写出需要的商品名称或型号" /></Form.Item>
      <Row gutter={20}><Col span={12}><Form.Item name="budgetMin" label="最低预算" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item></Col><Col span={12}><Form.Item name="budgetMax" label="最高预算" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item></Col></Row>
      <Form.Item name="condition" label="最低成色" rules={[{ required: true }]}><Select options={[{ value: 'ANY', label: '不限成色' }, ...conditions]} /></Form.Item>
      <Form.Item name="location" label="地点（ANY 表示不限）" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="expireAt" label="到期时间" rules={[{ required: true }]} getValueProps={(value: string) => ({ value: value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '' })} normalize={(value: string) => value ? new Date(value).toISOString() : ''}><Input type="datetime-local" /></Form.Item>
      <Form.Item name="description" label="需求说明"><Input.TextArea maxLength={3000} /></Form.Item>
      <div className="form-actions"><Link to="/wanted">返回广场</Link><Button htmlType="submit" type="primary" loading={mutation.busy}>保存求购</Button></div>
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
  return <Page title="规则匹配结果" subtitle="结合需求条件寻找候选商品，结果仅供参考" extra={<Space><Link to={`/wanted/${wantedId}`}>返回求购详情</Link><Link to="/notifications">查看匹配通知</Link><Button onClick={remote.reload}>刷新匹配</Button></Space>}><Resource {...remote}>
    {remote.value?.degraded && <Alert type="warning" title="正在使用关键词/规则降级结果" description={remote.value.degradationReason} style={{ marginBottom: 16 }} />}
    {remote.value?.items.length ? <div className="match-results"><ProductCards products={remote.value.items.map((item) => item.product)} actions={(product) => {
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
    }} /></div> : <NoItems />}
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
  return <Page title="价格建议" extra={<Link to="/publish">返回发布</Link>}><Alert type="info" showIcon title="价格建议仅供参考" description="平台不会自动定价。请结合商品实际情况和线下验货结果调整，最终价格由买卖双方协商。" style={{ marginBottom: 24 }} /><div className="price-advice-grid"><Card title={<Space><RobotOutlined />商品信息</Space>}><Failure error={mutation.error} />
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
  </Card><section className="surface"><h2>建议发布区间</h2>{!result && <Typography.Paragraph type="secondary">填写商品信息并计算后，这里会显示实际返回的参考区间与影响因素。</Typography.Paragraph>}
    {result && <div className="price-advice-result"><Alert type={alertType} title={alertTitle} description={<>
      {bodyRange && <div>{rangeText}</div>}
      {result.sampleSize != null && <div>基于 {result.sampleSize} 个样本</div>}
      {result.degraded && <div>已降级：{result.degradationReason || '智能服务不可用，当前仅供参考。'}</div>}
      {!result.degraded && result.degradationReason && <div>{result.degradationReason}</div>}
      <div>影响因素：{result.factors.join(' · ') || '后端未提供'}</div>
      <div>{result.disclaimer || '仅供参考，不保证成交价，请自主协商。'}</div>
      <small>结果版本：{result.resultVersion || '后端未提供'}</small>
    </>} /></div>}<h2 style={{ marginTop: 24 }}>使用建议</h2><Typography.Paragraph type="secondary">如实描述使用情况与瑕疵，结合成色、配件和同类商品调整价格。最终售价由你自主决定。</Typography.Paragraph>
  </section></div></Page>
}

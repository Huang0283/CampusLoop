import { localize, LocalizedText, OriginalText } from '../i18n/Localize'
import { useLanguage, t, dateLocale } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useEffect, useState } from 'react'
import { Alert, Avatar, Breadcrumb, Button, Card, Col, Input, InputNumber, message, Pagination, Row, Segmented, Select, Space, Tag, Typography } from 'antd'
import { Form } from '../i18n/Form'
import { HeartFilled, HeartOutlined, MessageFilled, EnvironmentOutlined, ClockCircleOutlined, FileTextOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, RobotOutlined } from '@ant-design/icons'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { Product, ProductWriteRequest, WantedWriteRequest, PriceAdviceRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { useSession } from './session'
import { ReportButton } from './ReportButton'
import { ImageQueue } from './ImageQueue'
import { useAttemptKey } from './idempotency'
import { ProductDetail, Person } from './Presentation'
import { categoryLabels, conditionLabels, wantedStatusLabels, displayDate, systemText } from './display'
import { Glyph, Logo, PriceTag, categoryOf, type GlyphName } from '../theme/brand'

const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))
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
  useLanguage()
  const navigate = useNavigate()
  return localize(<div className="product-grid">{products.map((product) => {
    const meta = categoryOf(product.category)
    return localize(<article key={product.id} className="product-card catalog-card" style={{ ['--ic' as string]: meta.color }}>
      <Link to={`/product/${product.id}`} state={{ from }} aria-hidden="true" tabIndex={-1}>
        <div className="product-photo">
          {product.images[0] ? <img src={product.images[0]} alt={product.title} loading="lazy" /> : <Glyph name={meta.glyph} />}
          <span className="condition">{conditionLabels[product.condition] || '成色待确认'}</span>
        </div>
      </Link>
      <div className="product-body">
        <h3><Link className="catalog-title" onKeyDown={(event) => { if (event.key === ' ') { event.preventDefault(); navigate(`/product/${product.id}`, { state: { from } }) } }} to={`/product/${product.id}`} state={{ from }} style={{ color: 'inherit' }}>{<CatalogText text={product.title} />}</Link></h3>
        <div className="row"><span className="cl-price catalog-price"><small>¥</small>{product.price.toFixed(2)}</span><span className={`cl-chip${product.status === 'ON_SALE' ? ' is-ok' : ''}`} style={{ marginLeft: 'auto' }}>{stateLabel[product.status]}</span></div>
        <span className="loc"><EnvironmentOutlined />{<CatalogText text={product.campusLocation || '地点未填写'} />}</span>
        <div className="catalog-seller"><Avatar size={22} src={product.seller.avatar}>{<OriginalText>{product.seller.nickname.slice(0, 1)}</OriginalText>}</Avatar><span>{<OriginalText>{product.seller.nickname}</OriginalText>}</span></div>
      </div>
      {actions && <div className="product-actions catalog-actions">{actions(product)}</div>}
    </article>)
  })}</div>)
}

// Real counts only: total on-sale listings and per-category totals from the list endpoint.
function useMarketStats(enabled: boolean) {
  return useRemote(`market-stats-${enabled}`,  async (signal) => {
    if (!enabled) return { total: 0, byCategory: {} as Record<string, number> }
    const count = (category?: string) => api.data(api.listProducts({ signal, query: { page: 1, pageSize: 1, category } })).then((result) => result.pagination.total)
    const [total, ...perCategory] = await Promise.all([count(), ...categories.map((entry) => count(entry.value))])
    return { total, byCategory: Object.fromEntries(categories.map((entry, index) => [entry.value, perCategory[index]])) as Record<string, number> }
  })
}

const SKY_RINGS: Array<[number, number, GlyphName[]]> = [[75, 60, ['book', 'headphones', 'mug']], [125, -90, ['laptop', 'bike', 'sneaker', 'gift', 'calc']], [170, 130, ['camera', 'umbrella', 'ball', 'backpack', 'phone', 'racket']]]
const GLYPH_CATEGORY: Partial<Record<GlyphName, string>> = { book: 'BOOKS', calc: 'BOOKS', pencil: 'STATIONERY', laptop: 'DIGITAL', headphones: 'DIGITAL', camera: 'DIGITAL', phone: 'DIGITAL', mug: 'DAILY', bulb: 'FURNITURE', bed: 'BEDDING', umbrella: 'DAILY', bike: 'TRANSPORT', ball: 'SPORTS', racket: 'SPORTS', sneaker: 'clothing', backpack: 'clothing', shirt: 'clothing', gift: 'other' }

function MarketSky() {
  useLanguage()
  return localize(<div className="market-sky" aria-hidden="true">
    {[150, 250, 340].map((size) => localize(<i key={size} className="ring" style={{ width: size, height: size }} />))}
    <div className="core"><Logo size={76} /></div>
    {SKY_RINGS.flatMap(([radius, seconds, glyphs]) => glyphs.map((glyph, index) => {
      const angle = index / glyphs.length * 360 + radius
      const duration = `${Math.abs(seconds)}s`
      return localize(<div key={glyph} className="spin" style={{ ['--d' as string]: duration, animationDirection: seconds < 0 ? 'reverse' : 'normal', transform: `rotate(${angle}deg)` }}>
        <PriceTag glyph={glyph} color={categoryOf(GLYPH_CATEGORY[glyph]).color} style={{ left: radius, ['--d' as string]: duration, animationDirection: seconds < 0 ? 'normal' : 'reverse', transform: `rotate(${-angle}deg)` }} />
      </div>)
    }))}
  </div>)
}

export function CatalogPage({ mode = 'public' }: { mode?: 'public' | 'mine' | 'favorites' }) {
  useLanguage()
  const [params, setParams] = useSearchParams()
  const query = params.get('query') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const rawSort = params.get('sort')
  const searching = mode === 'public' && Boolean(query.trim())
  const sort = rawSort === 'price_asc' || rawSort === 'price_desc' || rawSort === 'newest' ? rawSort : searching ? 'relevance' : 'newest'
  const rawSearchMode = params.get('searchMode')
  const searchMode: 'keyword' | 'hybrid' | 'semantic' = rawSearchMode === 'hybrid' || rawSearchMode === 'semantic' ? rawSearchMode : 'keyword'
  const category = params.get('category') || undefined
  const condition = params.get('condition') || undefined
  // FE4-04 搜索降级：先按所选模式请求，503 且非 keyword 时自动用 keyword 重试一次，仍失败才交给 error 状态。
  const loadCatalog = async (signal: AbortSignal) => {
    if (mode === 'mine') return api.data(api.listMyProducts({ signal, query: { query, page, pageSize: 12 } }))
    if (mode === 'favorites') return api.data(api.listFavorites({ signal, query: { page, pageSize: 12 } }))
    if (!query.trim()) return api.data(api.listProducts({ signal, query: { query, page, pageSize: 12, sort: sort === 'relevance' ? 'newest' : sort, category, condition } }))
    const runSearch = (searchModeArg: 'keyword' | 'hybrid' | 'semantic') => api.data(api.searchProducts({ signal, query: { query, page, pageSize: 12, sort, category, condition, mode: searchModeArg } }))
    try {
      return await runSearch(searchMode)
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 503 && searchMode !== 'keyword') {
        const fallback = await runSearch('keyword')
        return { ...fallback, degraded: true, degradationReason: '智能搜索暂不可用，已自动改用关键词。' }
      }
      throw error
    }
  }
  const remote = useRemote(`catalog-${mode}-${params.toString()}`, loadCatalog)
  const stats = useMarketStats(mode === 'public')
  const mutation = useMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const change = (field: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(field, value); else next.delete(field); if (field !== 'page') next.delete('page'); setParams(next) }
  const searchResult = remote.value && 'mode' in remote.value ? remote.value as api.SearchResult : undefined
  const canRecoverSearch = mode === 'public' && query.trim() && searchMode !== 'keyword' && remote.error instanceof api.ApiError && (remote.error.status === 0 || remote.error.status >= 500)
  const [messageApi, contextHolder] = message.useMessage()
  useEffect(() => {
    if (remote.error instanceof api.ApiError && remote.error.status === 0) void messageApi.error(<LocalizedText>网络异常，请检查网络后重试</LocalizedText>)
  }, [remote.error, messageApi])
  const publish = localize(<Button type="primary" className="cl-btn-grad" icon={<PlusOutlined aria-hidden />} onClick={() => { if (requireStudent(navigate, '/publish')) navigate('/publish') }}>发布商品</Button>)
  const results = localize(<>
    {contextHolder}
    <Failure error={mutation.error} />
    {canRecoverSearch && <Button style={{ marginBottom: 16 }} onClick={() => change('searchMode', 'keyword')}>改用关键词搜索</Button>}
    <Resource {...remote}>
      {searchResult?.degraded && <Alert type="warning" title="搜索正在使用关键词降级结果" description="智能检索暂不可用，已使用商品名称和简介进行关键词搜索。" style={{ marginBottom: 16 }} />}
      {searchResult && <div className="search-note">
        <div>当前使用：{searchModeLabel[searchResult.mode]}</div>
        <div>搜索范围：商品名称和简介，新发布的商品自动参与搜索。</div>
        <div>检索说明：{searchExplanation[searchResult.mode]}</div>
      </div>}
      {searchResult && !searchResult.items.length && (category || condition) && <Button style={{ marginBottom: 16 }} onClick={() => { const next = new URLSearchParams(params); next.delete('category'); next.delete('condition'); next.delete('page'); setParams(next) }}>清除分类与成色筛选</Button>}
      {remote.value?.items.length ? <ProductCards products={remote.value.items} from={location.pathname + location.search} actions={mode === 'mine' ? (product) => localize(<Space wrap>
        <Button disabled={['SOLD', 'RESERVED'].includes(product.status)} onClick={() => navigate(`/product/${product.id}/edit`)}>编辑</Button>
        <Button disabled={['SOLD', 'RESERVED'].includes(product.status)} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.updateProductStatus({ path: { productId: product.id }, body: { status: product.status === 'ON_SALE' ? 'HIDDEN' : 'ON_SALE' } }); remote.reload() })}>{product.status === 'ON_SALE' ? '下架' : '上架'}</Button>
        <Button danger disabled={['SOLD', 'RESERVED'].includes(product.status)} onClick={() => void mutation.run(async () => { await api.deleteProduct({ path: { productId: product.id } }); remote.reload() })}>删除</Button>
      </Space>) : mode === 'favorites' ? (product) => localize(<Button onClick={() => void mutation.run(async () => { await api.removeFavorite({ path: { productId: product.id } }); remote.reload() })}>取消收藏</Button>) : undefined} /> : <NoItems filtered={Boolean(query || params.get('category') || params.get('condition'))} />}
      {remote.value && <Pagination className="cl-pagination" current={page} pageSize={12} total={remote.value.pagination.total} showSizeChanger={false} hideOnSinglePage={false} onChange={(value) => change('page', String(value))} />}
    </Resource>
  </>)

  if (mode !== 'public') return localize(<Page title={mode === 'mine' ? '我的发布' : '我的收藏'} subtitle={mode === 'mine' ? '管理你发布的商品与在售状态' : '收藏喜欢的校园好物'} extra={publish}>
    {mode === 'mine' && <div style={{ marginBottom: 20, maxWidth: 360 }}><Input.Search maxLength={200} aria-label="搜索商品" placeholder="搜索我的商品" defaultValue={query} onSearch={(value) => change('query', value)} allowClear /></div>}
    {results}
  </Page>)

  const total = remote.value?.pagination.total
  return localize(<div className="campus-page">
    <section className="market-hero">
      <div>
        <h1>每一件闲置，<br />一目了然。</h1>
        <p>图书教材、数码电子、生活用品……按分类、成色和价格挑，不用登录也能逛。</p>
        <div className="market-stats">
          {stats.value && <div><span>在售商品</span><strong>{stats.value.total}</strong></div>}
          <div><span>商品分类</span><strong>{categories.length}</strong></div>
          <div><span>成色分档</span><strong>{conditions.length}</strong></div>
        </div>
      </div>
      <MarketSky />
    </section>
    <div className="market-body">
      <aside className="market-filters cl-card" aria-label="筛选">
        <Input.Search key={query} maxLength={200} aria-label="搜索商品" placeholder="搜索商品名称或简介" defaultValue={query} onSearch={(value) => change('query', value)} allowClear />
        <div><h4>搜索方式</h4><Segmented aria-label="搜索模式" block value={searchMode} options={searchModeOptions} onChange={(value) => change('searchMode', String(value))} /></div>
        <div><h4>分类</h4><div className="cat-list" role="group" aria-label="商品分类">
          {[{ value: '', label: '全部' }, ...categories].map((entry) => {
            const meta = entry.value ? categoryOf(entry.value) : { color: 'var(--g1)', glyph: 'backpack' as GlyphName }
            const count = entry.value ? stats.value?.byCategory[entry.value] : stats.value?.total
            return localize(<button key={entry.value} type="button" aria-pressed={(category || '') === entry.value} style={{ ['--ic' as string]: meta.color }} onClick={() => change('category', entry.value)}>
              <span className="cat-icon"><Glyph name={meta.glyph} /></span>{entry.label}{count !== undefined && <em>{count}</em>}
            </button>)
          })}
        </div></div>
        <div><h4>成色</h4><div className="pill-group" role="group" aria-label="商品成色">
          {[{ value: '', label: '不限' }, ...conditions].map((entry) => localize(<button key={entry.value} type="button" aria-pressed={(condition || '') === entry.value} onClick={() => change('condition', entry.value)}>{entry.label}</button>))}
        </div></div>
        <Button onClick={remote.reload} icon={<ReloadOutlined aria-hidden />}>刷新</Button>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="grid-head">
          <h2>{query ? `“${query}” 的结果` : category ? categories.find((entry) => entry.value === category)?.label : '全部商品'}</h2>
          {total !== undefined && <span className="count">{total} 件</span>}
          <Segmented aria-label="商品排序" value={sort} options={[...(searching ? [{ value: 'relevance', label: '最相关' }] : []), { value: 'newest', label: '最新发布' }, { value: 'price_asc', label: '价格从低到高' }, { value: 'price_desc', label: '价格从高到低' }]} onChange={(value) => change('sort', String(value))} />
          {publish}
        </div>
        {results}
      </div>
    </div>
  </div>)
}

export function ProductPage() {
  useLanguage()
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
  return localize(<div className="campus-page"><Breadcrumb style={{ marginBottom: 20 }} items={[{ title: <Link to={from}>返回列表</Link> }, { title: item ? categoryLabels[item.category] || '其他' : '商品' }, { title: '商品详情' }]} /><Resource {...remote}>
    {item && <ProductDetail key={item.id} item={item} feedback={<><Failure error={mutation.error} /><Failure error={favoriteState.error} retry={favoriteState.reload} /></>} actions={user?.role !== 'ADMIN' && <>
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
        {user?.role === 'USER' && user.id !== item.seller.id && <><ReportButton label="举报商品" targetType="PRODUCT" targetId={item.id} /><ReportButton label="举报卖家" targetType="USER" targetId={item.seller.id} /></>}</div>
      </>} />}
  </Resource></div>)
}

export function ProductFormPage() {
  useLanguage()
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
  return localize(<Page title={id ? '编辑商品' : '发布商品'} subtitle="给闲置一个新去处" extra={<Link to="/my-products">我的发布</Link>}><Resource {...remote}><Card className="form-surface">
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
          return value == null || price == null || value >= price ? Promise.resolve() : Promise.reject(new Error(t('原价不能低于出售价格；不知道原价时可留空。')))
        },
      })]}><InputNumber min={0} max={99999999.99} precision={2} /></Form.Item>
      <Form.Item name="campusLocation" label="校内交易地点" rules={[{ required: true, whitespace: true, max: 128 }]}><Input /></Form.Item>
      <Form.Item name="description" label="描述"><Input.TextArea maxLength={3000} rows={5} showCount placeholder="使用情况、瑕疵、配件，以及其他希望买家了解的信息" /></Form.Item>
      <div className="form-actions"><Link to="/publish/price-advice">查看规则价格建议</Link><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={uploadBlocked}>保存商品</Button></div>
    </Form>
  </Card></Resource></Page>)
}

export function WantedListPage() {
  useLanguage()
  const [params, setParams] = useSearchParams()
  const query = params.get('query') || ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const remote = useRemote(`wanted-${params.toString()}`, (signal) => api.data(api.listWanted({ query: { query, page, pageSize: 12 }, signal })))
  const user = useSession((state) => state.user)
  const navigate = useNavigate()
  // The budget bar is scaled to the largest budget on the current page.
  const scale = Math.max(1, ...(remote.value?.items.map((item) => item.budgetMax) ?? [1]))
  return localize(<Page title="求购广场" subtitle="看看同学们正在找什么，手里有闲置就去帮一把。" extra={<Space wrap>
    <Input.Search maxLength={200} aria-label="搜索求购" placeholder="搜索求购" defaultValue={query} onSearch={(value) => setParams(value ? { query: value } : {})} allowClear style={{ width: 280 }} />
    <Button type="primary" className="cl-btn-grad" icon={<PlusOutlined aria-hidden />} onClick={() => { if (requireStudent(navigate, '/wanted/publish')) navigate('/wanted/publish') }}>发布求购</Button>
  </Space>}>
    <Resource {...remote}>{remote.value?.items.length ? <div className="wanted-grid">{remote.value.items.map((item) => localize(<Card className={`wanted-card${item.status === 'OPEN' ? '' : ' is-closed'}`} key={item.id}>
      <h2 style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}><Link className="wanted-title" onKeyDown={(event) => { if (event.key === ' ') { event.preventDefault(); navigate(`/wanted/${item.id}`) } }} to={`/wanted/${item.id}`}>{<CatalogText text={item.title} />}</Link><span className={`cl-chip${item.status === 'OPEN' ? ' is-ok' : ''}`} style={{ marginLeft: 'auto' }}>{wantedStatusLabels[item.status]}</span></h2>
      <div className="wanted-description">{<CatalogText text={item.description || '发布者暂未填写补充说明。'} />}</div>
      <div className="wanted-budget"><div className="top"><span className="muted">预算</span><span className="cl-price"><small>¥</small>{item.budgetMin}–{item.budgetMax}</span></div>
        <div className="bar" aria-hidden="true"><span style={{ left: `${item.budgetMin / scale * 100}%`, right: `${100 - item.budgetMax / scale * 100}%` }} /></div></div>
      <div className="wanted-footer"><span className="cl-chip" style={{ ['--c' as string]: 'var(--cat-other)' }}>最低成色：{conditionLabels[item.condition] || '成色待确认'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Avatar size={22} src={item.owner.avatar}>{<OriginalText>{item.owner.nickname.slice(0, 1)}</OriginalText>}</Avatar>{<OriginalText>{item.owner.nickname}</OriginalText>}</span>
        <span><EnvironmentOutlined /> {item.location === 'ANY' ? '不限地点' : item.location}</span><span><ClockCircleOutlined /> {displayDate(item.createdAt)}</span>
        {user?.id === item.owner.id ? <Link className="go" to={`/wanted/${item.id}/matches`}>查看匹配</Link> : <Link className="go" to={`/wanted/${item.id}`}>查看详情 →</Link>}</div>
    </Card>))}</div> : <NoItems filtered={Boolean(query)} />}
      {remote.value && <Pagination className="cl-pagination" current={page} pageSize={12} total={remote.value.pagination.total} onChange={(next) => setParams({ query, page: String(next) })} showSizeChanger={false} />}
    </Resource>
  </Page>)
}

export function WantedDetailPage() {
  useLanguage()
  const { id } = useParams()
  const user = useSession((state) => state.user)
  const remote = useRemote(`wanted-detail-${id}`, (signal) => api.data(api.getWanted({ path: { wantedId: Number(id) }, signal })))
  const mutation = useMutation()
  const navigate = useNavigate()
  const item = remote.value
  return localize(<Page title="求购详情" extra={<Link to="/wanted">返回广场</Link>}><Resource {...remote}><Failure error={mutation.error} />{item && <div className="detail-columns"><section className="surface">
    <Typography.Title level={3}>{<CatalogText text={item.title} />}</Typography.Title><Tag color="blue">{wantedStatusLabels[item.status]}</Tag><p className="muted">发布于 {displayDate(item.createdAt)} · 有效期至 {displayDate(item.expireAt)}</p>
    <h2 style={{ marginTop: 28 }}><FileTextOutlined /> 需求描述</h2><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{<CatalogText text={item.description || '暂无补充说明。'} />}</Typography.Paragraph>
    <h2 style={{ marginTop: 28 }}>需求条件</h2><div className="fact-grid"><div className="fact-tile"><span className="muted">预算范围</span><strong>¥{item.budgetMin}–{item.budgetMax}</strong></div><div className="fact-tile"><span className="muted">最低成色</span><strong>{conditionLabels[item.condition] || '成色待确认'}</strong></div><div className="fact-tile"><span className="muted">交易地点</span><strong>{item.location === 'ANY' ? '不限地点' : item.location}</strong></div></div>
    </section><aside className="surface"><Person person={item.owner} /><div className="form-actions">{user?.id === item.owner.id ? <><Link to={`/wanted/${item.id}/matches`}>规则匹配结果</Link><Link to={`/wanted/${item.id}/edit`}>编辑求购</Link>
      <Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => { await api.closeWanted({ path: { wantedId: item.id } }); remote.reload() })}>关闭求购</Button></> : <><Button disabled={item.status !== 'OPEN'} onClick={() => void mutation.run(async () => {
        if (!requireStudent(navigate, `/wanted/${item.id}`)) return
        const session = await api.data(api.createChatSession({ body: { wantedId: item.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) })); navigate(`/chat/${session.id}`)
    })}>联系发布者</Button>{user?.role === 'USER' && user.id !== item.owner.id && <ReportButton label="举报发布者" targetType="USER" targetId={item.owner.id} />}</>}</div></aside></div>}</Resource></Page>)
}

export function WantedFormPage() {
  useLanguage()
  const [defaultExpiry] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString())
  const { id } = useParams()
  const remote = useRemote(`wanted-edit-${id}`, (signal) => id ? api.data(api.getWanted({ path: { wantedId: Number(id) }, signal })) : Promise.resolve(null))
  const [form] = Form.useForm<WantedWriteRequest>()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const navigate = useNavigate()
  useEffect(() => { if (remote.value) form.setFieldsValue(remote.value) }, [remote.value, form])
  return localize(<Page title={id ? '编辑求购' : '发布求购'} subtitle="告诉同学们你想寻找的好物" extra={<Link to="/wanted">返回求购广场</Link>}><Resource {...remote}><Card className="form-surface"><Failure error={mutation.error} />
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
  </Card></Resource></Page>)
}

export function MatchesPage() {
  useLanguage()
  const { wantedId } = useParams()
  const remote = useRemote(`matches-${wantedId}`, (signal) => api.data(api.listWantedMatches({ path: { wantedId: Number(wantedId) }, signal })))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  return localize(<Page title="规则匹配结果" subtitle="结合需求条件寻找候选商品，结果仅供参考" extra={<Space><Link to={`/wanted/${wantedId}`}>返回求购详情</Link><Link to="/notifications">查看匹配通知</Link><Button onClick={remote.reload}>刷新匹配</Button></Space>}><Resource {...remote}>
    {remote.value?.degraded && <Alert type="warning" title="正在使用关键词/规则降级结果" description={systemText(remote.value.degradationReason, '当前使用备用规则，结果仅供参考。')} style={{ marginBottom: 16 }} />}
    {remote.value?.items.length ? <div className="match-results"><ProductCards products={remote.value.items.map((item) => item.product)} actions={(product) => {
      const match = remote.value?.items.find((item) => item.product.id === product.id)
      const expiresAt = Date.parse(match?.expiresAt || '')
      const expiryKnown = Number.isFinite(expiresAt)
      const isExpired = expiryKnown && expiresAt <= now
      return localize(<>
        <Typography.Paragraph type="secondary">匹配原因：{match?.reasons.map((value) => t(systemText(value, '商品内容相关'))).join(' · ') || '后端未提供'}<br />相关度：{Math.round((match?.relevanceScore || 0) * 100)}%（不是成交概率）</Typography.Paragraph>
        <div>硬约束：{match?.constraints?.map((value) => t(systemText(value, '已检查需求条件'))).join(' · ') || '后端未提供约束明细'}</div>
        <div>结果版本：{match?.resultVersion || '后端未提供'}</div>
        {expiryKnown ? <div>有效期至：{new Date(expiresAt).toLocaleString(dateLocale())}</div> : <Tag color="warning">有效期未知，请刷新确认</Tag>}
        {isExpired && <><Tag color="warning">已过期</Tag><Typography.Paragraph type="warning">结果仅供历史参考，请刷新匹配确认当前商品。</Typography.Paragraph></>}
      </>)
    }} /></div> : <NoItems />}
  </Resource></Page>)
}

export function PricePage() {
  useLanguage()
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
      alertTitle = hasRange && result.method === 'rule' ? rangeText : '样本不足，请手动定价'
    } else if (String(result.status) === 'LOW_CONFIDENCE') {
      alertType = 'warning'
      alertTitle = hasRange ? '置信度较低，请结合实际情况手动定价' : '置信度较低，暂无法给出区间，请手动定价'
      bodyRange = hasRange
    } else {
      alertType = !hasRange || result.degraded ? 'warning' : 'info'
      alertTitle = hasRange ? rangeText : '数据不足或服务不可用，请手动定价。'
    }
  }
  return localize(<Page title="价格建议" extra={<Link to="/publish">返回发布</Link>}><Alert type="info" showIcon title="价格建议仅供参考" style={{ marginBottom: 24 }} /><div className="price-advice-grid"><Card title={<Space><RobotOutlined />商品信息</Space>}><Failure error={mutation.error} />
    {mutation.error != null && !result && <Alert type="warning" title="价格建议获取失败，请重试或手动定价。" style={{ marginBottom: 16 }} />}
    <Form layout="vertical" disabled={mutation.busy} initialValues={{ category: 'BOOKS', condition: 'GOOD' }} onValuesChange={() => setResult(undefined)} onFinish={(body: PriceAdviceRequest) => void mutation.run(async () => {
      setResult(undefined)
      setResult(await api.data(api.getPriceAdvice({ body })))
    })}>
      <Form.Item name="category" label="分类" rules={[{ required: true }]}><Select options={categories} /></Form.Item>
      <Form.Item name="condition" label="成色" rules={[{ required: true }]}><Select options={conditions} /></Form.Item>
      <Form.Item name="originalPrice" label="原价（元）" extra="填写购买时的原价，用于按成色估算；不知道原价时，可返回发布页手动定价。" rules={[{ required: true, message: '请先填写商品原价，再计算参考区间。' }, { type: 'number', min: 0.01, max: 99999999.99 }]}><InputNumber aria-label="原价（元）" min={0.01} max={99999999.99} precision={2} placeholder="请输入购买时的原价" style={{ width: '100%' }} /></Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.busy}>计算区间</Button>
    </Form>
  </Card><section className="surface"><h2>建议发布区间</h2>{!result && <Typography.Paragraph type="secondary">填写商品信息后，点击“计算区间”。</Typography.Paragraph>}
    {result && <div className="price-advice-result"><Alert type={alertType} title={alertTitle} description={<>
      {bodyRange && <div>{rangeText}</div>}
      {rangeText && result.status !== 'UNAVAILABLE' && (result.method === 'rule' || (result.method === 'model' && result.status !== 'INSUFFICIENT_DATA')) && <div>{result.method === 'rule' ? '按原价与成色估算，仅供参考。' : '模型估算，仅供参考。'}</div>}
      <details className="price-advice-details"><summary>查看估价依据</summary>
      {result.sampleSize != null && <div>基于 {result.sampleSize} 个样本</div>}
      {result.sampleSize === 0 && result.method === 'rule' && <div>当前没有可用于估价的成交样本，参考区间按原价和成色估算。</div>}
      {result.degraded && <div>已降级：{systemText(result.degradationReason, '智能服务不可用，当前仅供参考。')}</div>}
      {!result.degraded && result.degradationReason && <div>{systemText(result.degradationReason, '当前结果仅供参考。')}</div>}
      <div>影响因素：{result.factors.map((value) => t(systemText(value, '商品基础信息'))).join(' · ') || '后端未提供'}</div>
      <div>{<CatalogText text={result.disclaimer || '仅供参考，不保证成交价，请自主协商。'} />}</div>
      <small>结果版本：{result.resultVersion || '后端未提供'}</small>
      </details>
    </>} /></div>}
  </section></div></Page>)
}

# BP3-04 市场持久化

实现商品发布/多图/详情/列表/作者列表/收藏、编辑、ON_SALE/HIDDEN 切换和软删除。RESERVED/SOLD 只由交易推进，作者不能自行改成交状态。列表校验分页与排序，按活跃作者和可见状态过滤。图片必须是当前作者已上传的 product 元数据引用；真实 JPEG/PNG 解码、5MiB/25MP 限制、重编码去 EXIF，失败清理本次对象。

求购具有预算上下界、最低成色、地点、带时区有效期、作者编辑/关闭；到期不出现在 OPEN 列表，详情明确 EXPIRED。关键词搜索映射真实候选到 M7 回环服务，结构化筛选先于评分，分页/排序/降级与公共 DTO 一致。读取结果前重新检查商品可见性和版本。

测试：test_transaction_api.py、test_live_intelligence.py；页面回归：frontend/tests/live/journey.spec.ts。重建演示图片是真实写入 MinIO 的小型纯色占位，不冒充实物照片。种子仅补缺失行，绝不重置用户数据。


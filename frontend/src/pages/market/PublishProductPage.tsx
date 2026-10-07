import React, { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Input,
  Select,
  Upload,
  Button,
  Form,
  Card,
  Typography,
  Space,
  message,
  Alert,
  Modal,
} from 'antd';
import type { UploadFile } from 'antd';
import type { UploadProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import type { Product } from '../../sdk/generated/types.gen';
import {
  findManagedProduct,
  readManagedProducts,
  writeManagedProducts,
} from '../../mocks/marketManagement';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const PROTOTYPE_IMAGE_LIMIT_MB = 5;

const categoryOptions = [
  { value: 'digital', label: '数码电子' },
  { value: 'books', label: '图书教材' },
  { value: 'life', label: '生活用品' },
  { value: 'clothes', label: '服饰鞋包' },
  { value: 'sports', label: '运动户外' },
  { value: 'others', label: '其他' },
];

const conditionOptions = [
  { value: 'new', label: '全新' },
  { value: 'like-new', label: '几乎全新' },
  { value: 'good', label: '轻微使用痕迹' },
  { value: 'fair', label: '明显使用痕迹' },
];

const locationOptions = [
  { value: 'thu', label: '清华大学' },
  { value: 'pku', label: '北京大学' },
  { value: 'ruc', label: '中国人民大学' },
  { value: 'buaa', label: '北京航空航天大学' },
];

interface ProductFormValues {
  title: string;
  images: string[];
  category: string;
  condition: string;
  originalPrice?: string;
  price: string;
  description: string;
  location: string;
}

interface ProductDraft {
  values: Partial<ProductFormValues>;
  imageUrls: string[];
}

interface PrototypeUploadResponse {
  data: { url: string };
}

const getUploadedUrl = (file: UploadFile) =>
  file.url || (file.response as PrototypeUploadResponse | undefined)?.data.url;

const categoryLabels = new Map(categoryOptions.map((option) => [option.value, option.label]));
const conditionLabels = new Map(conditionOptions.map((option) => [option.value, option.label]));
const locationLabels = new Map(locationOptions.map((option) => [option.value, option.label]));

const categoryValues = new Map(categoryOptions.map((option) => [option.label, option.value]));
const conditionValues = new Map(conditionOptions.map((option) => [option.label, option.value]));
const locationValues = new Map(locationOptions.map((option) => [option.label, option.value]));
categoryValues.set('数码', 'digital');
categoryValues.set('书籍', 'books');
categoryValues.set('宿舍', 'life');
conditionValues.set('九成新', 'like-new');
conditionValues.set('八成新', 'good');
conditionValues.set('七成新', 'fair');

const toFormValues = (product: Product): ProductFormValues => ({
  title: product.title,
  images: product.images,
  category: categoryValues.get(product.category) ?? 'others',
  condition: conditionValues.get(product.condition) ?? 'good',
  originalPrice: product.originalPrice?.toString(),
  price: product.price.toString(),
  description: product.description ?? '',
  location: locationValues.get(product.campusLocation ?? '') ?? 'thu',
});

const toUploadFiles = (urls: string[]): UploadFile[] =>
  urls.map((url, index) => ({
    uid: `saved-${index}-${url}`,
    name: `商品图片-${index + 1}`,
    status: 'done',
    url,
  }));

const PublishProductPage: React.FC = () => {
  const [form] = Form.useForm<ProductFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const isEditMode = Boolean(id) && Number.isInteger(productId) && productId > 0;
  const existingProduct = useMemo(
    () => (isEditMode ? findManagedProduct(productId) : undefined),
    [isEditMode, productId],
  );
  const draftKey = `campusloop:phase2:product-draft:${isEditMode ? productId : 'new'}`;

  useEffect(() => {
    if (isEditMode && !existingProduct) {
      message.error('未找到可编辑的商品');
      navigate('/my-products', { replace: true });
      return;
    }

    let initialValues = existingProduct ? toFormValues(existingProduct) : undefined;
    let initialImages = existingProduct?.images ?? [];
    let restored = false;

    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft) as ProductDraft;
        initialValues = { ...initialValues, ...draft.values } as ProductFormValues;
        initialImages = Array.isArray(draft.imageUrls) ? draft.imageUrls : initialImages;
        restored = true;
      }
    } catch {
      localStorage.removeItem(draftKey);
    }

    const timer = window.setTimeout(() => {
      if (initialValues) form.setFieldsValue(initialValues);
      if (initialImages.length > 0) {
        setFileList(toUploadFiles(initialImages));
        form.setFieldValue('images', initialImages);
      } else {
        setFileList([]);
      }
      setDraftRestored(restored);
      setDirty(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, existingProduct, form, isEditMode, navigate]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty, submitting]);

  const persistDraft = (nextFileList = fileList) => {
    const imageUrls = nextFileList
      .map(getUploadedUrl)
      .filter((url): url is string => Boolean(url));
    const draft: ProductDraft = {
      values: { ...form.getFieldsValue(true), images: imageUrls },
      imageUrls,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      message.warning('浏览器存储空间不足，当前草稿仅保留在页面中');
    }
    setDirty(true);
  };

  // Phase 2 使用确定性的 Mock 图片地址，使上传队列、失败和提交反馈无需后端即可验收。
  const handleImageUpload: UploadProps['customRequest'] = async ({
    file,
    onError,
    onSuccess,
  }) => {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    if (typeof file === 'string') {
      const error = new Error('图片文件无效');
      onError?.(error);
      message.error(error.message);
      return;
    }
    if (sessionStorage.getItem('productMockUploadError') === 'true') {
      const error = new Error('Mock 图片上传失败，请移除失败项后重试');
      onError?.(error);
      message.error(error.message);
      return;
    }

    const fileName = file instanceof File ? file.name : 'prototype-image';
    const seed = encodeURIComponent(`${fileName}-${file.size}`);
    onSuccess?.({ data: { url: `https://picsum.photos/seed/${seed}/400/300` } });
    message.success('图片已加入原型上传队列');
  };

  const handleImageChange: UploadProps['onChange'] = ({ fileList: newList }) => {
    setFileList(newList);
    const imageUrls = newList
      .map(getUploadedUrl)
      .filter((url): url is string => Boolean(url));
    form.setFieldValue('images', imageUrls);
    persistDraft(newList);
  };

  const validateImage: UploadProps['beforeUpload'] = (file) => {
    const isSupported = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isSupported) message.error('只支持 JPG、PNG 格式的图片');
    const isWithinPrototypeLimit = file.size / 1024 / 1024 <= PROTOTYPE_IMAGE_LIMIT_MB;
    if (isSupported && !isWithinPrototypeLimit) {
      message.error(`原型图片不能超过 ${PROTOTYPE_IMAGE_LIMIT_MB} MB`);
    }
    return (isSupported && isWithinPrototypeLimit) || Upload.LIST_IGNORE;
  };

  // Phase 2 将商品写入统一 Mock 数据层；Phase 3 再由 SDK 替换这一条持久化边界。
  const handleFinish = async (values: ProductFormValues) => {
    if (submitting) return;
    const imageUrls = fileList
      .map(getUploadedUrl)
      .filter((url): url is string => Boolean(url));

    if (fileList.some((file) => file.status === 'uploading')) {
      message.error('图片仍在上传，请稍后再提交');
      return;
    }
    if (imageUrls.length === 0) {
      message.error('请至少成功上传一张商品图片');
      return;
    }

    setSubmitting(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      if (sessionStorage.getItem('productMockSubmitError') === 'true') {
        throw new Error('Mock 商品提交失败，请保留草稿后重试');
      }

      const now = new Date().toISOString();
      const products = readManagedProducts();
      const product: Product = {
        id: existingProduct?.id ?? Date.now(),
        seller: existingProduct?.seller ?? {
          id: 301,
          nickname: '我',
          avatar: 'https://i.pravatar.cc/64?img=41',
          rating: 4.9,
          transactionCount: 18,
        },
        title: values.title.trim(),
        category: categoryLabels.get(values.category) ?? values.category,
        condition: conditionLabels.get(values.condition) ?? values.condition,
        description: values.description.trim(),
        originalPrice: values.originalPrice ? Number(values.originalPrice) : undefined,
        price: Number(values.price),
        campusLocation: locationLabels.get(values.location) ?? values.location,
        images: imageUrls,
        status: existingProduct?.status ?? 'ON_SALE',
        createdAt: existingProduct?.createdAt ?? now,
        updatedAt: now,
      };
      const next = existingProduct
        ? products.map((item) => (item.id === existingProduct.id ? product : item))
        : [product, ...products];
      writeManagedProducts(next);
      localStorage.removeItem(draftKey);
      setDirty(false);
      setDraftRestored(false);
      message.success(isEditMode ? '商品修改已保存' : '商品发布成功');
      navigate('/my-products');
    } catch (requestError) {
      const errorMessage =
        typeof requestError === 'object' &&
        requestError !== null &&
        'message' in requestError &&
        typeof requestError.message === 'string'
          ? requestError.message
          : '商品提交失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const leavePage = () => {
    if (!dirty) {
      navigate('/my-products');
      return;
    }
    Modal.confirm({
      title: '离开商品表单？',
      content: '当前修改已经保存为本地草稿，下次进入本页面可继续填写。',
      okText: '保存草稿并离开',
      cancelText: '继续编辑',
      onOk: () => navigate('/my-products'),
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 220,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 220 }} />

        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="搜索校园好物"
          style={{
            maxWidth: 480,
            height: 40,
            borderRadius: 20,
            background: '#f5f6fa',
          }}
        />

        <Space size={20} style={{ width: 220, justifyContent: 'flex-end' }}>
          <NotificationBell />
          <UserMenu />
        </Space>
      </Header>

      <Layout style={{ marginTop: 64, background: '#f5f6fa' }}>
        <Sider
          width={220}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            background: '#ffffff',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
          }}
        >
          <AppSidebar />
        </Sider>

        <Content style={{ marginLeft: 220, padding: '24px 40px' }}>
          <Card
            style={{
              maxWidth: 900,
              margin: '0 auto',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            }}
            bodyStyle={{ padding: '32px 40px 40px' }}
          >
            <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
              {isEditMode ? '编辑商品' : '发布商品'}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {isEditMode ? '修改后会立即更新第二阶段 Mock 商品记录' : '填写商品信息，让更多同学看到你的闲置好物'}
            </Text>

            {draftRestored && (
              <Alert
                showIcon
                type="info"
                message="已恢复上次保存的本地草稿"
                style={{ marginTop: 20 }}
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      localStorage.removeItem(draftKey);
                      setDraftRestored(false);
                      if (existingProduct) {
                        const values = toFormValues(existingProduct);
                        form.setFieldsValue(values);
                        setFileList(toUploadFiles(existingProduct.images));
                      } else {
                        form.resetFields();
                        setFileList([]);
                      }
                      setDirty(false);
                    }}
                  >
                    放弃草稿
                  </Button>
                }
              />
            )}

            <Form<ProductFormValues>
              form={form}
              layout="horizontal"
              labelAlign="left"
              onFinish={handleFinish}
              onValuesChange={() => persistDraft()}
              style={{ marginTop: 32 }}
              labelCol={{ flex: '110px' }}
              wrapperCol={{ flex: 1 }}
            >
              <Form.Item
                label="商品名称"
                name="title"
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="请输入商品名称" maxLength={100} />
              </Form.Item>

              <Form.Item
                label="商品图片"
                required
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最多上传 5 张图片，支持 JPG、PNG 格式，原型单张不超过 5 MB
                  </Text>
                }
              >
                <Form.Item
                  name="images"
                  noStyle
                  rules={[{ required: true, message: '请上传商品图片' }]}
                >
                  <Input type="hidden" />
                </Form.Item>
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  maxCount={5}
                  accept=".jpg,.jpeg,.png"
                  beforeUpload={validateImage}
                  customRequest={handleImageUpload}
                  onChange={handleImageChange}
                >
                  {fileList.length < 5 && (
                    <div>
                      <PlusOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
                      <div style={{ marginTop: 4, color: '#8c8c8c' }}>
                        上传图片
                      </div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="商品分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类" options={categoryOptions} />
              </Form.Item>

              <Form.Item
                label="成色"
                name="condition"
                rules={[{ required: true, message: '请选择成色' }]}
              >
                <Select placeholder="请选择成色" options={conditionOptions} />
              </Form.Item>

              <Form.Item label="原价" name="originalPrice">
                <Input
                  prefix="¥"
                  placeholder="请输入原价"
                  inputMode="decimal"
                />
              </Form.Item>

              <Form.Item
                label="售价"
                name="price"
                rules={[
                  { required: true, message: '请输入售价' },
                  {
                    validator: (_, value) =>
                      Number(value) > 0
                        ? Promise.resolve()
                        : Promise.reject(new Error('售价必须大于 0')),
                  },
                ]}
              >
                <Input prefix="¥" placeholder="请输入售价" inputMode="decimal" />
              </Form.Item>

              <Form.Item label="价格参考">
                <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/publish/price-advice')}>
                  查看价格建议
                </Button>
              </Form.Item>

              <Form.Item
                label="商品描述"
                name="description"
                rules={[{ required: true, message: '请填写商品描述' }]}
              >
                <Input.TextArea
                  placeholder="描述商品状态、配件、使用情况"
                  maxLength={500}
                  showCount={{
                    formatter: ({ count, maxLength }) =>
                      `${count}/${maxLength}`,
                  }}
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              <Form.Item
                label="交易地点"
                name="location"
                rules={[{ required: true, message: '请选择校区或地点' }]}
              >
                <Select
                  placeholder="请选择校区或地点"
                  options={locationOptions}
                />
              </Form.Item>

              <Form.Item wrapperCol={{ offset: 0, flex: 1 }} style={{ marginTop: 8 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button size="large" disabled={submitting} onClick={leavePage}>
                    返回我的发布
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={submitting}
                    style={{
                      minWidth: 180,
                      height: 48,
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {isEditMode ? '保存修改' : '发布商品'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PublishProductPage;

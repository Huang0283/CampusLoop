import React, { useState } from 'react';
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
} from 'antd';
import type { UploadFile } from 'antd';
import type { UploadProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { createProduct, uploadImage } from '../../sdk/generated/sdk.gen';
import type { UploadResponse } from '../../sdk/generated/types.gen';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

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
  { value: 'east', label: '东校区' },
  { value: 'west', label: '西校区' },
  { value: 'south', label: '南校区' },
  { value: 'north', label: '北校区' },
  { value: 'library', label: '图书馆' },
  { value: 'gym', label: '体育馆' },
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

const getUploadedUrl = (file: UploadFile) =>
  file.url || (file.response as UploadResponse | undefined)?.data.url;

const PublishProductPage: React.FC = () => {
  const [form] = Form.useForm<ProductFormValues>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // 选择图片后立即上传，并将接口返回的 URL 写入表单。
  const handleImageUpload: UploadProps['customRequest'] = async ({
    file,
    onError,
    onSuccess,
  }) => {
    try {
      if (typeof file === 'string') throw new Error('图片文件无效');

      const response = await uploadImage({
        body: { file },
        auth: () => localStorage.getItem('token') ?? undefined,
        throwOnError: true,
      });
      onSuccess?.(response);
      message.success('图片上传成功');
    } catch (uploadError) {
      const error =
        uploadError instanceof Error ? uploadError : new Error('图片上传失败，请重试');
      onError?.(error);
      message.error(error.message || '图片上传失败，请重试');
    }
  };

  const handleImageChange: UploadProps['onChange'] = ({ fileList: newList }) => {
    setFileList(newList);
    const imageUrls = newList
      .map(getUploadedUrl)
      .filter((url): url is string => Boolean(url));
    form.setFieldValue('images', imageUrls);
  };

  const validateImage: UploadProps['beforeUpload'] = (file) => {
    const isSupported = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isSupported) message.error('只支持 JPG、PNG 格式的图片');
    return isSupported || Upload.LIST_IGNORE;
  };

  // 将表单字段和已上传的图片 URL 提交到真实商品创建接口。
  const handleFinish = async (values: ProductFormValues) => {
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
      await createProduct({
        body: {
          title: values.title.trim(),
          category: values.category,
          condition: values.condition,
          description: values.description,
          originalPrice: values.originalPrice
            ? Number(values.originalPrice)
            : undefined,
          price: Number(values.price),
          campusLocation: values.location,
          images: imageUrls,
        },
        // 每次发布生成唯一幂等键，避免重复点击产生重复商品。
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        auth: () => localStorage.getItem('token') ?? undefined,
        throwOnError: true,
      });

      message.success('商品发布成功');
      navigate('/my-products');
    } catch (requestError) {
      const errorMessage =
        typeof requestError === 'object' &&
        requestError !== null &&
        'message' in requestError &&
        typeof requestError.message === 'string'
          ? requestError.message
          : '商品发布失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
              发布商品
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              填写商品信息，让更多同学看到你的闲置好物
            </Text>

            <Form<ProductFormValues>
              form={form}
              layout="horizontal"
              labelAlign="left"
              onFinish={handleFinish}
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
                    最多上传 5 张图片，支持 JPG、PNG 格式
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
                rules={[{ required: true, message: '请输入售价' }]}
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
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={submitting}
                  style={{
                    height: 48,
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  发布
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PublishProductPage;

import React, { useState } from 'react';
import {
  ConfigProvider,
  Layout,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { createWanted } from '../../sdk/generated/sdk.gen';

const { Header, Sider, Content } = Layout;

const PRIMARY = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER = '#eef0f3';

/** 蓝色学士帽 Logo（自定义 SVG，antd 无此图标） */

/** 表单选项 */
const conditionOptions = [
  { value: '全新', label: '全新' },
  { value: '九成新', label: '九成新' },
  { value: '八成新', label: '八成新' },
  { value: '七成新', label: '七成新' },
  { value: '六成新及以下', label: '六成新及以下' },
];

const locationOptions = [
  { value: '清华大学', label: '清华大学' },
  { value: '北京大学', label: '北京大学' },
  { value: '中国人民大学', label: '中国人民大学' },
  { value: '北京航空航天大学', label: '北京航空航天大学' },
];

interface WantedFormValues {
  title: string;
  minBudget?: number;
  maxBudget?: number;
  condition: string;
  location: string;
  expireDate: dayjs.Dayjs;
}

const PublishWantedPage: React.FC = () => {
  const [form] = Form.useForm<WantedFormValues>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // 将表单字段转换为接口需要的数据，并提交真实的求购信息。
  const handleSubmit = async (values: WantedFormValues) => {
    setSubmitting(true);

    try {
      await createWanted({
        body: {
          title: values.title,
          budgetMin: values.minBudget!,
          budgetMax: values.maxBudget!,
          condition: values.condition,
          location: values.location,
          expireAt: values.expireDate.endOf('day').toISOString(),
        },
        // 每次提交生成唯一幂等键，避免重复点击产生重复求购记录。
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        auth: () => localStorage.getItem('token') ?? undefined,
        throwOnError: true,
      });

      message.success('求购发布成功');
      navigate('/wanted');
    } catch (error) {
      // 优先展示后端返回的错误信息，无法识别时使用统一提示。
      const errorMessage =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : '求购发布失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields();
      console.log('保存草稿：', values);
    } catch (err) {
      console.log('表单校验未通过：', err);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PRIMARY,
          colorText: TEXT_MAIN,
          colorTextSecondary: TEXT_SECONDARY,
          colorBorder: BORDER,
          colorBorderSecondary: BORDER,
          borderRadius: 6,
          fontSize: 14,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        },
        components: {
          Layout: {
            headerBg: CARD_BG,
            siderBg: CARD_BG,
            bodyBg: PAGE_BG,
            headerHeight: 64,
            headerPadding: '0 24px',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#eaf2ff',
            itemSelectedColor: PRIMARY,
            itemColor: TEXT_MAIN,
            itemHoverColor: PRIMARY,
            itemBorderRadius: 8,
          },
          Button: {
            borderRadius: 6,
            controlHeight: 40,
            fontSize: 15,
          },
          Input: {
            borderRadius: 6,
            controlHeight: 40,
          },
          InputNumber: {
            borderRadius: 6,
            controlHeight: 40,
          },
          Select: {
            borderRadius: 6,
            controlHeight: 40,
          },
          DatePicker: {
            borderRadius: 6,
            controlHeight: 40,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', marginLeft: 220 }}>
        {/* 顶部导航栏 */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${BORDER}`,
            padding: '0 32px',
          }}
        >
          {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
          <div style={{ width: 220 }} />

          {/* 中间搜索框 */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Input
              prefix={<SearchOutlined style={{ color: TEXT_SECONDARY, fontSize: 16 }} />}
              placeholder="搜索校园好物"
              style={{
                maxWidth: 720,
                height: 44,
                borderRadius: 8,
                backgroundColor: '#f5f6f8',
                border: '1px solid transparent',
              }}
            />
          </div>

          {/* 右侧用户区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        <Layout>
          {/* 左侧侧边栏 */}
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
              zIndex: 120,
            }}
          >
            <AppSidebar />
          </Sider>

          {/* 主内容区 */}
          <Content style={{ backgroundColor: PAGE_BG, padding: '40px 48px' }}>
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto',
                backgroundColor: CARD_BG,
                borderRadius: 12,
                padding: '40px 48px 32px',
                boxShadow: '0 1px 3px rgba(31, 35, 41, 0.04)',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_MAIN,
                  marginBottom: 32,
                }}
              >
                发布求购
              </h1>

              <Form<WantedFormValues>
                form={form}
                layout="horizontal"
                labelAlign="left"
                labelCol={{ style: { width: 110 } }}
                wrapperCol={{ flex: 1 }}
                initialValues={{
                  title: '',
                  minBudget: 500,
                  maxBudget: 1500,
                  condition: '九成新',
                  location: '清华大学',
                  // 默认有效期设为 30 天后，避免写死日期过期导致接口校验失败。
                  expireDate: dayjs().add(30, 'day'),
                }}
                onFinish={handleSubmit}
                requiredMark={false}
              >
                <Form.Item
                  label="目标商品"
                  name="title"
                  rules={[{ required: true, message: '请输入目标商品' }]}
                  style={{ marginBottom: 28 }}
                >
                  <Input placeholder="求购一台显示器" maxLength={50} />
                </Form.Item>

                <Form.Item
                  label="预算范围"
                  required
                  style={{ marginBottom: 28 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Form.Item
                      name="minBudget"
                      noStyle
                      rules={[{ required: true, message: '请输入最低预算' }]}
                    >
                      <InputNumber
                        style={{ width: 220 }}
                        min={0}
                        precision={0}
                        placeholder="最低预算"
                      />
                    </Form.Item>
                    <span style={{ color: TEXT_SECONDARY, fontSize: 14 }}>至</span>
                    <Form.Item
                      name="maxBudget"
                      noStyle
                      rules={[{ required: true, message: '请输入最高预算' }]}
                    >
                      <InputNumber
                        style={{ width: 220 }}
                        min={0}
                        precision={0}
                        placeholder="最高预算"
                      />
                    </Form.Item>
                  </div>
                </Form.Item>

                <Form.Item
                  label="最低成色"
                  name="condition"
                  rules={[{ required: true, message: '请选择最低成色' }]}
                  style={{ marginBottom: 28 }}
                >
                  <Select options={conditionOptions} />
                </Form.Item>

                <Form.Item
                  label="地点"
                  name="location"
                  rules={[{ required: true, message: '请选择地点' }]}
                  style={{ marginBottom: 28 }}
                >
                  <Select options={locationOptions} />
                </Form.Item>

                <Form.Item
                  label="有效期"
                  name="expireDate"
                  rules={[{ required: true, message: '请选择有效期' }]}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                {/* 底部操作区 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 16,
                    paddingTop: 32,
                    marginTop: 16,
                    borderTop: `1px solid ${BORDER}`,
                  }}
                >
                  <Button size="large" onClick={handleSaveDraft}>
                    保存草稿
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={submitting}
                  >
                    提交求购
                  </Button>
                </div>
              </Form>
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default PublishWantedPage;

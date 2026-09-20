import React from 'react';
import {
  Form,
  Input,
  Select,
  Upload,
  Button,
  Avatar,
  Badge,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  FileSearchOutlined,
  MessageOutlined,
  SwapOutlined,
  BellOutlined,
  DownOutlined,
  PlusOutlined,
  WarningFilled,
  UserOutlined,
} from '@ant-design/icons';

const PRIMARY_COLOR = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const DANGER_COLOR = '#ff4d4f';

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'market', label: '市场', icon: <ShopOutlined /> },
  { key: 'wanted', label: '求购', icon: <FileSearchOutlined /> },
  { key: 'chat', label: '聊天', icon: <MessageOutlined /> },
  { key: 'transaction', label: '交易', icon: <SwapOutlined /> },
];

const reportTypes = ['虚假商品', '描述不符', '垃圾信息', '异常价格', '骚扰'];

interface ReportFormValues {
  reportType: string;
  reportReason: string;
}

const headerStyle: React.CSSProperties = {
  height: 64,
  background: '#ffffff',
  borderBottom: `1px solid ${BORDER_COLOR}`,
  display: 'flex',
  alignItems: 'center',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const sidebarStyle: React.CSSProperties = {
  width: 176,
  flexShrink: 0,
  background: '#ffffff',
  borderRight: `1px solid ${BORDER_COLOR}`,
  padding: '16px 8px',
};

const sidebarItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: 44,
  padding: '0 16px',
  marginBottom: 4,
  borderRadius: 8,
  fontSize: 15,
  color: active ? PRIMARY_COLOR : TEXT_SECONDARY,
  background: active ? 'rgba(47, 107, 255, 0.08)' : 'transparent',
  borderLeft: active ? `3px solid ${PRIMARY_COLOR}` : '3px solid transparent',
  cursor: 'pointer',
  fontWeight: active ? 500 : 400,
});

const ReportPage: React.FC = () => {
  const [form] = Form.useForm<ReportFormValues>();

  const handleFinish = (values: ReportFormValues) => {
    console.log('举报表单提交：', values);
    message.success('举报已提交');
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.jpg,.jpeg,.png',
    beforeUpload: (file) => {
      const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isImage) {
        message.error('只支持 JPG、PNG 格式的图片');
      }
      return false; // 阻止真实上传，仅 mock
    },
    onChange: (info) => {
      if (info.fileList.length > 6) {
        message.warning('最多上传 6 张图片');
        info.fileList = info.fileList.slice(0, 6);
      }
    },
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 顶部导航栏 */}
      <header style={headerStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: 200,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: PRIMARY_COLOR,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 16,
            }}
          >
            <SwapOutlined />
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              letterSpacing: 0.5,
            }}
          >
            CampusLoop
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Input.Search
            placeholder="搜索校园好物"
            style={{ maxWidth: 520, width: '100%' }}
            allowClear
            onSearch={(value) => console.log('搜索：', value)}
          />
        </div>

        <div
          style={{
            width: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 20,
          }}
        >
          <Badge dot offset={[-2, 2]}>
            <BellOutlined style={{ fontSize: 18, color: TEXT_PRIMARY }} />
          </Badge>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Avatar
              size={32}
              style={{ background: PRIMARY_COLOR }}
              icon={<UserOutlined />}
            />
            <span style={{ fontSize: 14, color: TEXT_PRIMARY }}>同学</span>
            <DownOutlined style={{ fontSize: 10, color: TEXT_SECONDARY }} />
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧侧边栏 */}
        <aside style={sidebarStyle}>
          {sidebarItems.map((item) => {
            const active = item.key === 'transaction';
            return (
              <div key={item.key} style={sidebarItemStyle(active)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </aside>

        {/* 主内容区 */}
        <main style={{ flex: 1, padding: '40px 24px' }}>
          <div
            style={{
              maxWidth: 700,
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: 12,
              padding: '40px 48px',
              boxShadow: '0 1px 4px rgba(31, 35, 41, 0.04)',
            }}
          >
            {/* 顶部标题区 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
              <WarningFilled
                style={{ fontSize: 36, color: DANGER_COLOR, marginTop: 2 }}
              />
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    lineHeight: 1.3,
                  }}
                >
                  举报
                </h1>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 14,
                    color: TEXT_SECONDARY,
                  }}
                >
                  安全交易，从认真举报开始
                </p>
              </div>
            </div>

            {/* 表单 */}
            <Form<ReportFormValues>
              form={form}
              layout="vertical"
              requiredMark="optional"
              onFinish={handleFinish}
            >
              <Form.Item
                label={
                  <span style={{ fontSize: 15, fontWeight: 500, color: TEXT_PRIMARY }}>
                    <span style={{ color: DANGER_COLOR, marginRight: 4 }}>*</span>
                    举报类型
                  </span>
                }
                name="reportType"
                rules={[{ required: true, message: '请选择举报类型' }]}
                style={{ marginBottom: 24 }}
              >
                <Select
                  placeholder="请选择举报类型"
                  size="large"
                  options={reportTypes.map((t) => ({ value: t, label: t }))}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ fontSize: 15, fontWeight: 500, color: TEXT_PRIMARY }}>
                    <span style={{ color: DANGER_COLOR, marginRight: 4 }}>*</span>
                    举报原因
                  </span>
                }
                name="reportReason"
                rules={[{ required: true, message: '请详细描述举报原因' }]}
                style={{ marginBottom: 24 }}
              >
                <Input.TextArea
                  placeholder="请详细描述举报原因"
                  rows={4}
                  style={{ minHeight: 100, resize: 'vertical' }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ fontSize: 15, fontWeight: 500, color: TEXT_PRIMARY }}>
                    <span style={{ color: DANGER_COLOR, marginRight: 4 }}>*</span>
                    证据上传
                  </span>
                }
                name="evidence"
                rules={[{ required: true, message: '请上传证据图片' }]}
                style={{ marginBottom: 32 }}
              >
                <Upload.Dragger {...uploadProps} maxCount={6}>
                  <p style={{ margin: '8px 0 0' }}>
                    <PlusOutlined style={{ fontSize: 32, color: TEXT_SECONDARY }} />
                  </p>
                  <p
                    style={{
                      margin: '8px 0 0',
                      fontSize: 15,
                      color: TEXT_PRIMARY,
                    }}
                  >
                    点击或拖拽上传图片
                  </p>
                </Upload.Dragger>
              </Form.Item>

              <p
                style={{
                  margin: '-20px 0 24px',
                  fontSize: 13,
                  color: TEXT_SECONDARY,
                }}
              >
                最多上传 6 张图片，支持 JPG、PNG
              </p>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  style={{
                    height: 46,
                    fontSize: 16,
                    fontWeight: 500,
                    background: PRIMARY_COLOR,
                  }}
                >
                  提交举报
                </Button>
              </Form.Item>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportPage;
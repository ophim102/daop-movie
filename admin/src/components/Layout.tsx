import { useState } from 'react';
import { Layout as AntLayout, Menu, Button, message } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  SettingOutlined,
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

const items = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
  { key: '/banners', icon: <PictureOutlined />, label: <Link to="/banners">Banner</Link> },
  { key: '/slider', icon: <PictureOutlined />, label: <Link to="/slider">Slider</Link> },
  { key: '/preroll', icon: <PlaySquareOutlined />, label: <Link to="/preroll">Pre-roll</Link> },
  { key: '/homepage-sections', icon: <AppstoreOutlined />, label: <Link to="/homepage-sections">Sections</Link> },
  { key: '/server-sources', icon: <CloudServerOutlined />, label: <Link to="/server-sources">Server</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">Cài đặt</Link> },
  { key: '/theme', icon: <SettingOutlined />, label: <Link to="/theme">Theme</Link> },
  { key: '/player-settings', icon: <PlaySquareOutlined />, label: <Link to="/player-settings">Player</Link> },
  { key: '/donate', icon: <DollarOutlined />, label: <Link to="/donate">Donate</Link> },
  { key: '/static-pages', icon: <FileTextOutlined />, label: <Link to="/static-pages">Trang tĩnh</Link> },
  { key: '/audit-logs', icon: <AuditOutlined />, label: <Link to="/audit-logs">Audit</Link> },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const triggerBuild = async () => {
    try {
      const base = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const token = (import.meta as any).env?.VITE_WEBHOOK_BUILD_TOKEN;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${base}/api/trigger-build`, { method: 'POST', headers, body: JSON.stringify({}) });
      const data = await res.json().catch(() => ({ error: await res.text() }));
      if (res.ok && data?.ok) {
        message.success('Đã kích hoạt build. GitHub Actions đang chạy.');
      } else {
        message.error(data?.error || data?.message || `Lỗi ${res.status}`);
      }
    } catch (e: any) {
      message.error(e?.message || 'Không kết nối được API. Kiểm tra URL Admin và env GITHUB_TOKEN, GITHUB_REPO.');
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, color: '#fff', fontWeight: 'bold' }}>DAOP Admin</div>
        <Menu theme="dark" selectedKeys={[location.pathname]} mode="inline" items={items} />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button type="primary" onClick={triggerBuild}>Build website</Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

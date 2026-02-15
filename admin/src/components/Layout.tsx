import { useState } from 'react';
import { Layout as AntLayout, Menu, Button } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  PictureOutlined,
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
  { key: '/homepage-sections', icon: <AppstoreOutlined />, label: <Link to="/homepage-sections">Sections</Link> },
  { key: '/server-sources', icon: <CloudServerOutlined />, label: <Link to="/server-sources">Server</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">Cài đặt</Link> },
  { key: '/donate', icon: <DollarOutlined />, label: <Link to="/donate">Donate</Link> },
  { key: '/static-pages', icon: <FileTextOutlined />, label: <Link to="/static-pages">Trang tĩnh</Link> },
  { key: '/audit-logs', icon: <AuditOutlined />, label: <Link to="/audit-logs">Audit</Link> },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const triggerBuild = () => {
    fetch('/api/trigger-build', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then((r) => r.json())
      .then(console.log)
      .catch(console.error);
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

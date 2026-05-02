import { Layout, Menu, theme } from 'antd';
import { useState } from 'react';

import ApplicationWorkspace from './pages/ApplicationWorkspace';
import Dashboard from './pages/Dashboard';
import GeneratedDocuments from './pages/GeneratedDocuments';
import MasterCvEditor from './pages/MasterCvEditor';
import Settings from './pages/Settings';

const { Content, Sider } = Layout;

const pages = {
  dashboard: <Dashboard />,
  masterCv: <MasterCvEditor />,
  applicationWorkspace: <ApplicationWorkspace />,
  generatedDocuments: <GeneratedDocuments />,
  settings: <Settings />
};

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'masterCv', label: 'Master CV' },
  { key: 'applicationWorkspace', label: 'Application Workspace' },
  { key: 'generatedDocuments', label: 'Generated Documents' },
  { key: 'settings', label: 'Settings' }
];

type PageKey = keyof typeof pages;

export default function App() {
  const [selectedKey, setSelectedKey] = useState<PageKey>('dashboard');
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 600,
            padding: '24px 16px'
          }}
        >
          CV Builder
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key as PageKey)}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 360,
              padding: 24
            }}
          >
            {pages[selectedKey]}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

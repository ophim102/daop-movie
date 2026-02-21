import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Banners from './pages/Banners';
import HomepageSections from './pages/HomepageSections';
import ServerSources from './pages/ServerSources';
import SiteSettings from './pages/SiteSettings';
import DonateSettings from './pages/DonateSettings';
import StaticPages from './pages/StaticPages';
import PrerollAds from './pages/PrerollAds';
import Slider from './pages/Slider';
import ThemeSettings from './pages/ThemeSettings';
import PlayerSettings from './pages/PlayerSettings';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="banners" element={<Banners />} />
          <Route path="slider" element={<Slider />} />
          <Route path="homepage-sections" element={<HomepageSections />} />
          <Route path="server-sources" element={<ServerSources />} />
          <Route path="settings" element={<SiteSettings />} />
          <Route path="theme" element={<ThemeSettings />} />
          <Route path="player-settings" element={<PlayerSettings />} />
          <Route path="donate" element={<DonateSettings />} />
          <Route path="static-pages" element={<StaticPages />} />
          <Route path="preroll" element={<PrerollAds />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

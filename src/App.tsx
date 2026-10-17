import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './hooks/useSession';
import { AppShell } from './components/AppShell';
import { OverviewPage } from './pages/OverviewPage';
import { RiskPage } from './pages/RiskPage';
import { PositionsPage } from './pages/PositionsPage';
import { SystemPage } from './pages/SystemPage';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/risk" element={<RiskPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </SessionProvider>
    </BrowserRouter>
  );
}

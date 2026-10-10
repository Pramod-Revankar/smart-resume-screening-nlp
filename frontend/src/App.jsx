import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import WorkspaceLayout from './layouts/WorkspaceLayout';
import Landing from './pages/Landing';
import { LoadingState } from './components/ui';

const Overview = lazy(() => import('./pages/Overview'));
const NewScreening = lazy(() => import('./pages/NewScreening'));
const Report = lazy(() => import('./pages/Report'));
const Candidates = lazy(() => import('./pages/Candidates'));
const HistoryPage = lazy(() => import('./pages/History'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ModelCard = lazy(() => import('./pages/ModelCard'));
const SettingsPage = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-10"><LoadingState rows={4} /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<WorkspaceLayout />}>
          <Route index element={<Overview />} />
          <Route path="screen" element={<NewScreening />} />
          <Route path="report/:id" element={<Report />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="model" element={<ModelCard />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

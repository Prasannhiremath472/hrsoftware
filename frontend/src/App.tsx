import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '@/routes/ProtectedRoute';
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Route-level code splitting. Login and the app shell load eagerly because they
 * are on the critical path; everything else — especially the onboarding wizard,
 * which pulls in the webcam, canvas and upload code — is fetched on demand.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Coordinators = lazy(() => import('@/pages/Coordinators'));
const Candidates = lazy(() => import('@/pages/Candidates'));
const CandidateRegister = lazy(() => import('@/pages/CandidateRegister'));
const CandidateWizard = lazy(() => import('@/pages/onboarding/CandidateWizard'));
const CandidateSummary = lazy(() => import('@/pages/CandidateSummary'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const AuditLogs = lazy(() => import('@/pages/AuditLogs'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function RouteFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Printable summary renders outside the app chrome. */}
        <Route
          path="/candidates/:id/summary"
          element={
            <ProtectedRoute>
              <CandidateSummary />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/coordinators" element={<Coordinators />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/candidates/new" element={<CandidateRegister />} />
          <Route path="/candidates/:id" element={<CandidateWizard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

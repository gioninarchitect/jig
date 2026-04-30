import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ToastContainer from './components/ToastContainer';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Domain pages
import PlantsPage from './pages/plants/PlantsPage';
import PlantDetailPage from './pages/plants/PlantDetailPage';
import ContainersPage from './pages/containers/ContainersPage';
import ContainerDetailPage from './pages/containers/ContainerDetailPage';
import BatchesPage from './pages/batches/BatchesPage';
import BatchDetailPage from './pages/batches/BatchDetailPage';
import FacilitiesPage from './pages/facilities/FacilitiesPage';
import AuditPage from './pages/audit/AuditPage';
import LabPage from './pages/lab/LabPage';
import CompliancePage from './pages/compliance/CompliancePage';
import SecurityPage from './pages/security/SecurityPage';
import QMSPage from './pages/qms/QMSPage';
import UsersPage from './pages/users/UsersPage';
import BayGridPage from './pages/baygrid/BayGridPage';
import MothersPage from './pages/mothers/MothersPage';
import TicketsPage from './pages/tickets/TicketsPage';
import TasksPage from './pages/tasks/TasksPage';
import AssetsPage from './pages/assets/AssetsPage';
import GrowCalendarPage from './pages/calendar/GrowCalendarPage';
import TrimPage from './pages/trim/TrimPage';
import StrainsPage from './pages/strains/StrainsPage';
import FeedingPage from './pages/feeding/FeedingPage';
import DispatchPage from './pages/dispatch/DispatchPage';
import Facility360Page from './pages/facility360/Facility360Page';
import SiteMasterFilePage from './pages/smf/SiteMasterFilePage';
import KanbanPage from './pages/kanban/KanbanPage';
import ShiftPage from './pages/shift/ShiftPage';
import MortalityPage from './pages/mortality/MortalityPage';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import SOPLibraryPage from './pages/sop-library/SOPLibraryPage';
import HRPage from './pages/hr/HRPage';
import ClientPortal from './pages/client/ClientPortal';
import QASignOffPage from './pages/qa-sign-off/QASignOffPage';
import GMPAuditPage from './pages/gmp-audit/GMPAuditPage';
import ResponsiblePharmacistPage from './pages/responsible-pharmacist/ResponsiblePharmacistPage';
import IPMScoutingPage from './pages/ipm-scouting/IPMScoutingPage';
import DailyCheckPage from './pages/daily-check/DailyCheckPage';
import CleaningSchedulePage from './pages/cleaning-schedule/CleaningSchedulePage';
import ActivityLogPage from './pages/activity-log/ActivityLogPage';
import EnvLogPage from './pages/env-log/EnvLogPage';
import HarvestRequestPage from './pages/harvest-request/HarvestRequestPage';
import AutoLoginPage from './pages/auto-login/AutoLoginPage';

// Scan
import ScanPage from './pages/scan/ScanPage';

// Onboarding
import OnboardingWizard from './pages/onboarding/OnboardingWizard';

// Public
import ProvenancePage from './pages/public/ProvenancePage';

function ProtectedRoute({ children, skipOnboardingCheck }: { children: React.ReactNode; skipOnboardingCheck?: boolean }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function DashRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>;
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  useEffect(() => { loadFromStorage(); }, []);

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/auto-login" element={<AutoLoginPage />} />
        <Route path="/provenance/:batchId" element={<ProvenancePage />} />

        {/* Protected */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashRoute><DashboardPage /></DashRoute>} />
        <Route path="/baygrid" element={<DashRoute><BayGridPage /></DashRoute>} />
        <Route path="/mothers" element={<DashRoute><MothersPage /></DashRoute>} />
        <Route path="/tickets" element={<DashRoute><TicketsPage /></DashRoute>} />
        <Route path="/tasks" element={<DashRoute><TasksPage /></DashRoute>} />
        <Route path="/assets" element={<DashRoute><AssetsPage /></DashRoute>} />
        <Route path="/calendar" element={<DashRoute><GrowCalendarPage /></DashRoute>} />
        <Route path="/trim" element={<DashRoute><TrimPage /></DashRoute>} />
        <Route path="/strains" element={<DashRoute><StrainsPage /></DashRoute>} />
        <Route path="/feeding" element={<DashRoute><FeedingPage /></DashRoute>} />
        <Route path="/dispatch" element={<DashRoute><DispatchPage /></DashRoute>} />
        <Route path="/facility360" element={<DashRoute><Facility360Page /></DashRoute>} />
        <Route path="/site-master-file" element={<DashRoute><SiteMasterFilePage /></DashRoute>} />
        <Route path="/kanban" element={<DashRoute><KanbanPage /></DashRoute>} />
        <Route path="/my-shift" element={<DashRoute><ShiftPage /></DashRoute>} />
        <Route path="/mortality" element={<DashRoute><MortalityPage /></DashRoute>} />
        <Route path="/owner" element={<DashRoute><OwnerDashboard /></DashRoute>} />
        <Route path="/sop-library" element={<DashRoute><SOPLibraryPage /></DashRoute>} />
        <Route path="/hr" element={<DashRoute><HRPage /></DashRoute>} />
        <Route path="/client" element={<DashRoute><ClientPortal /></DashRoute>} />
        <Route path="/scan" element={<DashRoute><ScanPage /></DashRoute>} />
        <Route path="/plants" element={<DashRoute><PlantsPage /></DashRoute>} />
        <Route path="/plants/:id" element={<DashRoute><PlantDetailPage /></DashRoute>} />
        <Route path="/containers" element={<DashRoute><ContainersPage /></DashRoute>} />
        <Route path="/containers/:id" element={<DashRoute><ContainerDetailPage /></DashRoute>} />
        <Route path="/batches" element={<DashRoute><BatchesPage /></DashRoute>} />
        <Route path="/batches/:id" element={<DashRoute><BatchDetailPage /></DashRoute>} />
        <Route path="/facilities" element={<DashRoute><FacilitiesPage /></DashRoute>} />
        <Route path="/audit" element={<DashRoute><AuditPage /></DashRoute>} />
        <Route path="/lab" element={<DashRoute><LabPage /></DashRoute>} />
        <Route path="/compliance" element={<DashRoute><CompliancePage /></DashRoute>} />
        <Route path="/security" element={<DashRoute><SecurityPage /></DashRoute>} />
        <Route path="/qms" element={<DashRoute><QMSPage /></DashRoute>} />
        <Route path="/qa-sign-off" element={<DashRoute><QASignOffPage /></DashRoute>} />
        <Route path="/gmp-audit" element={<DashRoute><GMPAuditPage /></DashRoute>} />
        <Route path="/responsible-pharmacist" element={<DashRoute><ResponsiblePharmacistPage /></DashRoute>} />
        <Route path="/ipm-scouting" element={<DashRoute><IPMScoutingPage /></DashRoute>} />
        <Route path="/daily-check" element={<DashRoute><DailyCheckPage /></DashRoute>} />
        <Route path="/cleaning-schedule" element={<DashRoute><CleaningSchedulePage /></DashRoute>} />
        <Route path="/activity-log" element={<DashRoute><ActivityLogPage /></DashRoute>} />
        <Route path="/env-log" element={<DashRoute><EnvLogPage /></DashRoute>} />
        <Route path="/harvest-request" element={<DashRoute><HarvestRequestPage /></DashRoute>} />
        <Route path="/users" element={<DashRoute><UsersPage /></DashRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

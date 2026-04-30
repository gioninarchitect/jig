import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { Link, Navigate } from 'react-router-dom';
import { Grid3X3, Crown, Scissors, Layers, Package, Leaf, CalendarDays, Kanban, TicketCheck, Building2, Dna, Sprout } from 'lucide-react';

// Widgets
import SetupBannerWidget from './widgets/SetupBannerWidget';
import StatCardsWidget from './widgets/StatCardsWidget';
import BayGridQuickWidget from './widgets/BayGridQuickWidget';
import TicketsWidget from './widgets/TicketsWidget';
import TasksDueWidget from './widgets/TasksDueWidget';
import CloneTraysWidget from './widgets/CloneTraysWidget';
import PhaseChartWidget from './widgets/PhaseChartWidget';
import ActivityFeedWidget from './widgets/ActivityFeedWidget';
import WeightAlertsWidget from './widgets/WeightAlertsWidget';
import RiskGaugesWidget from './widgets/RiskGaugesWidget';
import FacilitiesWidget from './widgets/FacilitiesWidget';
import StaffOverviewWidget from './widgets/StaffOverviewWidget';
import ComplianceSummaryWidget from './widgets/ComplianceSummaryWidget';
import QAInspectionWidget from './widgets/QAInspectionWidget';
import NotificationsWidget from './widgets/NotificationsWidget';
import ForecastWidget from './widgets/ForecastWidget';
import GrowCalendarSnapshot from './widgets/GrowCalendarSnapshot';

// Quick action card for mobile drilldown
function QuickAction({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition active:scale-[0.97] min-h-[72px] justify-center">
      <Icon size={20} className={color} />
      <span className="text-[10px] text-white/40 font-medium">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const { user } = useAuth();

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const role = user?.role || '';

  // Client → Client Portal
  if (hasRole('CLIENT')) return <Navigate to="/client" replace />;
  // Tenant Admin → Owner Dashboard (not Super Admin — they keep full view)
  const isOwner = hasMinLevel(4);
  if (hasRole('TENANT_ADMIN') && !hasRole('SUPER_ADMIN')) return <Navigate to="/owner" replace />;
  const isFM = hasRole('FACILITY_MANAGER');
  const isHeadCult = hasRole('HEAD_OF_CULTIVATION');
  const isProcessingMgr = hasRole('PROCESSING_MANAGER');
  const isQA = hasRole('QA_INSPECTOR');
  const isMaintenance = hasRole('MAINTENANCE_MANAGER');
  const isNursery = hasRole('NURSERY_MANAGER');
  const isGrower = hasRole('CULTIVATOR', 'IRRIGATION_TECH');
  const isProcessing = hasRole('PROCESSING_SUPERVISOR', 'TRIMMER');
  const isLab = hasRole('LAB_TECH');
  const isManager = hasMinLevel(3) && !isOwner;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{greeting}, {firstName}</h1>
        <p className="text-xs text-white/30">{role.replace(/_/g, ' ')} — Origin</p>
      </div>

      <SetupBannerWidget />
      <NotificationsWidget />
      <StatCardsWidget />

      {/* ═══ OWNER / ADMIN — 360 Command Centre ═══ */}
      {isOwner && (
        <>
          {/* Quick actions — production lifecycle drilldown */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            <QuickAction to="/strains" icon={Dna} label="Strain" color="text-purple-400" />
            <QuickAction to="/mothers" icon={Crown} label="Mother" color="text-amber-400" />
            <QuickAction to="/plants" icon={Scissors} label="Clone" color="text-emerald-400" />
            <QuickAction to="/batches" icon={Layers} label="Batch" color="text-blue-400" />
            <QuickAction to="/baygrid" icon={Grid3X3} label="Greenhouse" color="text-green-400" />
            <QuickAction to="/baygrid" icon={Sprout} label="Bay" color="text-green-300" />
            <QuickAction to="/facility360" icon={Building2} label="Facility" color="text-primary" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
          </div>

          <ForecastWidget />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BayGridQuickWidget />
            <StaffOverviewWidget />
            <ComplianceSummaryWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TicketsWidget />
            <TasksDueWidget />
          </div>

          <WeightAlertsWidget />
          <QAInspectionWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhaseChartWidget />
            <ActivityFeedWidget />
          </div>

          <RiskGaugesWidget />
          <FacilitiesWidget />
        </>
      )}

      {/* ═══ FACILITY MANAGER — Operations ═══ */}
      {!isOwner && isFM && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
            <QuickAction to="/strains" icon={Dna} label="Strain" color="text-purple-400" />
            <QuickAction to="/mothers" icon={Crown} label="Mother" color="text-amber-400" />
            <QuickAction to="/plants" icon={Scissors} label="Clone" color="text-emerald-400" />
            <QuickAction to="/batches" icon={Layers} label="Batch" color="text-blue-400" />
            <QuickAction to="/baygrid" icon={Grid3X3} label="Greenhouse" color="text-green-400" />
            <QuickAction to="/baygrid" icon={Sprout} label="Bay" color="text-green-300" />
            <QuickAction to="/calendar" icon={CalendarDays} label="Grow Cal" color="text-amber-300" />
            <QuickAction to="/trim" icon={Scissors} label="Trim" color="text-emerald-300" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
          </div>

          <ForecastWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BayGridQuickWidget />
            <TicketsWidget />
          </div>

          <GrowCalendarSnapshot />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <ComplianceSummaryWidget />
          </div>

          <WeightAlertsWidget />
          <CloneTraysWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhaseChartWidget />
            <ActivityFeedWidget />
          </div>

          <RiskGaugesWidget />
        </>
      )}

      {/* ═══ HEAD OF CULTIVATION — Grow Focus ═══ */}
      {!isOwner && isHeadCult && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            <QuickAction to="/strains" icon={Dna} label="Strain" color="text-purple-400" />
            <QuickAction to="/mothers" icon={Crown} label="Mother" color="text-amber-400" />
            <QuickAction to="/plants" icon={Scissors} label="Clone" color="text-emerald-400" />
            <QuickAction to="/batches" icon={Layers} label="Batch" color="text-blue-400" />
            <QuickAction to="/baygrid" icon={Grid3X3} label="Greenhouse" color="text-green-400" />
            <QuickAction to="/baygrid" icon={Sprout} label="Bay" color="text-green-300" />
            <QuickAction to="/kanban" icon={Kanban} label="Board" color="text-white/40" />
          </div>

          <ForecastWidget />
          <BayGridQuickWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <CloneTraysWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TicketsWidget />
            <PhaseChartWidget />
          </div>

          <WeightAlertsWidget />
          <ActivityFeedWidget />
        </>
      )}

      {/* ═══ NURSERY MANAGER — Clone Room → Rooting → Transplant → Bay ═══ */}
      {!isOwner && isNursery && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            <QuickAction to="/mothers" icon={Crown} label="Mothers" color="text-amber-400" />
            <QuickAction to="/plants" icon={Scissors} label="Clones" color="text-emerald-400" />
            <QuickAction to="/baygrid" icon={Sprout} label="Bay Place" color="text-green-400" />
            <QuickAction to="/mortality" icon={Leaf} label="Mortality" color="text-red-400" />
          </div>

          <CloneTraysWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <ActivityFeedWidget />
        </>
      )}

      {/* ═══ PROCESSING MANAGER — Steps 9-14 ═══ */}
      {!isOwner && isProcessingMgr && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction to="/trim" icon={Scissors} label="Trim" color="text-emerald-400" />
            <QuickAction to="/batches" icon={Layers} label="Batches" color="text-blue-400" />
            <QuickAction to="/kanban" icon={Kanban} label="Board" color="text-blue-400" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <WeightAlertsWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhaseChartWidget />
            <ActivityFeedWidget />
          </div>
        </>
      )}

      {/* ═══ QA INSPECTOR ═══ */}
      {!isOwner && isQA && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QAInspectionWidget />
            <ComplianceSummaryWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <WeightAlertsWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhaseChartWidget />
            <ActivityFeedWidget />
          </div>
        </>
      )}

      {/* ═══ MAINTENANCE MANAGER ═══ */}
      {!isOwner && isMaintenance && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction to="/assets" icon={Package} label="Assets" color="text-amber-400" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
            <QuickAction to="/kanban" icon={Kanban} label="Board" color="text-blue-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TicketsWidget />
            <TasksDueWidget />
          </div>

          <WeightAlertsWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BayGridQuickWidget />
            <ActivityFeedWidget />
          </div>
        </>
      )}

      {/* ═══ CULTIVATOR / GROWER ═══ */}
      {!isOwner && !isManager && (isGrower || isProcessing) && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction to="/my-shift" icon={CalendarDays} label="My Shift" color="text-primary" />
            <QuickAction to="/baygrid" icon={Grid3X3} label="BayGrid" color="text-green-400" />
            <QuickAction to="/mothers" icon={Crown} label="Mothers" color="text-amber-400" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
          </div>

          <ForecastWidget />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BayGridQuickWidget />
            <TasksDueWidget />
          </div>

          <CloneTraysWidget />
          <TicketsWidget />
          <ActivityFeedWidget />
        </>
      )}

      {/* ═══ LAB TECH ═══ */}
      {!isOwner && !isManager && isLab && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhaseChartWidget />
            <ActivityFeedWidget />
          </div>
        </>
      )}

      {/* ═══ EVERYONE ELSE ═══ */}
      {!isOwner && !isManager && !isGrower && !isProcessing && !isLab && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction to="/my-shift" icon={CalendarDays} label="My Shift" color="text-primary" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
            <QuickAction to="/baygrid" icon={Grid3X3} label="BayGrid" color="text-green-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <ActivityFeedWidget />
        </>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

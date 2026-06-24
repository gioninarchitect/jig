import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { roleLabel } from '../../utils/roleLabel';
import { Link, Navigate } from 'react-router-dom';
import { Grid3X3, Crown, Scissors, Layers, Package, Leaf, CalendarDays, Kanban, TicketCheck, Building2, Dna, Sprout, ClipboardCheck, ShieldCheck } from 'lucide-react';

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
import ApprovalsWaitingBanner from '../../components/ApprovalsWaitingBanner';
import BottleneckRadarWidget from './widgets/BottleneckRadarWidget';
import ActionQueueWidget from './widgets/ActionQueueWidget';
import FMHeroStatusBar from '../../components/FMHeroStatusBar';

// Lightweight section divider — bold visual grouping for the FM dashboard.
// Nothing is hidden; we just shepherd the eye through logical zones.
function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-baseline gap-3 border-b border-white/[0.06] pb-1.5">
        <h2 className="text-[11px] tracking-[0.18em] uppercase text-white/45 font-semibold">{label}</h2>
        {hint && <span className="text-[10px] text-white/25">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

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
  const isOwner = hasRole('SUPER_ADMIN', 'TENANT_ADMIN');
  if (hasRole('TENANT_ADMIN') && !hasRole('SUPER_ADMIN')) return <Navigate to="/owner" replace />;
  const isFM = hasRole('FACILITY_MANAGER');
  const isFacilitySupervisor = hasRole('FACILITY_SUPERVISOR');
  const isHeadCult = hasRole('HEAD_OF_CULTIVATION');
  const isProcessingMgr = hasRole('PROCESSING_MANAGER');
  const isRP = hasRole('RESPONSIBLE_PHARMACIST');
  const isGmpPartner = hasRole('GMP_PARTNER');
  const isQA = hasRole('QA_INSPECTOR');
  const isMaintenance = hasRole('MAINTENANCE_MANAGER');
  const isNursery = hasRole('NURSERY_MANAGER');
  const isGrower = hasRole('CULTIVATOR', 'IRRIGATION_TECH');
  const isProcessing = hasRole('PROCESSING_SUPERVISOR', 'TRIMMER');
  const isLab = hasRole('LAB_TECH');
  const isManager = hasMinLevel(3) && !isOwner;
  // Operational (floor) roles get a focused, single-domain dashboard — no facility-wide banners.
  // Cultivation Supervisor (Loraine) is a cultivation-floor role too — cultivation only, no owner banners.
  const isOperational = isNursery || isGrower || isProcessing || isLab || isFacilitySupervisor;

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{greeting}, {firstName}</h1>
        <p className="text-xs text-white/30">{roleLabel(role)} — Origin</p>
      </div>

      {/* Operational roles (NM, cultivator, trimmer, lab) get a CULTIVATION-ONLY dashboard:
          their bell + their own section. Facility-wide banners (setup, approvals queue,
          action queue) are oversight concerns — managers + owners only. */}
      {(isOwner || isFM) && <SetupBannerWidget />}
      <NotificationsWidget />
      {!isOperational && <ApprovalsWaitingBanner />}
      {!isOperational && <ActionQueueWidget />}
      {/* Facility-wide KPIs (Active Plants, Batches, INCB Quota) — managers with a facility
          view only. Operational roles get their own scoped widgets in their section below. */}
      {(isOwner || isFM || isHeadCult || isProcessingMgr) && <StatCardsWidget />}

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

          <BottleneckRadarWidget />

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

      {/* ═══ FACILITY MANAGER — Operations (sectioned) ═══ */}
      {!isOwner && isFM && (
        <>
          {/* Hero — 5-second view: status, criticals, top 3 actions */}
          <FMHeroStatusBar />

          {/* SECTION · Tickets — primary surface, central to the system */}
          <Section label="Tickets" hint="Your operational queue · SLA timers visible">
            <TicketsWidget />
            <BottleneckRadarWidget />
          </Section>

          {/* SECTION · Today — what's happening on the floor right now */}
          <Section label="Today" hint="What needs your hands today">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BayGridQuickWidget />
              <TasksDueWidget />
            </div>
            <GrowCalendarSnapshot />
          </Section>

          {/* SECTION · Compliance — regulator-readiness, drillable */}
          <Section label="Compliance" hint="SAHPRA Section 22C inspection-ready">
            <ComplianceSummaryWidget />
            <WeightAlertsWidget />
          </Section>

          {/* SECTION · Insights — performance + activity, glance level */}
          <Section label="Insights" hint="How the operation is trending">
            <ForecastWidget />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PhaseChartWidget />
              <ActivityFeedWidget />
            </div>
            <RiskGaugesWidget />
          </Section>

          {/* SECTION · Detail — drilldowns / supporting data */}
          <Section label="Detail" hint="Supporting views">
            <CloneTraysWidget />
          </Section>

          {/* SECTION · Quick tools — moved from top to bottom (still 1-tap reach) */}
          <Section label="Quick Tools" hint="Jump to any module">
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
          </Section>
        </>
      )}

      {/* ═══ CULTIVATION SUPERVISOR (Loraine) — cultivation floor only, no owner views ═══ */}
      {!isOwner && isFacilitySupervisor && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction to="/baygrid" icon={Grid3X3} label="BayGrid" color="text-green-400" />
            <QuickAction to="/mothers" icon={Crown} label="Mothers" color="text-amber-400" />
            <QuickAction to="/cloning" icon={Scissors} label="Cloning" color="text-emerald-400" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BayGridQuickWidget />
            <TasksDueWidget />
          </div>

          <CloneTraysWidget />
          <TicketsWidget />
          <ActivityFeedWidget />
        </>
      )}

      {/* ═══ RESPONSIBLE PHARMACIST — Release + SMF/QMS Evidence ═══ */}
      {!isOwner && isRP && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction to="/responsible-pharmacist" icon={ShieldCheck} label="RP" color="text-cyan-400" />
            <QuickAction to="/site-master-file" icon={Building2} label="SMF" color="text-primary" />
            <QuickAction to="/qms" icon={TicketCheck} label="QMS" color="text-amber-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ComplianceSummaryWidget />
            <QAInspectionWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>
        </>
      )}

      {/* ═══ GMP PARTNER — Readiness Evidence + Findings ═══ */}
      {!isOwner && isGmpPartner && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction to="/gmp-audit" icon={ShieldCheck} label="GMP" color="text-cyan-400" />
            <QuickAction to="/site-master-file" icon={Building2} label="SMF" color="text-primary" />
            <QuickAction to="/audit" icon={TicketCheck} label="Audit" color="text-amber-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ComplianceSummaryWidget />
            <TicketsWidget />
          </div>
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
          {/* Plain-language orientation so the QA dashboard explains itself */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-base font-bold text-white">Your QA &amp; Compliance home</h2>
            </div>
            <p className="text-xs sm:text-sm text-white/60 mb-3 leading-relaxed">
              This is your quality system, live. The cards below are your daily view — anything with a number or in red needs you. Your full toolkit is in the <span className="text-primary font-semibold">Compliance</span> menu on the left.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
              {[
                ['QA Inspection', 'Your GMP inspection-readiness — clear the open items'],
                ['Compliance Summary', 'Anomalies, permits, quota & destructions at a glance'],
                ['Checklists Due', 'Forms to fill & sign today — tap one to open'],
                ['Tickets', 'Issues & requests routed to you — action & close'],
                ['Weight Alerts', 'A possible diversion flag — investigate at once'],
                ['Compliance menu →', 'SOP Library · QMS/Deviations · Inspection Readiness'],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-2">
                  <span className="text-primary font-semibold whitespace-nowrap">{t}</span>
                  <span className="text-white/45">— {d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QAInspectionWidget />
            <ComplianceSummaryWidget />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <WeightAlertsWidget />
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
      {!isOwner && isManager && !isFM && !isFacilitySupervisor && !isHeadCult && !isProcessingMgr && !isRP && !isGmpPartner && !isQA && !isMaintenance && !isNursery && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <QuickAction to="/tasks" icon={CalendarDays} label="Tasks" color="text-primary" />
            <QuickAction to="/tickets" icon={TicketCheck} label="Tickets" color="text-red-400" />
            <QuickAction to="/kanban" icon={Kanban} label="Board" color="text-blue-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TasksDueWidget />
            <TicketsWidget />
          </div>

          <ComplianceSummaryWidget />
          <ActivityFeedWidget />
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

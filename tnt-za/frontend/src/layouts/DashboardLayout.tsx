import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRBAC } from '../hooks/useRBAC';
import OfflineIndicator from '../components/OfflineIndicator';
import GhostSwitcher from '../components/GhostSwitcher';
import GhostBanner from '../components/GhostBanner';
import SmartChat from '../components/SmartChat';
import {
  LayoutDashboard, Leaf, Box, Layers, Building2, ScrollText,
  FlaskConical, ShieldCheck, Lock, BookOpen, Users, Bell,
  Menu, X, LogOut, ChevronLeft, Camera, Sparkles, Grid3X3, Crown, TicketCheck, CheckSquare, Package, CalendarDays, Scissors, Dna, Droplets, Truck, Kanban, Skull, Bug, ClipboardCheck, ClipboardList, SprayCan, Thermometer, Eye, Bird } from 'lucide-react';

// Role → which nav groups they see
const ROLE_NAV: Record<string, string[]> = {
  SUPER_ADMIN: ['core', 'management', 'cultivation', 'processing', 'compliance', 'system'],
  TENANT_ADMIN: ['core', 'management', 'cultivation', 'processing', 'compliance', 'system'],
  RESPONSIBLE_PHARMACIST: ['core', 'management', 'processing', 'compliance'],
  GMP_PARTNER: ['core', 'compliance'],
  FACILITY_MANAGER: ['core', 'management', 'cultivation', 'processing', 'compliance', 'system'],
  FACILITY_SUPERVISOR: ['core', 'management', 'cultivation', 'processing', 'compliance'],
  HEAD_OF_CULTIVATION: ['core', 'management', 'cultivation', 'compliance'],
  NURSERY_MANAGER: ['core', 'management', 'cultivation'],
  PROCESSING_MANAGER: ['core', 'management', 'processing', 'compliance'],
  PROCESSING_SUPERVISOR: ['core', 'processing'],
  QA_INSPECTOR: ['core', 'management', 'processing', 'compliance'],
  MAINTENANCE_MANAGER: ['core', 'management', 'system'],
  IT_MANAGER: ['core', 'management', 'system'],
  CULTIVATOR: ['core', 'cultivation'],
  LAB_TECH: ['core', 'processing', 'compliance'],
  IRRIGATION_TECH: ['core', 'cultivation'],
  SECURITY_OFFICER: ['core', 'processing'],
  DELIVERY_DRIVER: ['core', 'processing'],
  TRIMMER: ['core', 'processing'],
  GENERAL_WORKER: ['core', 'cultivation'],
  HOUSEKEEPING: ['core', 'compliance'],
  LAUNDRY: ['core'],
  CLIENT: ['core'],
  VIEWER: ['core', 'cultivation', 'processing', 'compliance'],
};

// Tightly-scoped operational roles see ONLY these paths (intersected with their
// allowed groups + level). Without this, a level-3 Nursery Manager saw the entire
// cultivation suite + Chickens + Facility 360 — everything an FM sees. Owners / FM /
// admins are deliberately absent here, so they keep the full menu.
const ROLE_NAV_ITEMS: Record<string, string[]> = {
  NURSERY_MANAGER: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/baygrid', '/calendar', '/cloning', '/mothers', '/strains', '/plants', '/daily-check', '/env-log', '/activity-log', '/ipm-scouting', '/cleaning-schedule', '/mortality'],
  CULTIVATOR: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/baygrid', '/plants', '/feeding', '/daily-check', '/env-log', '/activity-log', '/ipm-scouting', '/cleaning-schedule', '/mortality'],
  IRRIGATION_TECH: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/feeding', '/env-log', '/daily-check'],
  TRIMMER: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/trim', '/batches'],
  PROCESSING_SUPERVISOR: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/batches', '/containers', '/trim', '/dispatch'],
  GENERAL_WORKER: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/cleaning-schedule', '/daily-check'],
  HOUSEKEEPING: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/cleaning-schedule'],
  SECURITY_OFFICER: ['/my-shift', '/tickets', '/tasks', '/scan', '/dashboard', '/security'],
};

// Grouped nav — 3 core workflows + sections. `roles` (if present) hard-restricts an
// item to those roles regardless of level — used to keep cross-domain tiles (Chickens,
// Facility 360) out of operational roles' menus.
const NAV_GROUPS: { id: string; label: string; minLevel?: number; items: { to: string; label: string; icon: any; minLevel: number; roles?: string[] }[] }[] = [
  {
    id: 'core', label: 'Core',
    items: [
      { to: '/my-shift', label: 'My Shift', icon: CalendarDays, minLevel: 0 },
      { to: '/tickets', label: 'Tickets', icon: TicketCheck, minLevel: 0 },
      { to: '/tasks', label: 'Checklists', icon: CheckSquare, minLevel: 0 },
      { to: '/scan', label: 'Scan & Tag', icon: Camera, minLevel: 1 },
    ],
  },
  {
    id: 'management', label: 'Management', minLevel: 2,
    items: [
      { to: '/owner', label: 'Owner 360', icon: Building2, minLevel: 4 },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minLevel: 0 },
      { to: '/kanban', label: 'Task Board', icon: Kanban, minLevel: 2 },
      { to: '/facility360', label: 'Facility 360', icon: Building2, minLevel: 0, roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER', 'FACILITY_SUPERVISOR', 'HEAD_OF_CULTIVATION'] },
      { to: '/chickens', label: 'Chickens', icon: Bird, minLevel: 0, roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER'] },
    ],
  },
  {
    id: 'cultivation', label: 'Cultivation',
    items: [
      { to: '/baygrid', label: 'BayGrid', icon: Grid3X3, minLevel: 0 },
      { to: '/calendar', label: 'Grow Calendar', icon: CalendarDays, minLevel: 0 },
      { to: '/mothers', label: 'Mothers', icon: Crown, minLevel: 0 },
      { to: '/cloning', label: 'Cloning', icon: Scissors, minLevel: 1 },
      { to: '/strains', label: 'Strains', icon: Dna, minLevel: 0 },
      { to: '/plants', label: 'Plants', icon: Leaf, minLevel: 0 },
      { to: '/feeding', label: 'Feeding', icon: Droplets, minLevel: 2 },
      { to: '/env-log', label: 'Env Log', icon: Thermometer, minLevel: 1 },
      { to: '/daily-check', label: 'Daily Check', icon: ClipboardCheck, minLevel: 1 },
      { to: '/cleaning-schedule', label: 'Cleaning', icon: SprayCan, minLevel: 1 },
      { to: '/activity-log', label: 'Activity Log', icon: ClipboardList, minLevel: 1 },
      { to: '/ipm-scouting', label: 'IPM Scouting', icon: Bug, minLevel: 1 },
      { to: '/mortality', label: 'Mortality', icon: Skull, minLevel: 1 },
      { to: '/harvest-request', label: 'Harvest Request', icon: Scissors, minLevel: 2 },
    ],
  },
  {
    id: 'processing', label: 'Processing',
    items: [
      { to: '/batches', label: 'Batches', icon: Layers, minLevel: 0 },
      { to: '/containers', label: 'Containers', icon: Box, minLevel: 0 },
      { to: '/trim', label: 'Trim Sessions', icon: Scissors, minLevel: 1 },
      { to: '/lab', label: 'Lab & COA', icon: FlaskConical, minLevel: 2 },
      { to: '/dispatch', label: 'Dispatch', icon: Truck, minLevel: 1 },
    ],
  },
  {
    id: 'compliance', label: 'Compliance',
    items: [
      { to: '/sop-library', label: 'SOP Library', icon: BookOpen, minLevel: 0 },
      { to: '/compliance', label: 'Anomalies', icon: ShieldCheck, minLevel: 2 },
      { to: '/qms', label: 'QMS', icon: BookOpen, minLevel: 2 },
      { to: '/qa-sign-off', label: 'QA Sign-Off', icon: ShieldCheck, minLevel: 3 },
      { to: '/gmp-audit', label: 'GMP Audit', icon: ShieldCheck, minLevel: 3 },
      { to: '/responsible-pharmacist', label: 'Pharmacist', icon: ShieldCheck, minLevel: 3 },
      { to: '/audit', label: 'Audit Trail', icon: ScrollText, minLevel: 0 },
      { to: '/audit/ghost', label: 'Ghost Audit', icon: Eye, minLevel: 4 },
      { to: '/site-master-file', label: 'Site Master File', icon: ScrollText, minLevel: 3 },
    ],
  },
  {
    id: 'system', label: 'System', minLevel: 2,
    items: [
      { to: '/assets', label: 'Assets', icon: Package, minLevel: 0 },
      { to: '/hr', label: 'HR & Training', icon: Users, minLevel: 0 },
      { to: '/security', label: 'Security', icon: Lock, minLevel: 1 },
      { to: '/users', label: 'Users', icon: Users, minLevel: 3 },
      { to: '/onboarding', label: 'Setup', icon: Sparkles, minLevel: 2 },
    ],
  },
];

// Bottom nav — 3 core workflows + home
const BOTTOM_NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard, minLevel: 0 },
  { to: '/tickets', label: 'Tickets', icon: TicketCheck, minLevel: 0 },
  { to: '/scan', label: 'Scan', icon: Camera, minLevel: 1 },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, minLevel: 0 },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { hasMinLevel } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const filteredBottom = BOTTOM_NAV.filter((n) => hasMinLevel(n.minLevel));
  const handleLogout = () => { logout(); navigate('/login'); };
  const allowedGroups = ROLE_NAV[user?.role || ''] || ['core'];

  return (
    <div className="min-h-screen bg-dark flex">
      <OfflineIndicator />
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${collapsed ? 'w-16' : 'w-60'} bg-[#0D0D0D] border-r border-white/10 flex flex-col transition-all duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && <span className="text-primary font-bold text-lg tracking-wide">Origin</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-2 text-white/40 hover:text-white"><ChevronLeft size={18} className={collapsed ? 'rotate-180' : ''} /></button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-white/40"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((group) => {
            if (!allowedGroups.includes(group.id)) return null;
            const itemScope = ROLE_NAV_ITEMS[user?.role || ''];
            const visibleItems = group.items.filter(n =>
              hasMinLevel(n.minLevel)
              && (!n.roles || n.roles.includes(user?.role || ''))   // hard role-restricted items (Chickens, Facility 360)
              && (!itemScope || itemScope.includes(n.to))            // tightly-scoped roles: only their lane
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-3">
                {!collapsed && <div className="text-[9px] text-white/15 font-bold uppercase tracking-widest px-3 mb-1">{group.label}</div>}
                {visibleItems.map((n) => (
                  <NavLink key={n.to} to={n.to} onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[40px] ${isActive ? 'bg-primary/15 text-primary' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                    <n.icon size={16} />{!collapsed && <span>{n.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">{user?.name?.charAt(0) || '?'}</div>
            {!collapsed && <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{user?.name}</div><div className="text-xs text-white/30">{user?.role?.replace(/_/g, ' ')}</div></div>}
            <button onClick={handleLogout} className="p-2 text-white/30 hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center" title="Logout"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/10 bg-[#0D0D0D] sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-white/60 min-w-[44px] min-h-[44px] flex items-center justify-center"><Menu size={22} /></button>
          <div className="text-xs sm:text-sm text-white/30 hidden sm:block font-mono">{new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="lg:hidden text-primary font-bold text-base">Origin</div>
          <div className="flex items-center gap-2">
            <GhostSwitcher />
            <button className="relative p-2 text-white/40 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"><Bell size={20} /></button>
          </div>
        </header>

        <GhostBanner />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Chat-with-Maestro floating button — visible to every authed role */}
        <SmartChat />
      </div>

      {/* Bottom nav — 3 core workflows */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0D0D0D] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {filteredBottom.map((n) => {
            const isActive = location.pathname === n.to || (n.to !== '/' && location.pathname.startsWith(n.to));
            return (
              <NavLink key={n.to} to={n.to}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] px-3 py-1 rounded-xl transition-colors ${isActive ? 'text-primary' : 'text-white/30'}`}>
                <n.icon size={22} />
                <span className="text-[10px] font-medium">{n.label}</span>
              </NavLink>
            );
          })}
          <button onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] px-3 py-1 rounded-xl text-white/30">
            <Menu size={22} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

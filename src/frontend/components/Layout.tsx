/**
 * JIG Craft Cannabis - App Layout
 *
 * Responsive sidebar navigation + main content area.
 * Mobile: overlay drawer with backdrop.
 * Desktop: collapsible inline sidebar with hamburger toggle.
 * Admin users see additional navigation items.
 */

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { capitalize } from '../utils';

const clientNav = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/catalog', label: 'Catalog', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to: '/account', label: 'Account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { to: '/verification', label: 'Verification', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const adminNav = [
  { to: '/admin/clients', label: 'Clients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { to: '/admin/orders', label: 'Orders', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/admin/leads', label: 'Leads', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/admin/verifications', label: 'Verifications', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { to: '/admin/chat', label: 'Chat Bot', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/admin/n8n', label: 'Automation', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function SvgIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function NavItem({
  to,
  label,
  icon,
  collapsed,
  onClick,
}: {
  to: string;
  label: string;
  icon: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-md px-3 py-2.5 font-heading text-[13px] font-medium uppercase tracking-wide transition-all ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-jig-purple/15 text-jig-purple border border-jig-purple/25'
            : 'text-jig-gray-500 border border-transparent hover:bg-white/[0.04] hover:text-jig-white'
        }`
      }
    >
      <SvgIcon path={icon} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Layout() {
  const { client, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop: collapsible sidebar state
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  // Mobile: overlay drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (collapsed: boolean, onNavClick?: () => void) => (
    <>
      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {clientNav.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavClick} />
        ))}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            {!collapsed && (
              <p className="mb-2 px-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-purple">
                Admin
              </p>
            )}
            {adminNav.map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavClick} />
            ))}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsed ? (
          <>
            <div className="mb-3">
              <p className="text-sm font-medium text-jig-white">
                {client?.businessName || 'JIG User'}
              </p>
              <p className="text-xs text-jig-gray-500">{client?.email}</p>
              {isAdmin ? (
                <span className="mt-1 inline-block rounded bg-jig-purple/15 px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider text-jig-purple-light border border-jig-purple/25">
                  Admin
                </span>
              ) : client?.tier && (
                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider tier-${client.tier}`}
                >
                  {capitalize(client.tier)}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider text-jig-gray-500 transition-all hover:border-white/[0.25] hover:bg-white/[0.08] hover:text-jig-white"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-md text-jig-gray-500 transition-colors hover:bg-white/[0.06] hover:text-jig-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-jig-black">
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center border-b border-white/[0.06] bg-jig-slate px-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-jig-gray-500 transition-colors hover:bg-white/[0.06] hover:text-jig-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src="/logo.png" alt="JIG" className="ml-2 h-9 w-auto" />
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 flex-col bg-jig-slate transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile header */}
          <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-3">
            <img src="/logo.png" alt="JIG" className="h-9 w-auto" />
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-md text-jig-gray-500 transition-colors hover:bg-white/[0.06] hover:text-jig-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {sidebarContent(false, () => setMobileOpen(false))}
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-white/[0.06] bg-jig-slate transition-[width] duration-300 ease-in-out ${
          desktopCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Desktop header */}
        <div className="flex h-16 items-center border-b border-white/[0.06] px-3">
          <button
            onClick={() => setDesktopCollapsed(!desktopCollapsed)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-jig-gray-500 transition-colors hover:bg-white/[0.06] hover:text-jig-white"
            title={desktopCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {desktopCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
          {!desktopCollapsed && (
            <img src="/logo.png" alt="JIG Craft Cannabis" className="ml-2 h-12 w-auto" />
          )}
        </div>
        {sidebarContent(desktopCollapsed)}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-jig-black pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

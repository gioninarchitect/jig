import { useState } from 'react';
import Header from '../components/ui/Header';
import Sidebar from '../components/ui/Sidebar';

export default function DashboardLayout({ title, menuItems = [], user, branchSelector, onNavigate, activeItem: externalActive, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internalActive, setInternalActive] = useState(menuItems[0]?.key || '');

  // Use external state if provided, otherwise fallback to internal
  const activeItem = externalActive ?? internalActive;
  const handleNavigate = onNavigate ?? setInternalActive;

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={menuItems}
        activeItem={activeItem}
        onNavigate={handleNavigate}
      />

      <Header
        title={title}
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        branchSelector={branchSelector}
      />

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}

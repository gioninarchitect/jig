/**
 * JIG Craft Cannabis - App Router
 *
 * Routes:
 *   /login          - OTP login
 *   /               - Dashboard (admin → admin dash, client → client portal)
 *   /catalog        - Product catalog
 *   /orders         - Order history
 *   /orders/:id     - Order detail
 *   /account        - Account / tier info
 *   /admin/clients  - Client list (admin)
 *   /admin/clients/:id - Client intelligence detail (admin)
 *   /admin/leads    - Lead list (admin)
 *   /admin/interventions - Intervention queue (admin)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import InvoicePage from './pages/InvoicePage';
import AccountPage from './pages/AccountPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminClientDetailPage from './pages/admin/AdminClientDetailPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, isAdmin } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-jig-black">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-jig-gray-700 border-t-jig-purple" />
        <p className="text-sm text-jig-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders/:id/invoice" element={<InvoicePage />} />
        <Route path="account" element={<AccountPage />} />

        {/* Admin routes */}
        <Route
          path="admin/clients"
          element={
            <AdminRoute>
              <AdminClientsPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/clients/:id"
          element={
            <AdminRoute>
              <AdminClientDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/orders"
          element={
            <AdminRoute>
              <AdminOrdersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/leads"
          element={
            <AdminRoute>
              <AdminLeadsPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

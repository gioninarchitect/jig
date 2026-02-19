// P34 — Code-split App with React.lazy
// P36-P41 — Customer-facing storefront pages added

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WorldModelProvider } from './world-model/WorldModelContext';
import { ROLES, DEV_MODE } from './config';

// Eagerly loaded (small, always needed)
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// P34: Lazy-loaded internal ops pages
const ComponentDemo = lazy(() => import('./pages/ComponentDemo'));
const POSPage = lazy(() => import('./pages/POS/POSPage'));
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));
const OwnerPage = lazy(() => import('./pages/OwnerPage'));
const Owner360Page = lazy(() => import('./pages/Owner360/Owner360Page'));
const InventoryPage = lazy(() => import('./pages/InventoryManager/InventoryManagerPage'));
const CustomerPage = lazy(() => import('./pages/Customer/CustomerPage'));
const PackerPage = lazy(() => import('./pages/Operations/PackerPage'));
const DispatchPage = lazy(() => import('./pages/Operations/DispatchPage'));
const SupplierPage = lazy(() => import('./pages/Operations/SupplierPortalPage'));
const StocktakePage = lazy(() => import('./pages/Operations/StocktakePage'));
const DriveThroughPage = lazy(() => import('./pages/Operations/DriveThroughPage'));
const WholesalePage = lazy(() => import('./pages/Operations/WholesalePage'));
const ConfigPage = lazy(() => import('./pages/SuperAdmin/ConfigPage'));

// P36-P41: Lazy-loaded storefront pages
const LandingPage = lazy(() => import('./pages/Storefront/LandingPage'));
const AboutPage = lazy(() => import('./pages/Storefront/AboutPage'));
const ContactPage = lazy(() => import('./pages/Storefront/ContactPage'));
const LocationsPage = lazy(() => import('./pages/Storefront/LocationsPage'));
const Section21InfoPage = lazy(() => import('./pages/Storefront/Section21InfoPage'));
const TermsPage = lazy(() => import('./pages/Storefront/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/Storefront/PrivacyPage'));
const ProductsPage = lazy(() => import('./pages/Storefront/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/Storefront/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/Storefront/CartPage'));
const CheckoutPage = lazy(() => import('./pages/Storefront/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/Storefront/OrderConfirmationPage'));
const RegisterPage = lazy(() => import('./pages/Storefront/RegisterPage'));
const MyAccountPage = lazy(() => import('./pages/Storefront/MyAccountPage'));
const AffiliatePage = lazy(() => import('./pages/Storefront/AffiliatePage'));

// Role groups for route access
const STAFF_PLUS = [
  ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.BRANCH_MANAGER,
  ROLES.INVENTORY_MANAGER, ROLES.STAFF_ASSISTANT,
];
const ADMIN_PLUS = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.BRANCH_MANAGER];
const OWNER_PLUS = [ROLES.SUPER_ADMIN, ROLES.OWNER];
const INVENTORY_ROLES = [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER];

// Shared loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-jig-slate">
      <div className="w-10 h-10 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-jig-slate">
      <div className="text-center">
        <h1 className="font-heading text-5xl text-jig-red mb-4">404</h1>
        <p className="font-body text-jig-purple-dark">Page not found</p>
      </div>
    </div>
  );
}

// Storefront layout wrapper (lazy — imports its own layout)
import StorefrontLayout from './layouts/StorefrontLayout';

function StorefrontRoute({ children }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <CartProvider>
          <WorldModelProvider>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Default → Landing page */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Public auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Dev only */}
            {DEV_MODE && <Route path="/components" element={<ComponentDemo />} />}

            {/* ─── Storefront (public) ─── */}
            <Route path="/home" element={<StorefrontRoute><LandingPage /></StorefrontRoute>} />
            <Route path="/about" element={<StorefrontRoute><AboutPage /></StorefrontRoute>} />
            <Route path="/contact" element={<StorefrontRoute><ContactPage /></StorefrontRoute>} />
            <Route path="/locations" element={<StorefrontRoute><LocationsPage /></StorefrontRoute>} />
            <Route path="/section21-info" element={<StorefrontRoute><Section21InfoPage /></StorefrontRoute>} />
            <Route path="/terms" element={<StorefrontRoute><TermsPage /></StorefrontRoute>} />
            <Route path="/privacy" element={<StorefrontRoute><PrivacyPage /></StorefrontRoute>} />
            <Route path="/products" element={<StorefrontRoute><ProductsPage /></StorefrontRoute>} />
            <Route path="/products/:id" element={<StorefrontRoute><ProductDetailPage /></StorefrontRoute>} />
            <Route path="/cart" element={<StorefrontRoute><CartPage /></StorefrontRoute>} />
            <Route path="/checkout" element={<StorefrontRoute><CheckoutPage /></StorefrontRoute>} />
            <Route path="/order-confirmation" element={<StorefrontRoute><OrderConfirmationPage /></StorefrontRoute>} />
            <Route path="/register" element={<StorefrontRoute><RegisterPage /></StorefrontRoute>} />
            <Route path="/affiliate" element={<StorefrontRoute><AffiliatePage /></StorefrontRoute>} />

            {/* Storefront (protected) */}
            <Route path="/my-account" element={
              <StorefrontRoute>
                <ProtectedRoute><MyAccountPage /></ProtectedRoute>
              </StorefrontRoute>
            } />

            {/* Legacy /customer redirect → /my-account */}
            <Route path="/customer" element={<Navigate to="/my-account" replace />} />

            {/* ─── Internal Ops (protected) ─── */}
            <Route path="/pos" element={
              <ProtectedRoute roles={STAFF_PLUS}><POSPage /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={ADMIN_PLUS}><AdminPage /></ProtectedRoute>
            } />
            <Route path="/owner" element={
              <ProtectedRoute roles={OWNER_PLUS}><OwnerPage /></ProtectedRoute>
            } />
            <Route path="/owner/360" element={
              <ProtectedRoute roles={OWNER_PLUS}><Owner360Page /></ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute roles={INVENTORY_ROLES}><InventoryPage /></ProtectedRoute>
            } />
            <Route path="/packer" element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.PACKER]}>
                <PackerPage />
              </ProtectedRoute>
            } />
            <Route path="/dispatch" element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.DISPATCH_MANAGER]}>
                <DispatchPage />
              </ProtectedRoute>
            } />
            <Route path="/supplier" element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN, ROLES.SUPPLIER]}>
                <SupplierPage />
              </ProtectedRoute>
            } />
            <Route path="/stocktake" element={
              <ProtectedRoute roles={INVENTORY_ROLES}><StocktakePage /></ProtectedRoute>
            } />
            <Route path="/drive-through" element={
              <ProtectedRoute roles={STAFF_PLUS}><DriveThroughPage /></ProtectedRoute>
            } />
            <Route path="/wholesale" element={
              <ProtectedRoute roles={ADMIN_PLUS}><WholesalePage /></ProtectedRoute>
            } />
            <Route path="/config" element={
              <ProtectedRoute roles={OWNER_PLUS}><ConfigPage /></ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </WorldModelProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
